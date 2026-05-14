// =============================================================================
// scripts/psa78-sold-update-ebay-avg.js — PSA 7 & PSA 8 SOLD PRICE COLLECTOR
// =============================================================================
//
// PURPOSE:
//   Scrapes eBay public sold/completed listings for PSA 7 and PSA 8 graded comps
//   per gemrate-flagged athlete. Sister pipeline to graded-sold-update-ebay-avg.js
//   which only captures the broader PSA/BGS/SGC universe (mostly PSA 9/10).
//
// WORKFLOW: ebay-psa78-sold.yml (manual trigger; bi-weekly schedule optional)
// ENV VARS: EBAY_ONLY (optional single-athlete mode)
// INPUT:    data/athletes.json (filtered to gemrate="yes" only)
// OUTPUT:   data/ebay-psa78-sold-avg.json
// PROGRESS: data/ebay-psa78-sold-progress.json
//
// PIPELINE (per athlete):
//   For each grade in [7, 8]:
//     1. Build search URL with "{name} {sport} PSA {grade}" + League filter
//     2. Fetch up to MAX_PAGES with retry/backoff (mirrors graded scraper)
//     3. Parse via 3-tier extraction
//     4. Filter: junk titles + name relevance + STRICT "PSA {grade}" match
//     5. Convert to USD via CBSA (includes shipping)
//     6. Compute Taguchi winsorized mean, median, CV
//
// SEE ALSO: scripts/graded-sold-update-ebay-avg.js (PSA 9/10 universe)
// =============================================================================

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as cheerio from "cheerio";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ATHLETES_PATH = path.join(__dirname, "..", "data", "athletes.json");
const OUT_PATH = path.join(__dirname, "..", "data", "ebay-psa78-sold-avg.json");
const PROGRESS_PATH = path.join(__dirname, "..", "data", "ebay-psa78-sold-progress.json");

const CATEGORY_ID = "261328";
const GEMRATE_ONLY = true;

const TARGET_GRADES = [7, 8];

// Sampling - same posture as graded scraper, slightly tighter MAX_PAGES because
// PSA 7/8 are thinner markets and extra pages rarely add valid comps.
const MAX_PAGES = 3;
const MAX_RETRIES = 4;
const BASE_DELAY_MS = 4000;
const INTER_PAGE_DELAY_MS = 2500;
const INTER_GRADE_DELAY_MS = 3000;
const BATCH_SIZE = 8; // smaller — 2 queries per athlete
const MIN_SAMPLE_SIZE = 3; // PSA 7/8 are thin markets, allow 3

const TAGUCHI_TRIM_PCT = 0.4;

const JUNK_PHRASES = [
  "you pick", "digitalcard", "digital", "you choose", "pick your", "choose your",
  "your choice", "complete your set", "complete set",
  "set builder", "set break", "base singles", "insert singles",
  "singles you pick", "you pick!", "you pick -",
  "lot", "team lot", "player lot", "break", "case break",
  "random", "bulk", "paper rc's & vets", "rc's & vets",
  "u-pick", "u pick", "lote", "base cards from", "group", "you pick obo", "ERROR Card", "card lot",
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

// --- helpers (mirror graded scraper) ---
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const normSpaces = (s) => String(s || "").replace(/\s+/g, " ").trim();
const stripDiacritics = (s) => String(s || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
const norm = (s) => String(s || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
const safeNum = (x) => { const n = Number(x); return Number.isFinite(n) ? n : null; };
const avg = (v) => v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
const median = (v) => {
  if (!v.length) return null;
  const s = [...v].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const stdev = (v) => {
  if (!v || v.length < 2) return null;
  const m = avg(v); if (m == null) return null;
  let s = 0; for (const x of v) s += (x - m) * (x - m);
  const sd = Math.sqrt(s / (v.length - 1));
  return Number.isFinite(sd) ? sd : null;
};
function normalizeNameForCompare(s) {
  return normSpaces(stripDiacritics(s).toLowerCase().replace(/[.'"]/g, "").replace(/\b(jr|jr\.|sr|sr\.)\b/g, ""));
}

function taguchiTrimmedMean(values, trimPercent = TAGUCHI_TRIM_PCT) {
  if (!values || !values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const k = Math.floor(n * trimPercent);
  if (n < 3 || k === 0) return median(sorted);
  if (n <= 2 * k) return median(sorted);
  const lo = sorted[k], hi = sorted[n - k - 1];
  let sum = 0;
  for (const v of sorted) sum += v < lo ? lo : v > hi ? hi : v;
  return sum / n;
}
function taguchiCV(values, trimPercent = TAGUCHI_TRIM_PCT) {
  if (!values || values.length < 3) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const k = Math.floor(n * trimPercent);
  if (n < 3 || k === 0 || n <= 2 * k) return null;
  const lo = sorted[k], hi = sorted[n - k - 1];
  const wins = sorted.map((v) => v < lo ? lo : v > hi ? hi : v);
  const m = avg(wins), sd = stdev(wins);
  if (m == null || sd == null || m <= 0) return null;
  return sd / m;
}

// --- filters ---
function isJunkTitle(title) {
  const t = norm(title);
  return JUNK_PHRASES.some((p) => new RegExp(`\\b${p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(t));
}
function titleLooksRelevantToPlayer(title, playerName) {
  const t = norm(title);
  const parts = norm(playerName).split(/\s+/).filter(Boolean);
  if (!parts.length) return true;
  return parts.every((part) => t.includes(part));
}

// STRICT: title must contain "PSA {grade}" with NO half-grade variants and NO
// other graders. Use tight {0,3} char gap (matches main scraper) so card numbers
// like "PSA Topps #87" don't accidentally match.
function isExactPsaGradeTitle(title, grade) {
  const t = norm(title);
  // Reject if any other PSA grade appears (e.g. PSA 9, PSA 10) — half grades too
  const otherGradesPattern =
    /\bpsa\b[^\n]{0,3}\b(10|9\.5|9|8\.5|7\.5|6\.5|6|5\.5|5|4\.5|4|3\.5|3|2\.5|2|1\.5|1)\b/gi;
  // Build set of "other" grades (everything except the target)
  const matchTarget = new RegExp(`\\bpsa\\b[^\n]{0,3}\\b${grade}\\b`, "i");
  if (!matchTarget.test(t)) return false;
  // Reject if also tagged with BGS/SGC (cross-grader noise)
  if (/\b(bgs|sgc|beckett)\b/i.test(t)) return false;
  // Reject if any other PSA grade also appears
  const matches = t.match(otherGradesPattern) || [];
  for (const m of matches) {
    const numMatch = m.match(/\b(10|9\.5|9|8\.5|7\.5|6\.5|6|5\.5|5|4\.5|4|3\.5|3|2\.5|2|1\.5|1)\b/);
    if (numMatch && Number(numMatch[1]) !== grade) return false;
  }
  return true;
}

const randomUA = () => USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

// --- FX (CBSA) ---
const CBSA_FX_URL =
  "https://bcd-api-dca-ipa.cbsa-asfc.cloud-nuage.canada.ca/exchange-rate-lambda/exchange-rates";
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
      asOf = asOf || r?.ExchangeRateEffectiveTimestamp || null;
    }
  }
  const cadPerUsd = cadPer.USD;
  if (!Number.isFinite(cadPerUsd) || cadPerUsd <= 0) throw new Error("CBSA FX: missing USD rate");
  const usdPer = { USD: 1 };
  for (const [cur, v] of Object.entries(cadPer)) {
    if (Number.isFinite(v) && v > 0) usdPer[cur] = v / cadPerUsd;
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

// --- eBay scrape ---
function buildSoldSearchURL(keyword, sport, page = 1) {
  const params = new URLSearchParams({
    _nkw: keyword, _sacat: CATEGORY_ID, LH_Sold: "1", LH_Complete: "1", _ipg: "60", rt: "nc",
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
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
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
        const p = parseInt(retryAfter, 10);
        if (!isNaN(p)) delayMs = Math.max(p * 1000, delayMs);
      }
      console.log(`  ⏳ 429. Wait ${((delayMs) / 1000).toFixed(1)}s (try ${attempt + 1}/${MAX_RETRIES})`);
      await sleep(delayMs + Math.random() * 2000);
      continue;
    }
    if (!res.ok) {
      if (attempt < MAX_RETRIES - 1) {
        const w = Math.pow(2, attempt) * 2000 + Math.random() * 1000;
        console.log(`  ⚠️ HTTP ${res.status}. Retry ${(w / 1000).toFixed(1)}s`);
        await sleep(w); continue;
      }
      throw new Error(`eBay fetch failed (${res.status})`);
    }
    const html = await res.text();
    if (html.includes("captcha") || html.includes("robot") || html.length < 5000) {
      if (attempt < MAX_RETRIES - 1) {
        const w = Math.pow(2, attempt) * 5000 + Math.random() * 3000;
        console.log(`  🤖 CAPTCHA. Wait ${(w / 1000).toFixed(1)}s`);
        await sleep(w); continue;
      }
    }
    return html;
  }
  throw new Error(`fetchSoldPage: max retries exceeded`);
}

function parsePriceText(text) {
  if (!text) return null;
  const t = text.replace(/,/g, "").trim();
  const range = t.match(/(?:(?:C|US|AU|CA)?\s*\$|(?:GBP|EUR|£|€)\s*)?([\d.]+)\s+to\s+(?:(?:C|US|AU|CA)?\s*\$|(?:GBP|EUR|£|€)\s*)?([\d.]+)/i);
  if (range) {
    const lo = safeNum(range[1]), hi = safeNum(range[2]);
    if (lo != null && hi != null) return { price: (lo + hi) / 2, currency: detectCurrency(t) };
  }
  const m = t.match(/([\d.]+)/);
  if (!m) return null;
  const price = safeNum(m[1]);
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
  const m = text.replace(/,/g, "").match(/([\d.]+)/);
  return m ? (safeNum(m[1]) ?? 0) : 0;
}

function parseSoldListings(html) {
  const $ = cheerio.load(html);
  const out = [];
  $(".s-item").each((_, el) => {
    const $el = $(el);
    const title = normSpaces($el.find(".s-item__title, .s-item__title span").first().text());
    if (!title || title === "Shop on eBay") return;
    const priceText =
      $el.find(".s-item__price").first().text().trim() ||
      $el.find(".s-item__detail--primary .POSITIVE").first().text().trim();
    const parsed = parsePriceText(priceText);
    const shippingText = $el.find(".s-item__shipping, .s-item__freeXDays, .s-item__logisticsCost").first().text().trim();
    if (parsed) out.push({ title, price: parsed.price, currency: parsed.currency, shippingCost: parseShippingText(shippingText) });
  });
  if (!out.length) {
    $("[data-viewport]").each((_, el) => {
      const $el = $(el);
      const title = normSpaces($el.find("[role='heading']").first().text());
      if (!title || title === "Shop on eBay") return;
      const priceText = $el.find("[class*='price'], .POSITIVE").first().text().trim();
      const parsed = parsePriceText(priceText);
      const shippingText = $el.find("[class*='shipping'], [class*='logistic']").first().text().trim();
      if (parsed) out.push({ title, price: parsed.price, currency: parsed.currency, shippingCost: parseShippingText(shippingText) });
    });
  }
  return out;
}

// --- data loading ---
function parseWithRecovery(content) {
  let clean = content.replace(/^\uFEFF/, "").trim();
  try { return JSON.parse(clean); } catch (e) {
    try { return JSON.parse(clean.replace(/,\s*([\]}])/g, "$1")); } catch { }
    throw new Error(`Cannot parse athletes.json (${e.message})`);
  }
}
function loadAthletes() {
  if (!fs.existsSync(ATHLETES_PATH)) throw new Error(`Missing ${ATHLETES_PATH}`);
  const arr = parseWithRecovery(fs.readFileSync(ATHLETES_PATH, "utf8")) || [];
  let list = arr;
  if (GEMRATE_ONLY) list = list.filter((x) => x.gemrate === "yes");
  return list
    .map((x) => ({
      name: normSpaces(x?.name),
      sport: normSpaces(x?.sport),
      searchKeyword: x?.searchKeyword ? normSpaces(x.searchKeyword) : undefined,
    }))
    .filter((x) => x.name);
}
function buildKeyword(name, sport, grade) {
  return `${name}${sport ? ` ${sport}` : ""} PSA ${grade}`;
}
function loadProgress() {
  try { if (fs.existsSync(PROGRESS_PATH)) return JSON.parse(fs.readFileSync(PROGRESS_PATH, "utf8")); }
  catch { }
  return { nextIndex: 0 };
}
const saveProgress = (p) => fs.writeFileSync(PROGRESS_PATH, JSON.stringify(p, null, 2));
function loadExistingOutput() {
  try { if (fs.existsSync(OUT_PATH)) return JSON.parse(fs.readFileSync(OUT_PATH, "utf8")); }
  catch { }
  return {};
}

// --- Per-athlete-per-grade collector ---
async function collectGrade({ name, sport, searchKeyword, grade, fx }) {
  const keyword = buildKeyword(searchKeyword || name, sport, grade);
  const pricesUSD = [];
  let firstCur = null, fxRateUsed = null, totalScraped = 0;
  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = buildSoldSearchURL(keyword, sport, page);
    const html = await fetchSoldPage(url);
    if (page === 1) console.log(`    HTML: ${html.length} chars`);
    const listings = parseSoldListings(html);
    if (!listings.length) { if (page === 1) console.log(`    No results for "${keyword}"`); break; }
    totalScraped += listings.length;
    for (const it of listings) {
      if (!it.title) continue;
      if (isJunkTitle(it.title)) continue;
      if (!titleLooksRelevantToPlayer(it.title, name)) continue;
      if (!isExactPsaGradeTitle(it.title, grade)) continue;
      let total = it.price;
      if (it.shippingCost > 0) total += it.shippingCost;
      firstCur = firstCur || it.currency || null;
      const { usd, rateUsed } = convertToUSD(total, it.currency, fx.rates);
      if (usd == null) continue;
      pricesUSD.push(usd);
      fxRateUsed = fxRateUsed || rateUsed;
    }
    if (page < MAX_PAGES) await sleep(INTER_PAGE_DELAY_MS + Math.random() * 1500);
  }
  const hasSample = pricesUSD.length >= MIN_SAMPLE_SIZE;
  const taguchi = taguchiTrimmedMean(pricesUSD, TAGUCHI_TRIM_PCT);
  const med = median(pricesUSD);
  const cv = taguchiCV(pricesUSD, TAGUCHI_TRIM_PCT);
  console.log(`    PSA ${grade}: scraped ${totalScraped} | filtered ${pricesUSD.length} | ${hasSample && taguchi != null ? `$${taguchi.toFixed(2)}` : "N/A"}`);
  return {
    keyword,
    nScraped: totalScraped,
    nSoldUsed: pricesUSD.length,
    taguchiSold: hasSample ? taguchi : null,
    medianSold: hasSample ? med : null,
    marketStabilityCV: hasSample ? cv : null,
    currency: "USD",
    originalCurrencyExample: firstCur,
    fxRateUsed,
  };
}

// --- main ---
async function main() {
  const athletes = loadAthletes();

  const onlyNames = process.env.EBAY_ONLY;
  const fx = await getFxRatesToUSD();
  const out = loadExistingOutput();

  let batch, startIdx, endIdx;

  if (onlyNames) {
    const wanted = onlyNames.split(",").map((n) => normalizeNameForCompare(n.trim()));
    batch = athletes.filter((a) => wanted.includes(normalizeNameForCompare(a.name)));
    startIdx = 0; endIdx = batch.length;
    console.log(`🎯 Single-athlete mode: ${batch.length} athlete(s)`);
  } else {
    const progress = loadProgress();
    startIdx = progress.nextIndex || 0;
    if (startIdx >= athletes.length) {
      console.log(`All ${athletes.length} processed. Resetting cycle.`);
      saveProgress({ nextIndex: 0, lastCompletedAt: new Date().toISOString() });
      return;
    }
    endIdx = Math.min(startIdx + BATCH_SIZE, athletes.length);
    batch = athletes.slice(startIdx, endIdx);
    console.log(`\n📦 Batch ${startIdx + 1}–${endIdx} of ${athletes.length} (${batch.length} this run)\n`);
  }

  out._meta = {
    updatedAt: new Date().toISOString(),
    source: "eBay public sold listings (HTML scrape, LH_Sold=1)",
    note: "PSA 7 + PSA 8 sold comps. Two queries per athlete. Strict per-grade title filter. Taguchi winsorized mean. USD via CBSA.",
    targetGrades: TARGET_GRADES,
    batchInfo: onlyNames ? { mode: "single", count: batch.length } : { startIdx, endIdx, totalAthletes: athletes.length },
    maxPages: MAX_PAGES,
    minSampleSize: MIN_SAMPLE_SIZE,
    categoryId: CATEGORY_ID,
    listingStat: { method: "taguchi_winsorized_mean", trimPercent: TAGUCHI_TRIM_PCT },
    stabilityStat: { method: "cv", formula: "sd/mean", sample: "winsorized", trimPercent: TAGUCHI_TRIM_PCT },
    fx: { source: "CBSA Exchange Rates API", asOf: fx.asOf },
  };

  for (let i = 0; i < batch.length; i++) {
    const globalIdx = onlyNames ? i : startIdx + i;
    const a = batch[i];
    console.log(`[${globalIdx + 1}/${onlyNames ? batch.length : athletes.length}] ${a.name} (${a.sport || "?"})${a.searchKeyword ? ` [kw: ${a.searchKeyword}]` : ""}`);

    const grades = {};
    try {
      for (let g = 0; g < TARGET_GRADES.length; g++) {
        const grade = TARGET_GRADES[g];
        const result = await collectGrade({ ...a, grade, fx });
        const key = `psa${grade}`;
        const prev = out[a.name]?.[key] || {};
        const taguchi = result.taguchiSold;
        const lastKnown = taguchi ?? prev.lastKnownSold ?? null;
        const lastKnownAt = taguchi != null ? new Date().toISOString() : (prev.lastKnownSoldAt ?? null);
        grades[key] = { ...result, lastKnownSold: lastKnown, lastKnownSoldAt: lastKnownAt };
        if (g < TARGET_GRADES.length - 1) await sleep(INTER_GRADE_DELAY_MS + Math.random() * 1500);
      }
      out[a.name] = grades;
    } catch (e) {
      console.log(`  ❌ ${a.name}: ${e?.message || e}`);
      const prev = out[a.name] || {};
      out[a.name] = { ...prev, error: String(e?.message || e), erroredAt: new Date().toISOString() };
    }

    fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2));

    if (i < batch.length - 1) {
      const d = BASE_DELAY_MS + Math.random() * 4000;
      console.log(`  💤 ${(d / 1000).toFixed(1)}s before next athlete...`);
      await sleep(d);
    }
  }

  if (!onlyNames) {
    saveProgress({ nextIndex: endIdx, lastBatchAt: new Date().toISOString() });
  }
  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2));
  console.log(`\n✅ ${onlyNames ? "Single-athlete mode" : `Batch (${startIdx + 1}–${endIdx})`} complete. Wrote ${OUT_PATH}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
