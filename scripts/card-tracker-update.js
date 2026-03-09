// scripts/card-tracker-update.js
// Node 20+ (uses global fetch)
//
// Daily tracker for specific individual cards:
//   - 2018 Topps Update Series #US250 Ronald Acuna Jr. RC
//   - 2018 Topps Update #US200 Gleyber Torres RC
//
// For each card, collects:
//   RAW: Near Mint / Mint condition only, excludes graded
//   GRADED: PSA only, individual grades 1-10 including sub-grades
//
// Statistics per snapshot:
//   - Taguchi winsorized mean (40% trim)
//   - CV (sd/mean on winsorized sample)
//   - S/N ratio: 10 * log10(1/CV²)
//   - Median, sample count
//
// Output: data/card-tracker.json  (appends daily snapshot)
//         public/data/card-tracker.json (copy for frontend)

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as cheerio from "cheerio";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_PATH = path.join(__dirname, "..", "data", "card-tracker.json");
const PUBLIC_PATH = path.join(__dirname, "..", "public", "data", "card-tracker.json");

const CATEGORY_ID = "261328";
const MAX_PAGES = 3;
const MAX_RETRIES = 4;
const BASE_DELAY_MS = 4000;
const INTER_PAGE_DELAY_MS = 2500;
const MIN_SAMPLE_SIZE = 3;
const TAGUCHI_TRIM_PCT = 0.4;

// Cards to track
const CARDS = [
  {
    key: "us250-acuna",
    name: "Ronald Acuna Jr.",
    sport: "Baseball",
    cardTitle: "2018 Topps Update Series #US250 Ronald Acuna Jr. Rookie RC",
    searchKeywordRaw: "2018 Topps Update US250 Acuna",
    searchKeywordGraded: "2018 Topps Update US250 Acuna PSA",
    cardNumber: "US250",
  },
  {
    key: "us200-torres",
    name: "Gleyber Torres",
    sport: "Baseball",
    cardTitle: "2018 Topps Update #US200 Gleyber Torres RC",
    searchKeywordRaw: "2018 Topps Update US200 Torres",
    searchKeywordGraded: "2018 Topps Update US200 Torres PSA",
    cardNumber: "US200",
  },
];

// PSA grades to track individually
const PSA_GRADES = ["10", "9.5", "9", "8.5", "8", "7.5", "7", "6.5", "6", "5.5", "5", "4.5", "4", "3.5", "3", "2.5", "2", "1.5", "1"];

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0",
];

const UNGRADED_BLOCKLIST = [
  "damaged", "damage", "poor", "fair", "very good", "vg", "good", "gd",
  "creases", "crease", "wrinkle", "corner wear", "surface wear", "paper loss",
  "stain", "stained", "water damage", "tape", "writing", "marked",
  "pin hole", "hole", "torn", "tear", "scratches", "scratch",
  "reprint", "replica", "copy", "digital", "card lot", "lot",
];

const JUNK_PHRASES = [
  "you pick", "digital", "you choose", "pick your", "choose your",
  "your choice", "complete your set", "complete set", "set builder",
  "set break", "base singles", "lot", "team lot", "player lot",
  "break", "case break", "random", "bulk", "u-pick", "u pick", "lote",
  "group", "card lot",
];

// --- helpers ---
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
function randomUA() { return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]; }
function norm(s) { return String(s || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim(); }
function normSpaces(s) { return String(s || "").replace(/\s+/g, " ").trim(); }
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
  if (n < 3 || k === 0 || n <= 2 * k) return median(sorted);
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

function signalToNoise(cv) {
  if (cv == null || cv < 0.01) return null;
  const sn = 10 * Math.log10(1 / (cv * cv));
  if (!Number.isFinite(sn)) return null;
  return Math.min(sn, 40);
}

function isJunkTitle(title) {
  const t = norm(title);
  return JUNK_PHRASES.some((p) => t.includes(p));
}

// Detect if title contains a specific card number
function titleHasCardNumber(title, cardNumber) {
  const t = norm(title);
  const cn = norm(cardNumber);
  // Match #US250, US250, # US250 etc.
  return t.includes(cn);
}

// Graded detection with PSA-only filter
function extractPSAGrade(title) {
  const t = String(title || "");
  // Match "PSA 10", "PSA 9.5", "PSA 9", etc.
  const match = t.match(/\bPSA\s+(10|9\.5|9|8\.5|8|7\.5|7|6\.5|6|5\.5|5|4\.5|4|3\.5|3|2\.5|2|1\.5|1)\b/i);
  return match ? match[1] : null;
}

function isGradedTitle(title) {
  const t = norm(title);
  const graderWithGrade = /\b(psa|sgc|bgs|cgc|hga|isa|csa|beckett|bcg)\b[^\n]{0,20}\b(10|9\.5|9|8\.5|8|7\.5|7|6\.5|6|5\.5|5|4\.5|4|3\.5|3|2\.5|2|1\.5|1|gem mint|mint|pristine|black label|gold label|authentic|dna)\b/i;
  const slabOnly = /\b(gem mint|pristine|black label|gold label|psa\s?10|sgc\s?10|bgs\s?9\.5)\b/i;
  return graderWithGrade.test(t) || slabOnly.test(t);
}

function ungradedPassesPolicy(title) {
  const t = norm(title);
  if (UNGRADED_BLOCKLIST.some((w) => t.includes(w))) return false;
  return true;
}

// --- FX ---
const CBSA_FX_URL = "https://bcd-api-dca-ipa.cbsa-asfc.cloud-nuage.canada.ca/exchange-rate-lambda/exchange-rates";

async function getFxRatesToUSD() {
  const res = await fetch(CBSA_FX_URL, { headers: { "Content-Type": "application/json" } });
  if (!res.ok) throw new Error(`FX fetch failed (${res.status})`);
  const json = await res.json();
  const rows = json?.ForeignExchangeRates || json?.foreignExchangeRates || [];
  const cadPer = { CAD: 1 };
  for (const r of rows) {
    const from = String(r?.FromCurrency?.Value || r?.FromCurrency || "").toUpperCase();
    const to = String(r?.ToCurrency?.Value || r?.ToCurrency || "").toUpperCase();
    const rate = Number(r?.Rate);
    if (to === "CAD" && Number.isFinite(rate) && rate > 0 && from) cadPer[from] = rate;
  }
  const cadPerUsd = cadPer.USD;
  if (!Number.isFinite(cadPerUsd) || cadPerUsd <= 0) throw new Error("Missing USD->CAD rate");
  const usdPer = { USD: 1 };
  for (const [cur, cadPerCur] of Object.entries(cadPer)) {
    if (!Number.isFinite(cadPerCur) || cadPerCur <= 0) continue;
    usdPer[cur] = cadPerCur / cadPerUsd;
  }
  usdPer.CAD = 1 / cadPerUsd;
  return usdPer;
}

function convertToUSD(amount, currency, fxRates) {
  const cur = String(currency || "").toUpperCase();
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const rate = fxRates?.[cur];
  if (!Number.isFinite(rate) || rate <= 0) return null;
  return amount * rate;
}

// --- eBay scraping (Buy It Now active listings) ---
function buildSearchURL(keyword, page = 1, extraParams = {}) {
  const params = new URLSearchParams({
    _nkw: keyword,
    _sacat: CATEGORY_ID,
    LH_BIN: "1",
    _ipg: "60",
    rt: "nc",
    ...extraParams,
  });
  if (page > 1) params.set("_pgn", String(page));
  return `https://www.ebay.com/sch/i.html?${params.toString()}`;
}

async function fetchPage(url) {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const res = await fetch(url, {
      headers: {
        "User-Agent": randomUA(),
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache",
        Referer: "https://www.ebay.com/",
      },
      redirect: "follow",
    });
    if (res.status === 429) {
      const delayMs = Math.pow(2, attempt) * 3000 + Math.random() * 2000;
      console.log(`  ⏳ Rate limited. Waiting ${(delayMs / 1000).toFixed(1)}s`);
      await sleep(delayMs);
      continue;
    }
    if (!res.ok) {
      if (attempt < MAX_RETRIES - 1) { await sleep(Math.pow(2, attempt) * 2000); continue; }
      throw new Error(`Fetch failed (${res.status})`);
    }
    const html = await res.text();
    if ((html.includes("captcha") || html.includes("robot")) && html.length < 5000) {
      if (attempt < MAX_RETRIES - 1) { await sleep(Math.pow(2, attempt) * 5000 + Math.random() * 3000); continue; }
      console.log(`  🤖 CAPTCHA persists`);
    }
    return html;
  }
  throw new Error("Max retries exceeded");
}

function parsePriceText(text) {
  if (!text) return null;
  const t = text.replace(/,/g, "").trim();
  const rangeMatch = t.match(/(?:(?:C|US|AU|CA)?\s*\$|(?:GBP|EUR|£|€)\s*)?([\d.]+)\s+to\s+(?:(?:C|US|AU|CA)?\s*\$|(?:GBP|EUR|£|€)\s*)?([\d.]+)/i);
  if (rangeMatch) {
    const low = safeNum(rangeMatch[1]);
    const high = safeNum(rangeMatch[2]);
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
  const t = norm(text);
  if (t.includes("free")) return 0;
  const match = text.replace(/,/g, "").match(/([\d.]+)/);
  return match ? (safeNum(match[1]) || 0) : 0;
}

function parseListings(html) {
  const $ = cheerio.load(html);
  const results = [];
  $(".s-item").each((_, el) => {
    const $el = $(el);
    const title = normSpaces($el.find(".s-item__title, .s-item__title span").first().text());
    if (!title || title === "Shop on eBay") return;
    const priceText = $el.find(".s-item__price").first().text().trim();
    const parsed = parsePriceText(priceText);
    const shippingText = $el.find(".s-item__shipping, .s-item__freeXDays, .s-item__logisticsCost").first().text().trim();
    const shippingCost = parseShippingText(shippingText);
    if (parsed) {
      results.push({ title, price: parsed.price, currency: parsed.currency, shippingCost });
    }
  });
  return results;
}

// --- Compute stats for a price array ---
function computeStats(pricesUSD) {
  if (pricesUSD.length < MIN_SAMPLE_SIZE) return null;
  const taguchiMean = taguchiTrimmedMean(pricesUSD, TAGUCHI_TRIM_PCT);
  const med = median(pricesUSD);
  const cv = taguchiCV(pricesUSD, TAGUCHI_TRIM_PCT);
  const sn = signalToNoise(cv);
  return {
    taguchiMean: taguchiMean != null ? Math.round(taguchiMean * 100) / 100 : null,
    median: med != null ? Math.round(med * 100) / 100 : null,
    cv: cv != null ? Math.round(cv * 10000) / 10000 : null,
    sn: sn != null ? Math.round(sn * 100) / 100 : null,
    n: pricesUSD.length,
    min: Math.round(Math.min(...pricesUSD) * 100) / 100,
    max: Math.round(Math.max(...pricesUSD) * 100) / 100,
  };
}

// --- Scrape RAW listings for a card ---
async function scrapeRaw(card, fxRates) {
  console.log(`\n📋 RAW: ${card.cardTitle}`);
  const pricesUSD = [];

  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = buildSearchURL(card.searchKeywordRaw, page, { "Condition%20Type": "Ungraded" });
    try {
      const html = await fetchPage(url);
      if (page === 1) console.log(`  HTML: ${html.length} chars`);
      const listings = parseListings(html);
      if (!listings.length) { if (page === 1) console.log(`  No results`); break; }

      for (const it of listings) {
        if (isJunkTitle(it.title)) continue;
        if (!titleHasCardNumber(it.title, card.cardNumber)) continue;
        if (isGradedTitle(it.title)) continue;
        if (!ungradedPassesPolicy(it.title)) continue;
        let totalPrice = it.price + (it.shippingCost || 0);
        const usd = convertToUSD(totalPrice, it.currency, fxRates);
        if (usd != null) pricesUSD.push(usd);
      }

      if (page < MAX_PAGES) await sleep(INTER_PAGE_DELAY_MS + Math.random() * 1500);
    } catch (e) {
      console.log(`  Page ${page} error: ${e.message}`);
      break;
    }
  }

  console.log(`  Raw prices collected: ${pricesUSD.length}`);
  return computeStats(pricesUSD);
}

// --- Scrape GRADED (PSA) listings for a card ---
async function scrapeGraded(card, fxRates) {
  console.log(`\n🏆 GRADED (PSA): ${card.cardTitle}`);
  const allPricesUSD = [];
  const byGrade = {};

  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = buildSearchURL(card.searchKeywordGraded, page, { Graded: "Yes" });
    try {
      const html = await fetchPage(url);
      if (page === 1) console.log(`  HTML: ${html.length} chars`);
      const listings = parseListings(html);
      if (!listings.length) { if (page === 1) console.log(`  No results`); break; }

      for (const it of listings) {
        if (isJunkTitle(it.title)) continue;
        if (!titleHasCardNumber(it.title, card.cardNumber)) continue;
        // Must be PSA specifically
        const grade = extractPSAGrade(it.title);
        if (!grade) continue;
        if (!ungradedPassesPolicy(it.title)) continue;

        let totalPrice = it.price + (it.shippingCost || 0);
        const usd = convertToUSD(totalPrice, it.currency, fxRates);
        if (usd == null) continue;

        allPricesUSD.push(usd);
        if (!byGrade[grade]) byGrade[grade] = [];
        byGrade[grade].push(usd);
      }

      if (page < MAX_PAGES) await sleep(INTER_PAGE_DELAY_MS + Math.random() * 1500);
    } catch (e) {
      console.log(`  Page ${page} error: ${e.message}`);
      break;
    }
  }

  console.log(`  Graded prices collected: ${allPricesUSD.length}`);

  // Compute per-grade stats
  const gradeStats = {};
  for (const g of PSA_GRADES) {
    if (byGrade[g] && byGrade[g].length > 0) {
      const stats = computeStats(byGrade[g]);
      if (stats) {
        gradeStats[g] = stats;
      } else {
        // Below min sample but still report count
        gradeStats[g] = {
          taguchiMean: byGrade[g].length === 1 ? Math.round(byGrade[g][0] * 100) / 100 : null,
          median: median(byGrade[g]),
          cv: null,
          sn: null,
          n: byGrade[g].length,
          min: Math.round(Math.min(...byGrade[g]) * 100) / 100,
          max: Math.round(Math.max(...byGrade[g]) * 100) / 100,
        };
      }
    }
  }

  const overall = computeStats(allPricesUSD);

  return { overall, byGrade: gradeStats };
}

// --- main ---
async function main() {
  console.log("🔍 Card Tracker — daily snapshot\n");
  const today = new Date().toISOString().split("T")[0];

  // Load existing data
  let data;
  try {
    data = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
  } catch {
    data = { _meta: {} };
  }

  const fxRates = await getFxRatesToUSD();

  for (const card of CARDS) {
    if (!data[card.key]) {
      data[card.key] = {
        name: card.name,
        sport: card.sport,
        cardTitle: card.cardTitle,
        searchKeywordRaw: card.searchKeywordRaw,
        searchKeywordGraded: card.searchKeywordGraded,
        snapshots: [],
      };
    }

    // Check if already scraped today
    const existing = data[card.key].snapshots;
    if (existing.length > 0 && existing[existing.length - 1].date === today) {
      console.log(`⏭️ ${card.name}: already scraped today (${today}), skipping`);
      continue;
    }

    const raw = await scrapeRaw(card, fxRates);
    await sleep(BASE_DELAY_MS + Math.random() * 3000);
    const graded = await scrapeGraded(card, fxRates);

    const snapshot = { date: today, raw, graded };
    data[card.key].snapshots.push(snapshot);

    console.log(`\n✅ ${card.name} snapshot saved for ${today}`);

    // Progressive save
    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));

    await sleep(BASE_DELAY_MS + Math.random() * 3000);
  }

  data._meta.lastUpdated = new Date().toISOString();
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));

  // Copy to public
  fs.mkdirSync(path.dirname(PUBLIC_PATH), { recursive: true });
  fs.copyFileSync(DATA_PATH, PUBLIC_PATH);

  console.log(`\n🎯 Card tracker complete. Wrote ${DATA_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
