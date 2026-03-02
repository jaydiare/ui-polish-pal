// scripts/graded-sold-update-ebay-avg.js
// Node 20+ (uses global fetch)
//
// Scrapes eBay's PUBLIC sold listings for GRADED cards only (PSA, BGS, SGC, etc.)
// Same pipeline as sold-update-ebay-avg.js but filtering for graded listings only.
//
// Output: data/ebay-graded-sold-avg.json

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as cheerio from "cheerio";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ATHLETES_PATH = path.join(__dirname, "..", "data", "athletes.json");
const OUT_PATH = path.join(__dirname, "..", "data", "ebay-graded-sold-avg.json");
const PROGRESS_PATH = path.join(__dirname, "..", "data", "ebay-graded-sold-progress.json");

const CATEGORY_ID = "261328";
const MAX_PAGES = 2;
const MAX_RETRIES = 4;
const BASE_DELAY_MS = 4000;
const INTER_PAGE_DELAY_MS = 2500;
const BATCH_SIZE = 10;
const MIN_SAMPLE_SIZE = 4;
const TAGUCHI_TRIM_PCT = 0.4;

const BRANDS = [
  "topps", "panini", "upper deck", "leaf",
  "artesania sport", "ovenca", "sport grafico",
  "line up", "venezuelan league", "byn", "O-Pee-Chee",
];

const JUNK_PHRASES = [
  "you pick", "digitalcard", "digital", "you choose", "pick your", "choose your",
  "your choice", "complete your set", "complete set",
  "set builder", "set break", "base singles", "insert singles",
  "singles you pick", "you pick!", "you pick -",
  "lot", "team lot", "player lot", "break", "case break",
  "random", "bulk", "paper rc's & vets", "rc's & vets",
  "u-pick", "u pick", "lote", "base cards from", "group",
];

const SPORT_LEAGUE_MAP = {
  Baseball: "Major League (MLB)",
  Soccer: "Major League Soccer (MLS)",
  Basketball: "National Basketball Assoc. (NBA)",
  Football: "National Football League (NFL)",
  Hockey: "National Hockey League (NHL)",
};

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0",
];

// --- helpers ---
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
function normSpaces(s) { return String(s || "").replace(/\s+/g, " ").trim(); }
function norm(s) { return String(s || "").toLowerCase().trim(); }
function safeNum(x) { const n = Number(x); return Number.isFinite(n) ? n : null; }

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
  if (m == null || sd == null || !Number.isFinite(m) || !Number.isFinite(sd) || m <= 0) return null;
  return sd / m;
}

// --- filters ---
function isJunkTitle(title) { return JUNK_PHRASES.some((p) => norm(title).includes(p)); }
function hasAllowedBrand(title) { return BRANDS.some((b) => norm(title).includes(b)); }

function titleLooksRelevantToPlayer(title, playerName) {
  const t = norm(title);
  const parts = norm(playerName).split(/\s+/).filter(Boolean);
  const last = parts[parts.length - 1];
  if (!last) return true;
  return t.includes(last);
}

// ✅ GRADED detection — ONLY include graded titles
function isGradedTitle(title) {
  const t = norm(title);
  const graderHints = ["psa", "sgc", "gem mint", "gm mt", "9.5", "10"];
  return graderHints.some((k) => t.includes(k));
}

function randomUA() { return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]; }

// --- FX ---
const CBSA_FX_URL = "https://bcd-api-dca-ipa.cbsa-asfc.cloud-nuage.canada.ca/exchange-rate-lambda/exchange-rates";

async function getFxRatesToUSD() {
  const res = await fetch(CBSA_FX_URL, { headers: { "Content-Type": "application/json" } });
  if (!res.ok) throw new Error(`Failed to fetch FX rates (${res.status})`);
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
  if (!Number.isFinite(cadPerUsd) || cadPerUsd <= 0) throw new Error("CBSA FX: missing USD->CAD rate.");
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
function buildSoldSearchURL(keyword, sport, page = 1) {
  // Add "graded" to keyword for better results
  const params = new URLSearchParams({
    _nkw: keyword + " graded",
    _sacat: CATEGORY_ID,
    LH_Sold: "1",
    LH_Complete: "1",
    _ipg: "60",
    rt: "nc",
  });
  const league = SPORT_LEAGUE_MAP[sport];
  if (league) params.set("League", league);
  if (page > 1) params.set("_pgn", String(page));
  return `https://www.ebay.com/sch/i.html?${params.toString()}`;
}

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
      if (retryAfter) { const parsed = parseInt(retryAfter, 10); if (!isNaN(parsed)) delayMs = Math.max(parsed * 1000, delayMs); }
      const jitter = Math.random() * 2000;
      console.log(`  ⏳ Rate limited (429). Waiting ${((delayMs + jitter) / 1000).toFixed(1)}s (attempt ${attempt + 1}/${MAX_RETRIES})`);
      await sleep(delayMs + jitter);
      continue;
    }

    if (!res.ok) {
      if (attempt < MAX_RETRIES - 1) {
        const waitMs = Math.pow(2, attempt) * 2000 + Math.random() * 1000;
        console.log(`  ⚠️ HTTP ${res.status}. Retrying in ${(waitMs / 1000).toFixed(1)}s`);
        await sleep(waitMs);
        continue;
      }
      throw new Error(`eBay page fetch failed (${res.status}) after ${MAX_RETRIES} attempts`);
    }

    const html = await res.text();
    if (html.includes("captcha") || html.includes("robot") || html.length < 5000) {
      if (attempt < MAX_RETRIES - 1) {
        const waitMs = Math.pow(2, attempt) * 5000 + Math.random() * 3000;
        console.log(`  🤖 CAPTCHA/bot detection. Waiting ${(waitMs / 1000).toFixed(1)}s`);
        await sleep(waitMs);
        continue;
      }
      console.log(`  🤖 CAPTCHA persists after ${MAX_RETRIES} attempts — skipping`);
    }
    return html;
  }
  throw new Error(`fetchSoldPage: max retries (${MAX_RETRIES}) exceeded`);
}

// --- HTML parsing (same as sold-update-ebay-avg.js) ---
function parseItemsFromScriptTags(html) {
  const results = [];
  const scriptMatches = html.match(/<script[^>]*>([^<]*"soldPrice"[^<]*)<\/script>/gi) || [];
  for (const scriptBlock of scriptMatches) {
    try {
      let jsonStr = scriptBlock;
      let prev;
      do { prev = jsonStr; jsonStr = jsonStr.replace(/<\/?script[^>]*>/gi, ""); } while (jsonStr !== prev);
      jsonStr = jsonStr.trim();
      const data = JSON.parse(jsonStr);
      results.push(...extractItemsFromJSON(data));
    } catch { /* skip */ }
  }
  const nextDataMatch = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([^<]+)<\/script>/i);
  if (nextDataMatch) {
    try { results.push(...extractItemsFromJSON(JSON.parse(nextDataMatch[1]))); } catch { /* skip */ }
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
      results.push({ title: String(obj.title), price, currency: String(currency).toUpperCase(), shippingCost: safeNum(obj.shippingCost?.value || obj.shippingCost) || 0, soldDate: obj.soldDate || obj.endDate || null });
    }
  }
  if (Array.isArray(obj)) { for (const item of obj) results.push(...extractItemsFromJSON(item, depth + 1)); }
  else { for (const val of Object.values(obj)) { if (val && typeof val === "object") results.push(...extractItemsFromJSON(val, depth + 1)); } }
  return results;
}

function parseSoldListings(html) {
  const $ = cheerio.load(html);
  const results = [];
  $(".s-item").each((_, el) => {
    const $el = $(el);
    const title = normSpaces($el.find(".s-item__title, .s-item__title span").first().text());
    if (!title || title === "Shop on eBay") return;
    const priceText = $el.find(".s-item__price").first().text().trim() || $el.find(".s-item__detail--primary .POSITIVE").first().text().trim();
    const parsed = parsePriceText(priceText);
    const soldDateText = $el.find(".s-item__title--tag .POSITIVE").text().trim() || $el.find(".s-item__ended-date").text().trim() || $el.find(".s-item__endedDate").text().trim() || $el.find(".s-item__caption .POSITIVE").text().trim();
    const shippingText = $el.find(".s-item__shipping, .s-item__freeXDays, .s-item__logisticsCost").first().text().trim();
    const shippingCost = parseShippingText(shippingText);
    if (parsed) results.push({ title, price: parsed.price, currency: parsed.currency, shippingCost, soldDate: soldDateText || null });
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
      if (parsed) results.push({ title, price: parsed.price, currency: parsed.currency, shippingCost, soldDate: null });
    });
  }
  if (!results.length) results.push(...parseItemsFromScriptTags(html));
  return results;
}

function parsePriceText(text) {
  if (!text) return null;
  const t = text.replace(/,/g, "").trim();
  const rangeMatch = t.match(/(?:(?:C|US|AU|CA)?\s*\$|(?:GBP|EUR|£|€)\s*)?([\d.]+)\s+to\s+(?:(?:C|US|AU|CA)?\s*\$|(?:GBP|EUR|£|€)\s*)?([\d.]+)/i);
  if (rangeMatch) {
    const low = safeNum(rangeMatch[1]); const high = safeNum(rangeMatch[2]);
    if (low != null && high != null) return { price: (low + high) / 2, currency: detectCurrency(t) };
  }
  const priceMatch = t.match(/([\d.]+)/);
  if (!priceMatch) return null;
  const price = safeNum(priceMatch[1]);
  if (price == null) return null;
  return { price, currency: detectCurrency(t) };
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
  if (norm(text).includes("free")) return 0;
  const match = text.replace(/,/g, "").match(/([\d.]+)/);
  if (match) { const v = safeNum(match[1]); return v != null ? v : 0; }
  return 0;
}

// --- data loading ---
function loadAthletes() {
  if (!fs.existsSync(ATHLETES_PATH)) throw new Error(`Missing ${ATHLETES_PATH}.`);
  const raw = fs.readFileSync(ATHLETES_PATH, "utf8");
  return (JSON.parse(raw) || []).map((x) => ({ name: normSpaces(x?.name), sport: normSpaces(x?.sport) })).filter((x) => x.name);
}

function buildKeyword(name, sport) { return `${name} ${sport || ""}`.trim(); }

// --- progress ---
function loadProgress() {
  try { if (fs.existsSync(PROGRESS_PATH)) return JSON.parse(fs.readFileSync(PROGRESS_PATH, "utf8")); } catch { /* fresh */ }
  return { nextIndex: 0 };
}
function saveProgress(prog) { fs.writeFileSync(PROGRESS_PATH, JSON.stringify(prog, null, 2)); }

function loadExistingOutput() {
  try { if (fs.existsSync(OUT_PATH)) return JSON.parse(fs.readFileSync(OUT_PATH, "utf8")); } catch { /* fresh */ }
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
  console.log(`\n📦 GRADED SOLD Batch: athletes ${startIdx + 1}–${endIdx} of ${athletes.length} (${batch.length} this run)\n`);

  const fx = await getFxRatesToUSD();
  const out = loadExistingOutput();

  out._meta = {
    updatedAt: new Date().toISOString(),
    source: "eBay public sold listings — GRADED ONLY (HTML scrape, LH_Sold=1)",
    note: "GRADED sold comps only (PSA, BGS, SGC, etc.). Scraped in batches of " + BATCH_SIZE + ". Brand-filtered. Junk titles removed. Taguchi winsorized mean + market stability CV. Currency normalized to USD via CBSA.",
    batchInfo: { startIdx, endIdx, totalAthletes: athletes.length },
    maxPages: MAX_PAGES, minSampleSize: MIN_SAMPLE_SIZE, brands: BRANDS, categoryId: CATEGORY_ID,
    listingStat: { method: "taguchi_winsorized_mean", trimPercent: TAGUCHI_TRIM_PCT },
    stabilityStat: { method: "cv", formula: "sd/mean", sample: "winsorized", trimPercent: TAGUCHI_TRIM_PCT },
    fx: { source: "CBSA Exchange Rates API", asOf: fx.asOf },
  };

  for (let i = 0; i < batch.length; i++) {
    const globalIdx = startIdx + i;
    const { name, sport } = batch[i];
    console.log(`[${globalIdx + 1}/${athletes.length}] ${name} (${sport || "Unknown"}) — GRADED SOLD`);

    const keyword = buildKeyword(name, sport);
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
          if (html.includes("captcha") || html.includes("robot")) console.log(`  ⚠️ Possible bot detection`);
          const sItemCount = (html.match(/s-item__title/g) || []).length;
          console.log(`  Raw .s-item__title matches: ${sItemCount}`);
        }

        const listings = parseSoldListings(html);
        if (!listings.length) { if (page === 1) console.log(`  No sold results for "${keyword}"`); break; }
        totalScraped += listings.length;

        for (const it of listings) {
          const title = it.title;
          if (!hasAllowedBrand(title)) continue;
          if (isJunkTitle(title)) continue;
          if (!titleLooksRelevantToPlayer(title, name)) continue;

          // ✅ GRADED ONLY: skip non-graded listings
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

      console.log(`  Scraped: ${totalScraped} | After filters (graded): ${pricesUSD.length} | Taguchi: ${hasSample && taguchiSold != null ? `$${taguchiSold.toFixed(2)}` : "N/A"}`);

      out[name] = {
        keyword, nScraped: totalScraped, nSoldUsed: pricesUSD.length,
        avg: hasSample ? taguchiSold : null, taguchiSold: hasSample ? taguchiSold : null,
        medianSold: hasSample ? medianSold : null, marketStabilityCV: hasSample ? marketStabilityCV : null,
        currency: "USD", originalCurrencyExample: firstCur, fxRateUsed: fxRateUsed || null,
      };
    } catch (e) {
      console.log(`  ${name}: ERROR ${e?.message || e}`);
      out[name] = { keyword, nScraped: totalScraped, nSoldUsed: 0, avg: null, taguchiSold: null, medianSold: null, marketStabilityCV: null, currency: "USD", error: String(e?.message || e) };
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
  console.log(`\n✅ Graded sold batch complete (${startIdx + 1}–${endIdx}). Next run starts at athlete ${endIdx + 1}.`);
  console.log(`Wrote ${OUT_PATH}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
