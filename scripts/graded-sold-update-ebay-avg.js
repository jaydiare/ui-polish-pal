// scripts/sold-update-ebay-avg.js
// Node 20+ (uses global fetch)
//
// Scrapes eBay's PUBLIC sold listings search pages (LH_Sold=1&LH_Complete=1)
// to compute sold price averages — NO API keys needed, NO Apify.
//
// Statistical pipeline:
//   - Taguchi winsorized mean
//   - Market stability CV (sd/mean on winsorized sample)
//   - Junk title exclusion
//   - PSA-only graded filter
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

const ATHLETES_PATH = path.join(__dirname, "..", "data", "athletes2.json");
const OUT_PATH = path.join(__dirname, "..", "data", "ebay-sold-avg.json");
const PROGRESS_PATH = path.join(__dirname, "..", "data", "ebay-sold-progress.json");

// Category: Graded Sports Trading Cards
const CATEGORY_ID = "183050";

// Sampling
const MAX_PAGES = 3;
const MAX_RETRIES = 4;
const BASE_DELAY_MS = 4000;
const INTER_PAGE_DELAY_MS = 2500;
const BATCH_SIZE = 10; // athletes per run
const MIN_SAMPLE_SIZE = 4;

// Taguchi caps (winsorization %)
const TAGUCHI_TRIM_PCT = 0.4;

// Junk title exclusion
const JUNK_PHRASES = [
  "you pick", "digitalcard", "digital", "you choose", "pick your", "choose your",
  "your choice", "complete your set", "complete set",
  "set builder", "set break", "base singles", "insert singles",
  "singles you pick", "you pick!", "you pick -",
  "lot", "team lot", "player lot", "break", "case break",
  "random", "bulk", "paper rc's & vets", "rc's & vets",
  "u-pick", "u pick", "lote", "base cards from", "group", "you pick obo",
];

// Sport → League mapping for eBay aspect filters
const SPORT_LEAGUE_MAP = {
  Baseball: "Major League (MLB)",
  Soccer: "Major League Soccer (MLS)",
  Basketball: "National Basketball Assoc. (NBA)",
  Football: "National Football League (NFL)",
  Hockey: "National Hockey League (NHL)",
};

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
  return String(s || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
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

// Brand filter removed — hasAllowedBrand always returns true
function hasAllowedBrand(title) {
  return true;
}

function titleLooksRelevantToPlayer(title, playerName) {
  const t = norm(title);
  const parts = norm(playerName).split(/\s+/).filter(Boolean);
  if (!parts.length) return true;
  return parts.every((part) => t.includes(part));
}

// PSA-only detector: grades 1–10 including half grades
function isGradedTitle(title) {
  const t = norm(title);

  const psaNumeric =
    /\bpsa\b[^\n]{0,18}\b(10|9\.5|9|8\.5|8|7\.5|7|6\.5|6|5\.5|5|4\.5|4|3\.5|3|2\.5|2|1\.5|1)\b/i;

  const psaLabel =
    /\bpsa\b[^\n]{0,18}\b(gem mint|mint)\b/i;

  return psaNumeric.test(t) || psaLabel.test(t);
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

// Build eBay sold listings search URL (with League aspect filter when available)
function buildSoldSearchURL(keyword, sport, page = 1) {
  const params = new URLSearchParams({
    _nkw: keyword,
    _sacat: CATEGORY_ID,
    LH_Sold: "1",
    LH_Complete: "1",
    _ipg: "60",
    rt: "nc",
  });

  const league = SPORT_LEAGUE_MAP[sport];
  if (league) {
    params.set("League", league);
  }

  if (page > 1) {
    params.set("_pgn", String(page));
  }

  return `https://www.ebay.com/sch/i.html?${params.toString()}`;
}

// Fetch a single search results page with retry + exponential backoff
async function fetchSoldPage(url) {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const res = await fetch(url, {
      headers: {
        "User-Agent": randomUA(),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate",
        "Cache-Control": "no-cache",
        "Referer": "https://www.ebay.com/",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "same-origin",
      },
      redirect: "follow",
    });

    if (res.status === 429) {
      const retryAfter = res.headers.get("Retry-After");
      let delayMs = Math.pow(2, attempt) * 3000;
      if (retryAfter) {
        const parsed = parseInt(retryAfter, 10);
        if (!isNaN(parsed)) delayMs = Math.max(parsed * 1000, delayMs);
      }
      const jitter = Math.random() * 2000;
      console.log(`  ⏳ Rate limited (429). Waiting ${((delayMs + jitter) / 1000).toFixed(1)}s (attempt ${attempt + 1}/${MAX_RETRIES})`);
      await sleep(delayMs + jitter);
      continue;
    }

    if (!res.ok) {
      if (attempt < MAX_RETRIES - 1) {
        const waitMs = Math.pow(2, attempt) * 2000 + Math.random() * 1000;
        console.log(`  ⚠️ HTTP ${res.status}. Retrying in ${(waitMs / 1000).toFixed(1)}s (attempt ${attempt + 1}/${MAX_RETRIES})`);
        await sleep(waitMs);
        continue;
      }
      throw new Error(`eBay page fetch failed (${res.status}) after ${MAX_RETRIES} attempts`);
    }

    const html = await res.text();

    if (html.includes("captcha") || html.includes("robot") || html.length < 5000) {
      if (attempt < MAX_RETRIES - 1) {
        const waitMs = Math.pow(2, attempt) * 5000 + Math.random() * 3000;
        console.log(`  🤖 CAPTCHA/bot detection (HTML ${html.length} chars). Waiting ${(waitMs / 1000).toFixed(1)}s (attempt ${attempt + 1}/${MAX_RETRIES})`);
        await sleep(waitMs);
        continue;
      }
      console.log(`  🤖 CAPTCHA persists after ${MAX_RETRIES} attempts — skipping`);
    }

    return html;
  }

  throw new Error(`fetchSoldPage: max retries (${MAX_RETRIES}) exceeded`);
}

// Try to extract item data from embedded JSON in <script> tags (SSR hydration data)
function parseItemsFromScriptTags(html) {
  const results = [];

  const scriptMatches = html.match(/<script[^>]*>([^<]*"soldPrice"[^<]*)<\/script>/gi) || [];

  for (const scriptBlock of scriptMatches) {
    try {
      let jsonStr = scriptBlock;
      let prev;
      do {
        prev = jsonStr;
        jsonStr = jsonStr.replace(/<\/?script[^>]*>/gi, "");
      } while (jsonStr !== prev);
      jsonStr = jsonStr.trim();
      const data = JSON.parse(jsonStr);
      const items = extractItemsFromJSON(data);
      results.push(...items);
    } catch {
      // skip
    }
  }

  const nextDataMatch = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([^<]+)<\/script>/i);
  if (nextDataMatch) {
    try {
      const data = JSON.parse(nextDataMatch[1]);
      const items = extractItemsFromJSON(data);
      results.push(...items);
    } catch {
      // skip
    }
  }

  return results;
}

function extractItemsFromJSON(obj, depth = 0) {
  if (depth > 8 || !obj || typeof obj !== "object") return [];

  const results = [];

  if (obj.title && (obj.price || obj.soldPrice || obj.sellingStatus)) {
    const price = safeNum(obj.soldPrice?.value || obj.price?.value || obj.soldPrice || obj.price);
    const currency = obj.soldPrice?.currency || obj.price?.currency || "USD";
    if (price != null) {
      results.push({
        title: String(obj.title),
        price,
        currency: String(currency).toUpperCase(),
        shippingCost: safeNum(obj.shippingCost?.value || obj.shippingCost) || 0,
        soldDate: obj.soldDate || obj.endDate || null,
      });
    }
  }

  if (Array.isArray(obj)) {
    for (const item of obj) {
      results.push(...extractItemsFromJSON(item, depth + 1));
    }
  } else {
    for (const val of Object.values(obj)) {
      if (val && typeof val === "object") {
        results.push(...extractItemsFromJSON(val, depth + 1));
      }
    }
  }

  return results;
}

// Parse sold prices from eBay search results HTML (cheerio)
function parseSoldListings(html) {
  const $ = cheerio.load(html);
  const results = [];

  $(".s-item").each((_, el) => {
    const $el = $(el);

    const title = normSpaces($el.find(".s-item__title, .s-item__title span").first().text());
    if (!title || title === "Shop on eBay") return;

    const priceText =
      $el.find(".s-item__price").first().text().trim() ||
      $el.find(".s-item__detail--primary .POSITIVE").first().text().trim();

    const parsed = parsePriceText(priceText);

    const soldDateText =
      $el.find(".s-item__title--tag .POSITIVE").text().trim() ||
      $el.find(".s-item__ended-date").text().trim() ||
      $el.find(".s-item__endedDate").text().trim() ||
      $el.find(".s-item__caption .POSITIVE").text().trim();

    const shippingText = $el.find(".s-item__shipping, .s-item__freeXDays, .s-item__logisticsCost").first().text().trim();
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

  if (!results.length) {
    $("[data-viewport]").each((_, el) => {
      const $el = $(el);
      const title = normSpaces($el.find("[role='heading']").first().text());
      if (!title || title === "Shop on eBay") return;

      const priceText = $el.find("[class*='price'], .POSITIVE").first().text().trim();
      const parsed = parsePriceText(priceText);

      const shippingText = $el.find("[class*='shipping'], [class*='logistic']").first().text().trim();
      const shippingCost = parseShippingText(shippingText);

      if (parsed) {
        results.push({
          title,
          price: parsed.price,
          currency: parsed.currency,
          shippingCost,
          soldDate: null,
        });
      }
    });
  }

  if (!results.length) {
    const scriptItems = parseItemsFromScriptTags(html);
    results.push(...scriptItems);
  }

  return results;
}

// Parse price text like "$12.99", "C $15.00", "US $10.00", "GBP 8.50"
function parsePriceText(text) {
  if (!text) return null;

  const t = text.replace(/,/g, "").trim();

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
function parseWithRecovery(content) {
  let clean = content.replace(/^\uFEFF/, "").trim();

  try {
    return JSON.parse(clean);
  } catch (e1) {
    console.warn(`JSON parsing failed: ${e1.message}`);
    console.warn("Attempting recovery strategies...");

    try {
      const noTrailing = clean.replace(/,\s*([\]}])/g, "$1");
      const parsed = JSON.parse(noTrailing);
      console.warn(`Recovered by removing trailing commas (${parsed.length} items)`);
      return parsed;
    } catch {
      // next
    }

    const lastBrace = clean.lastIndexOf("}");
    if (lastBrace > 0) {
      for (let pos = lastBrace; pos > 0; pos--) {
        if (clean[pos] === "}") {
          const candidate = clean.substring(0, pos + 1).replace(/,\s*$/, "") + "]";
          try {
            const items = JSON.parse(candidate);
            console.warn(`Recovered ${items.length} items from truncated JSON (cut at pos ${pos})`);
            return items;
          } catch {
            // try earlier
          }
        }
      }
    }

    try {
      const objRegex = /\{[^{}]*\}/g;
      const matches = clean.match(objRegex) || [];
      const items = matches
        .map((m) => {
          try {
            return JSON.parse(m);
          } catch {
            return null;
          }
        })
        .filter(Boolean);
      if (items.length > 0) {
        console.warn(`Recovered ${items.length} items via line-by-line extraction`);
        return items;
      }
    } catch {
      // fall through
    }

    throw new Error(`Cannot parse athletes.json (${e1.message}). File may be corrupted — try re-running the workflow.`);
  }
}

function loadAthletes() {
  if (!fs.existsSync(ATHLETES_PATH)) {
    throw new Error(`Missing ${ATHLETES_PATH}.`);
  }

  const raw = fs.readFileSync(ATHLETES_PATH, "utf8");
  const arr = parseWithRecovery(raw);

  return (arr || [])
    .map((x) => ({
      name: normSpaces(x?.name),
      sport: normSpaces(x?.sport),
      searchKeyword: x?.searchKeyword ? normSpaces(x.searchKeyword) : undefined,
    }))
    .filter((x) => x.name);
}

function buildKeyword(name, sport) {
  const sportHint = sport ? ` ${sport}` : "";
  return `${name}${sportHint}`;
}

// --- progress tracking ---
function loadProgress() {
  try {
    if (fs.existsSync(PROGRESS_PATH)) {
      return JSON.parse(fs.readFileSync(PROGRESS_PATH, "utf8"));
    }
  } catch {
    // fresh start
  }
  return { nextIndex: 0 };
}

function saveProgress(prog) {
  fs.writeFileSync(PROGRESS_PATH, JSON.stringify(prog, null, 2));
}

function loadExistingOutput() {
  try {
    if (fs.existsSync(OUT_PATH)) {
      return JSON.parse(fs.readFileSync(OUT_PATH, "utf8"));
    }
  } catch {
    // fresh start
  }
  return {};
}

// --- main ---
async function main() {
  const athletes = loadAthletes();
  const progress = loadProgress();
  const startIdx = progress.nextIndex || 0;

  if (startIdx >= athletes.length) {
    console.log(`All ${athletes.length} athletes processed. Resetting progress for next cycle.`);
    saveProgress({ nextIndex: 0, lastCompletedAt: new Date().toISOString() });
    return;
  }

  const endIdx = Math.min(startIdx + BATCH_SIZE, athletes.length);
  const batch = athletes.slice(startIdx, endIdx);

  console.log(`\n📦 Batch: athletes ${startIdx + 1}–${endIdx} of ${athletes.length} (${batch.length} this run)\n`);

  const fx = await getFxRatesToUSD();

  const out = loadExistingOutput();

  out._meta = {
    updatedAt: new Date().toISOString(),
    source: "eBay public sold listings (HTML scrape, LH_Sold=1)",
    note:
      "SOLD comps scraped in batches of " + BATCH_SIZE + ". No brand filter. Junk titles removed. " +
      "PSA-only title filter (grades 1–10 including half grades). " +
      "Taguchi winsorized mean + market stability CV. " +
      "Currency normalized to USD via CBSA. Prices include shipping when parseable.",
    batchInfo: { startIdx, endIdx, totalAthletes: athletes.length },
    maxPages: MAX_PAGES,
    minSampleSize: MIN_SAMPLE_SIZE,
    brands: "none (all brands accepted)",
    categoryId: CATEGORY_ID,
    listingStat: { method: "taguchi_winsorized_mean", trimPercent: TAGUCHI_TRIM_PCT },
    stabilityStat: {
      method: "cv",
      formula: "sd/mean",
      sample: "winsorized",
      trimPercent: TAGUCHI_TRIM_PCT,
    },
    gradingFilter: {
      company: "PSA",
      grades: "1–10 including half grades",
    },
    fx: { source: "CBSA Exchange Rates API", asOf: fx.asOf },
  };

  for (let i = 0; i < batch.length; i++) {
    const globalIdx = startIdx + i;
    const { name, sport, searchKeyword } = batch[i];
    console.log(
      `[${globalIdx + 1}/${athletes.length}] ${name} (${sport || "Unknown"})` +
      `${searchKeyword ? ` [searchKeyword: ${searchKeyword}]` : ""}`
    );

    const keyword = buildKeyword(searchKeyword || name, sport);
    const pricesUSD = [];
    let firstCur = null;
    let fxRateUsed = null;
    let totalScraped = 0;

    try {
      for (let page = 1; page <= MAX_PAGES; page++) {
        const url = buildSoldSearchURL(keyword, sport, page);
        const html = await fetchSoldPage(url);

        if (page === 1) {
          console.log(`  HTML size: ${html.length} chars`);
          if (html.includes("captcha") || html.includes("robot")) {
            console.log(`  ⚠️ Possible bot detection/CAPTCHA for "${keyword}"`);
          }
          const sItemCount = (html.match(/s-item__title/g) || []).length;
          console.log(`  Raw .s-item__title matches: ${sItemCount}`);
        }

        const listings = parseSoldListings(html);

        if (!listings.length) {
          if (page === 1) console.log(`  No sold results found for "${keyword}"`);
          break;
        }

        totalScraped += listings.length;

        for (const it of listings) {
          const title = it.title;
          if (!hasAllowedBrand(title)) continue;
          if (isJunkTitle(title)) continue;
          if (!titleLooksRelevantToPlayer(title, name)) continue;
          if (!isGradedTitle(title)) continue;

          let totalPrice = it.price;
          if (it.shippingCost > 0) totalPrice += it.shippingCost;
          firstCur = firstCur || it.currency || null;

          const { usd, rateUsed } = convertToUSD(totalPrice, it.currency, fx.rates);
          if (usd == null) continue;
          pricesUSD.push(usd);
          fxRateUsed = fxRateUsed || rateUsed;
        }

        if (page < MAX_PAGES) await sleep(INTER_PAGE_DELAY_MS + Math.random() * 1500);
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

    fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2));

    if (i < batch.length - 1) {
      const dynamicDelay = BASE_DELAY_MS + Math.random() * 4000;
      console.log(`  💤 Waiting ${(dynamicDelay / 1000).toFixed(1)}s before next athlete...`);
      await sleep(dynamicDelay);
    }
  }

  saveProgress({ nextIndex: endIdx, lastBatchAt: new Date().toISOString() });

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2));
  console.log(`\n✅ Batch complete (${startIdx + 1}–${endIdx}). Next run starts at athlete ${endIdx + 1}.`);
  console.log(`Wrote ${OUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
