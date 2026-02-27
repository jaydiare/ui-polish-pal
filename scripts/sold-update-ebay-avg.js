// scripts/sold-update-ebay-avg.js
// Node 20+ (uses global fetch)
//
// Scrapes eBay's PUBLIC sold listings search pages (LH_Sold=1&LH_Complete=1)
// to compute sold price averages — NO API keys needed, NO Apify.
//
// Same statistical pipeline as update-ebay-avg.js:
//   - Taguchi winsorized mean
//   - Market stability CV (sd/mean on winsorized sample)
//   - Ungraded condition policy
//   - Manufacturer/brand filter
//   - Junk title exclusion
//   - Currency normalization to USD via CBSA Exchange Rates API
//
// Env:
//   (none required — uses public eBay search pages)
//
// Input:
//   data/athletes.json: [{ name, sport, ... }]
//
// Output:
//   data/ebay-sold-avg.json

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as cheerio from "cheerio";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ATHLETES_PATH = path.join(__dirname, "..", "data", "athletes.json");
const OUT_PATH = path.join(__dirname, "..", "data", "ebay-sold-avg.json");

// Category: Trading Card Singles
const CATEGORY_ID = "261328";

// Sampling
const MAX_PAGES = 2; // 2 pages × ~60 results = ~120 sold comps max
const MIN_SAMPLE_SIZE = 4;

// Taguchi caps (winsorization %)
const TAGUCHI_TRIM_PCT = 0.4;

// Allowed brands (same as update-ebay-avg.js manufacturers, lowercase)
const BRANDS = [
  "topps", "panini", "upper deck", "leaf",
  "artesania sport", "ovenca", "sport grafico",
  "line up", "venezuelan league", "byn",
];

// --------------------
// Ungraded condition policy
// --------------------
const UNGRADED_BLOCKLIST = [
  "damaged", "damage", "poor", "fair", "very good", "vg",
  "good", "gd", "creases", "crease", "wrinkle", "wrinkling",
  "corner wear", "surface wear", "paper loss", "stain", "stained",
  "water damage", "tape", "writing", "marked", "marked up",
  "pin hole", "hole", "torn", "tear", "scratches", "scratch",
];

// Junk title exclusion
const JUNK_PHRASES = [
  "you pick", "you choose", "pick your", "choose your",
  "your choice", "complete your set", "complete set",
  "set builder", "set break", "base singles", "insert singles",
  "singles you pick", "you pick!", "you pick -",
  "lot", "team lot", "player lot", "break", "case break",
  "random", "bulk", "paper rc's & vets", "rc's & vets",
];

// Rotate user agents to reduce blocking
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0",
];

// --- helpers ---
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function normSpaces(s) {
  return String(s || "").replace(/\s+/g, " ").trim();
}

function norm(s) {
  return String(s || "").toLowerCase().trim();
}

function safeNum(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

function avg(values) {
  if (!values.length) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function stdev(values) {
  if (!values || values.length < 2) return null;
  const m = avg(values);
  if (m == null) return null;
  let s = 0;
  for (const v of values) s += (v - m) * (v - m);
  const sd = Math.sqrt(s / (values.length - 1));
  return Number.isFinite(sd) ? sd : null;
}

// Taguchi winsorized mean
function taguchiTrimmedMean(values, trimPercent = TAGUCHI_TRIM_PCT) {
  if (!values || !values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const k = Math.floor(n * trimPercent);

  if (n < 3 || k === 0) return median(sorted);
  if (n <= 2 * k) return median(sorted);

  const lowCap = sorted[k];
  const highCap = sorted[n - k - 1];

  let sum = 0;
  for (let i = 0; i < n; i++) {
    const v = sorted[i];
    sum += v < lowCap ? lowCap : v > highCap ? highCap : v;
  }
  return sum / n;
}

function taguchiWinsorizedSample(values, trimPercent = TAGUCHI_TRIM_PCT) {
  if (!values || !values.length) return [];
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const k = Math.floor(n * trimPercent);

  if (n < 3 || k === 0 || n <= 2 * k) return sorted;

  const lowCap = sorted[k];
  const highCap = sorted[n - k - 1];

  return sorted.map((v) => (v < lowCap ? lowCap : v > highCap ? highCap : v));
}

function taguchiCV(values, trimPercent = TAGUCHI_TRIM_PCT) {
  if (!values || values.length < 3) return null;
  const wins = taguchiWinsorizedSample(values, trimPercent);
  if (!wins || wins.length < 3) return null;

  const m = avg(wins);
  const sd = stdev(wins);
  if (m == null || sd == null || !Number.isFinite(m) || !Number.isFinite(sd)) return null;
  if (m <= 0) return null;

  return sd / m;
}

// --- filters ---
function isJunkTitle(title) {
  const t = norm(title);
  return JUNK_PHRASES.some((p) => t.includes(p));
}

function hasAllowedBrand(title) {
  const t = norm(title);
  return BRANDS.some((b) => t.includes(b));
}

function titleLooksRelevantToPlayer(title, playerName) {
  const t = norm(title);
  const parts = norm(playerName).split(/\s+/).filter(Boolean);
  const last = parts[parts.length - 1];
  if (!last) return true;
  return t.includes(last);
}

function isGradedTitle(title) {
  const t = norm(title);
  const graderHints = ["psa", "bgs", "sgc", "cgc", "beckett", "gem mint", "gm mt"];
  return graderHints.some((k) => t.includes(k));
}

function ungradedPassesPolicy(title) {
  const t = norm(title);
  if (UNGRADED_BLOCKLIST.some((w) => t.includes(w))) return false;
  // Permissive for sold comps (condition detail often missing from search results)
  return true;
}

function randomUA() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

// --- FX (Normalize ANY currency -> USD) ---
const CBSA_FX_URL =
  "https://bcd-api-dca-ipa.cbsa-asfc.cloud-nuage.canada.ca/exchange-rate-lambda/exchange-rates";

async function getFxRatesToUSD() {
  const res = await fetch(CBSA_FX_URL, {
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Failed to fetch FX rates (${res.status}): ${txt}`);
  }

  const json = await res.json();
  const rows = json?.ForeignExchangeRates || json?.foreignExchangeRates || [];

  const cadPer = { CAD: 1 };
  let asOf = null;

  for (const r of rows) {
    const from = String(r?.FromCurrency?.Value || r?.FromCurrency || "").toUpperCase();
    const to = String(r?.ToCurrency?.Value || r?.ToCurrency || "").toUpperCase();
    const rate = Number(r?.Rate);

    if (to === "CAD" && Number.isFinite(rate) && rate > 0 && from) {
      cadPer[from] = rate;
      asOf = asOf || r?.ExchangeRateEffectiveTimestamp || r?.ValidStartDate || null;
    }
  }

  const cadPerUsd = cadPer.USD;
  if (!Number.isFinite(cadPerUsd) || cadPerUsd <= 0) {
    throw new Error("CBSA FX: missing/invalid USD->CAD rate.");
  }

  const usdPer = { USD: 1 };
  for (const [cur, cadPerCur] of Object.entries(cadPer)) {
    if (!Number.isFinite(cadPerCur) || cadPerCur <= 0) continue;
    usdPer[cur] = cadPerCur / cadPerUsd;
  }
  usdPer.CAD = 1 / cadPerUsd;

  return { rates: usdPer, asOf };
}

function convertToUSD(amount, currency, fxRatesToUSD) {
  const cur = String(currency || "").toUpperCase();
  if (!Number.isFinite(amount) || amount <= 0) return { usd: null, rateUsed: null };

  const rate = fxRatesToUSD?.[cur];
  if (!Number.isFinite(rate) || rate <= 0) return { usd: null, rateUsed: null };

  return { usd: amount * rate, rateUsed: rate };
}

// --- eBay sold search page scraping ---

// Build eBay sold listings search URL
function buildSoldSearchURL(keyword, page = 1) {
  const params = new URLSearchParams({
    _nkw: keyword,
    _sacat: CATEGORY_ID,
    LH_Sold: "1",
    LH_Complete: "1",
    _ipg: "60", // items per page
    rt: "nc",
  });

  if (page > 1) {
    params.set("_pgn", String(page));
  }

  return `https://www.ebay.com/sch/i.html?${params.toString()}`;
}

// Fetch a single search results page
async function fetchSoldPage(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": randomUA(),
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Accept-Encoding": "gzip, deflate, br",
      "Cache-Control": "no-cache",
    },
  });

  if (!res.ok) {
    throw new Error(`eBay page fetch failed (${res.status})`);
  }

  return res.text();
}

// Parse sold prices from eBay search results HTML
function parseSoldListings(html) {
  const $ = cheerio.load(html);
  const results = [];

  // eBay search results are in .s-item containers
  $(".s-item").each((_, el) => {
    const $el = $(el);

    const title = normSpaces($el.find(".s-item__title").first().text());
    if (!title || title === "Shop on eBay") return; // skip header item

    // Sold price — eBay shows it in .s-item__price
    const priceText = $el.find(".s-item__price").first().text().trim();

    // Parse price: handles "$12.99", "C $15.00", "US $10.00", "$5.00 to $20.00" (range)
    const parsed = parsePriceText(priceText);

    // Sold date (e.g., "Sold  Jan 15, 2025")
    const soldDateText = $el.find(".s-item__title--tag .POSITIVE").text().trim() ||
                         $el.find(".s-item__ended-date").text().trim() ||
                         $el.find(".s-item__endedDate").text().trim();

    // Shipping cost
    const shippingText = $el.find(".s-item__shipping, .s-item__freeXDays").first().text().trim();
    const shippingCost = parseShippingText(shippingText);

    if (parsed) {
      results.push({
        title,
        price: parsed.price,
        currency: parsed.currency,
        shippingCost,
        soldDate: soldDateText || null,
      });
    }
  });

  return results;
}

// Parse price text like "$12.99", "C $15.00", "US $10.00", "GBP 8.50"
function parsePriceText(text) {
  if (!text) return null;

  const t = text.replace(/,/g, "").trim();

  // Handle price ranges ("$5.00 to $20.00") — use midpoint
  const rangeMatch = t.match(
    /(?:(?:C|US|AU|CA)?\s*\$|(?:GBP|EUR|£|€)\s*)?([\d.]+)\s+to\s+(?:(?:C|US|AU|CA)?\s*\$|(?:GBP|EUR|£|€)\s*)?([\d.]+)/i
  );
  if (rangeMatch) {
    const low = safeNum(rangeMatch[1]);
    const high = safeNum(rangeMatch[2]);
    if (low != null && high != null) {
      const currency = detectCurrency(t);
      return { price: (low + high) / 2, currency };
    }
  }

  // Single price
  const priceMatch = t.match(/([\d.]+)/);
  if (!priceMatch) return null;

  const price = safeNum(priceMatch[1]);
  if (price == null) return null;

  const currency = detectCurrency(t);
  return { price, currency };
}

function detectCurrency(text) {
  const t = text.toUpperCase();
  if (t.includes("C $") || t.includes("CA $") || t.includes("CAD")) return "CAD";
  if (t.includes("£") || t.includes("GBP")) return "GBP";
  if (t.includes("€") || t.includes("EUR")) return "EUR";
  if (t.includes("AU $") || t.includes("AUD")) return "AUD";
  // Default: USD (eBay.com default)
  return "USD";
}

function parseShippingText(text) {
  if (!text) return 0;
  const t = norm(text);
  if (t.includes("free")) return 0;

  const match = text.replace(/,/g, "").match(/([\d.]+)/);
  if (match) {
    const v = safeNum(match[1]);
    return v != null ? v : 0;
  }
  return 0;
}

// --- data loading ---
function loadAthletes() {
  if (!fs.existsSync(ATHLETES_PATH)) {
    throw new Error(`Missing ${ATHLETES_PATH}.`);
  }

  const raw = fs.readFileSync(ATHLETES_PATH, "utf8");
  const arr = JSON.parse(raw);

  return (arr || [])
    .map((x) => ({ name: normSpaces(x?.name), sport: normSpaces(x?.sport) }))
    .filter((x) => x.name);
}

function buildKeyword(name, sport) {
  const sportHint = sport ? ` ${sport}` : "";
  return `${name}${sportHint} card`;
}

// --- main ---
async function main() {
  const athletes = loadAthletes();
  const fx = await getFxRatesToUSD();

  const out = {
    _meta: {
      updatedAt: new Date().toISOString(),
      source: "eBay public sold listings (HTML scrape, LH_Sold=1)",
      note:
        "SOLD comps scraped from public eBay search. Brand-filtered. Junk titles removed. " +
        "Taguchi winsorized mean + market stability CV. Ungraded condition policy (permissive for sold). " +
        "Currency normalized to USD via CBSA. Prices include shipping when parseable.",
      maxPages: MAX_PAGES,
      minSampleSize: MIN_SAMPLE_SIZE,
      brands: BRANDS,
      categoryId: CATEGORY_ID,
      listingStat: { method: "taguchi_winsorized_mean", trimPercent: TAGUCHI_TRIM_PCT },
      stabilityStat: {
        method: "cv",
        formula: "sd/mean",
        sample: "winsorized",
        trimPercent: TAGUCHI_TRIM_PCT,
      },
      ungradedPolicy: {
        blocklist: "damaged/low-condition keywords",
        note: "Permissive for sold comps (unknown condition accepted)",
      },
      fx: { source: "CBSA Exchange Rates API", asOf: fx.asOf },
    },
  };

  for (let i = 0; i < athletes.length; i++) {
    const { name, sport } = athletes[i];
    console.log(`[${i + 1}/${athletes.length}] ${name} (${sport || "Unknown"})`);

    const keyword = buildKeyword(name, sport);
    const pricesUSD = [];
    let firstCur = null;
    let fxRateUsed = null;
    let totalScraped = 0;

    try {
      for (let page = 1; page <= MAX_PAGES; page++) {
        const url = buildSoldSearchURL(keyword, page);
        const html = await fetchSoldPage(url);
        const listings = parseSoldListings(html);

        if (!listings.length) {
          if (page === 1) console.log(`  No sold results found for "${keyword}"`);
          break;
        }

        totalScraped += listings.length;

        for (const it of listings) {
          const title = it.title;

          // 1) Brand filter
          if (!hasAllowedBrand(title)) continue;

          // 2) Junk title filter
          if (isJunkTitle(title)) continue;

          // 3) Player relevance (last name)
          if (!titleLooksRelevantToPlayer(title, name)) continue;

          // 4) Ungraded condition policy
          if (!isGradedTitle(title)) {
            if (!ungradedPassesPolicy(title)) continue;
          }

          // 5) Price: card price + shipping
          let totalPrice = it.price;
          if (it.shippingCost > 0) totalPrice += it.shippingCost;

          firstCur = firstCur || it.currency || null;

          const { usd, rateUsed } = convertToUSD(totalPrice, it.currency, fx.rates);
          if (usd == null) continue;

          pricesUSD.push(usd);
          fxRateUsed = fxRateUsed || rateUsed;
        }

        // Throttle between pages
        if (page < MAX_PAGES) await sleep(1500 + Math.random() * 1000);
      }

      const hasSample = pricesUSD.length >= MIN_SAMPLE_SIZE;

      const taguchiSold = taguchiTrimmedMean(pricesUSD, TAGUCHI_TRIM_PCT);
      const medianSold = median(pricesUSD);
      const marketStabilityCV = taguchiCV(pricesUSD, TAGUCHI_TRIM_PCT);

      console.log(
        `  Scraped: ${totalScraped} | After filters: ${pricesUSD.length} | ` +
        `Taguchi: ${hasSample && taguchiSold != null ? `$${taguchiSold.toFixed(2)}` : "N/A"}`
      );

      out[name] = {
        keyword,
        nScraped: totalScraped,
        nSoldUsed: pricesUSD.length,

        // Primary stat (mirrors update-ebay-avg.js naming)
        avg: hasSample ? taguchiSold : null,
        taguchiSold: hasSample ? taguchiSold : null,
        medianSold: hasSample ? medianSold : null,
        marketStabilityCV: hasSample ? marketStabilityCV : null,

        currency: "USD",
        originalCurrencyExample: firstCur,
        fxRateUsed: fxRateUsed || null,
      };
    } catch (e) {
      console.log(`  ${name}: ERROR ${e?.message || e}`);
      out[name] = {
        keyword,
        nScraped: totalScraped,
        nSoldUsed: 0,
        avg: null,
        taguchiSold: null,
        medianSold: null,
        marketStabilityCV: null,
        currency: "USD",
        error: String(e?.message || e),
      };
    }

    // Progressive save
    fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2));

    // Throttle between athletes (be polite to eBay)
    await sleep(2000 + Math.random() * 2000);
  }

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2));
  console.log(`\nWrote ${OUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
