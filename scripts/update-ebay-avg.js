// scripts/update-ebay-avg.js
// Node 20+ (uses global fetch)
//
// Computes ACTIVE listing price from eBay Browse API:
// - Buy It Now only (FIXED_PRICE) => excludes auctions
// - Dual marketplace: EBAY_US + EBAY_CA (+ EBAY_ES if you keep it)
//
// Env vars required:
//   EBAY_CLIENT_ID
//   EBAY_CLIENT_SECRET
//
// Output:
//   data/ebay-avg.json
//
// Matching rules (your latest):
// 1) Prefer Player/Athlete aspect_filter match (with name variations / accents).
// 2) If Player/Athlete is NOT matched, then only proceed if Sport aspect matches.
// 3) If no Player/Athlete AND sport does not match => skip (avoid fake info).
//
// Notes:
// - Includes graded + listings under $1 (no price floor).
// - Category used: Trading Card Singles (261328) - keep or change as needed.
// - Normalizes listing prices to USD using CBSA Exchange Rates API as a base.
// - Adds Manufacturer aspect filter to focus on major sports card makers.
// - Uses TAGUCHI trimmed mean (winsorized mean, X%) for listing prices.
// - Adds market stability CV (Coefficient of Variation) on the SAME winsorized sample:
//        CV = s / mean  (lower CV => more stable)
//
// NEW (this change):
// - Ungraded listings must be Card Condition: Near Mint or Better OR Excellent only
// - Excludes damaged/low-condition ungraded listings using descriptors if present,
//   otherwise falls back to title-based detection.
//
// NEW (this change):
// - Adds average days on market for ACTIVE listings (avg age in days since listing created).
//   This is NOT "time to sell" — it's "how long current listings have been live".

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EBAY_CLIENT_ID = process.env.EBAY_CLIENT_ID;
const EBAY_CLIENT_SECRET = process.env.EBAY_CLIENT_SECRET;

if (!EBAY_CLIENT_ID || !EBAY_CLIENT_SECRET) {
  console.error("Missing EBAY_CLIENT_ID or EBAY_CLIENT_SECRET in env.");
  process.exit(1);
}

const OUT_PATH = path.join(__dirname, "..", "data", "ebay-avg.json");

// This script expects:
// data/athletes.json: [{ name: "Jose Altuve", sport: "Baseball" }, ...]
const ATHLETES_PATH = path.join(__dirname, "..", "data", "athletes.json");

// FIX #3: dedicated base prices file — never overwritten by normal runs
const BASE_PRICES_PATH = path.join(__dirname, "..", "data", "ebay-base-prices.json");

// FIX #2: max listings per athlete to fetch full item detail for date fallback
const MAX_ITEM_DETAIL_FETCHES = 10;

// Category you were using (Trading Card Singles)
const CATEGORY_ID = "261328";

// Listing sampling
const LISTING_PAGE_LIMIT = 60; // max active listings to sample per marketplace
const PAGE_SIZE = 60;

// Your UI threshold
const MIN_EBAY_SAMPLE_SIZE = 4;

// Marketplaces to compute
const MARKETPLACES = ["EBAY_US","EBAY_CA"];

// Manufacturer filter removed — all brands accepted

// ✅ Country of Origin options
const COUNTRY_OF_ORIGIN = ["United States", "Italy", "Venezuela", "Japan"];

// Taguchi caps (winsorization %)
const TAGUCHI_TRIM_PCT = 0.4;

// --------------------
// ✅ UNGRADED condition policy
// --------------------
const UNGRADED_ALLOWED_CONDITIONS = [
  "near mint or better",
  "near-mint or better",
  "near mint",
  "nm",
  "nm-mt",
  "nmt",
  "excellent",
  "ex",
];

// if any of these appear (descriptor/title), reject ungraded listing
const UNGRADED_BLOCKLIST = [
  "damaged",
  "damage",
  "poor",
  "fair",
  "digitalcard",
  "digital",
  "very good",
  "vg",
  "good",
  "gd",
  "creases",
  "crease",
  "wrinkle",
  "wrinkling",
  "corner wear",
  "surface wear",
  "paper loss",
  "stain",
  "stained",
  "water damage",
  "tape",
  "writing",
  "marked",
  "marked up",
  "pin hole",
  "hole",
  "torn",
  "tear",
  "scratches",
  "scratch","licensed reprint", 
  "reprint","Card Painting", 
  "replica", 
  "copy",
];

// --- helpers ---
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function stripDiacritics(s) {
  return String(s || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normSpaces(s) {
  return String(s || "").replace(/\s+/g, " ").trim();
}

// Normalized name for comparisons (accents removed, punctuation softened)
function normalizeNameForCompare(s) {
  return normSpaces(
    stripDiacritics(s)
      .toLowerCase()
      .replace(/[.'’"]/g, "")
      .replace(/\b(jr|jr\.|sr|sr\.)\b/g, "")
  );
}

function safeNum(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

function avg(values) {
  if (!values.length) return null;
  const s = values.reduce((a, b) => a + b, 0);
  return s / values.length;
}

// median helper (used as a fallback for tiny samples)
function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// Sample standard deviation
function stdev(values) {
  if (!values || values.length < 2) return null;
  const m = avg(values);
  if (m == null) return null;
  let s = 0;
  for (const v of values) s += (v - m) * (v - m);
  const varSample = s / (values.length - 1);
  const sd = Math.sqrt(varSample);
  return Number.isFinite(sd) ? sd : null;
}

// Taguchi "trimmed mean" (winsorized mean).
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

  if (m == null || sd == null) return null;
  if (!Number.isFinite(m) || !Number.isFinite(sd)) return null;
  if (m <= 0) return null;

  return sd / m;
}

// ✅ string utilities for ungraded condition policy
function normText(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function includesAny(text, arr) {
  const t = normText(text);
  return arr.some((w) => t.includes(normText(w)));
}

// Try to read condition descriptor names from multiple possible shapes.
function extractConditionDescriptorTexts(item) {
  const out = [];

  const cds = item?.conditionDescriptors;
  if (Array.isArray(cds)) {
    for (const d of cds) {
      if (!d) continue;
      out.push(d?.name);
      out.push(d?.descriptorName);
      out.push(d?.value);
      out.push(d?.valueName);
    }
  }

  const cdv = item?.conditionDescriptorValues;
  if (Array.isArray(cdv)) {
    for (const d of cdv) {
      if (!d) continue;
      out.push(d?.name);
      out.push(d?.descriptorName);
      out.push(d?.value);
      out.push(d?.valueName);
    }
  }

  return out.filter(Boolean).map(normText);
}

// ✅ decide if listing should be included when it's UNGRADED
function ungradedPassesConditionPolicy(item) {
  const title = normText(item?.title || "");
  const cond = normText(item?.condition || "");
  const descs = extractConditionDescriptorTexts(item);

  const joined = [title, cond, ...descs].join(" | ");

  // reject damaged/low-grade hints
  if (includesAny(joined, UNGRADED_BLOCKLIST)) return false;

  // accept only near mint/excellent hints
  if (includesAny(joined, UNGRADED_ALLOWED_CONDITIONS)) return true;

  // No explicit condition info — allow by default (most listings lack descriptors)
  return true;
}

// You said you already filter graded vs not graded.
// This keeps a compatible “graded” detector so the ungraded policy only applies when false.
function isGradedListing(item) {
  const cond = normText(item?.condition || "");
  const title = normText(item?.title || "");

  if (cond.includes("graded")) return true;

  // Avoid false positives from plain "10" in titles (e.g. "lot of 10", card #10)
  // by requiring grading-company context.
  //const graderWithGrade = /\b(psa|sgc|bgs|cgc|hga|isa|csa|beckett|bcg)\b[^\n]{0,14}\b(10|9\.5|9|8\.5|8|gem mint|mint|pristine|black label|gold label|dna|authentic)\b/i;
  //const slabOnly = /\b(gem mint|pristine|black label|gold label)\b/i;

  const graderWithGrade = /\b(psa|sgc|bgs|cgc|hga|isa|csa|beckett|bcg)\b[^\n]{0,20}\b(10|9\.5|9|8\.5|8|7\.5|7|6\.5|6|5\.5|5|4\.5|4|3\.5|3|2\.5|2|1\.5|1|gem mint|mint|pristine|black label|gold label|authentic|dna)\b/i;
  const slabOnly = /\b(gem mint|pristine|black label|gold label|psa\s?10|sgc\s?10|bgs\s?9\.5)\b/i;

  return graderWithGrade.test(title) || slabOnly.test(title);
}

// ✅ NEW: listing “age” (days on market) for ACTIVE listings
function extractListingStartISO(item) {
  // eBay Browse API commonly provides itemCreationDate for listing creation time.
  // We also check a few defensive alternatives.
  return (
    item?.itemCreationDate ||
    item?.listingStartDate ||
    item?.startDate ||
    item?.creationDate ||
    null
  );
}

function daysSince(isoString) {
  const t = Date.parse(isoString || "");
  if (!Number.isFinite(t)) return null;

  const now = Date.now();
  let diff = (now - t) / (1000 * 60 * 60 * 24);

  if (!Number.isFinite(diff)) return null;
  if (diff < 0) diff = 0;

  // sanity cap (optional): ignore absurd ages
  if (diff > 3650) return null;

  return diff;
}

function getHeaderMarketplace(marketplaceId) {
  return { "X-EBAY-C-MARKETPLACE-ID": marketplaceId };
}

// Build a search query.
function buildQuery(name, sport) {
  const sportHint = sport ? ` ${sport}` : "";
  return `${name}${sportHint} card`;
}

// Map your sports to likely eBay "Sport" aspect values in Trading Card Singles.
function sportAspectCandidates(sportRaw) {
  const s = (sportRaw || "").toLowerCase().trim();

  const map = {
    baseball: ["Baseball"],
    soccer: ["Soccer"],
    football: ["Football"],
    basketball: ["Basketball"],
    golf: ["Golf"],
    tennis: ["Tennis"],
    mma: ["MMA", "Mixed Martial Arts"],
    bowling: ["Bowling"],
    olympics: ["Track & Field"],
    other: [],
  };

  return map[s] || [sportRaw];
}

// Build a combined eBay aspect_filter (no Manufacturer restriction)
// Always includes Condition Type:{Ungraded} for raw card searches
function buildAspectFilter({ aspectMode, aspectValue }) {
  const parts = [];

  // Always restrict to ungraded (raw) cards
  parts.push(`Condition Type:{Ungraded}`);

  if (aspectMode === "player" && aspectValue) {
    parts.push(`Player/Athlete:{${aspectValue}}`);
  } else if (aspectMode === "sport" && aspectValue) {
    parts.push(`Sport:{${aspectValue}}`);
  }

  return parts.length ? parts.join(",") : null;
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
      asOf =
        asOf ||
        r?.ExchangeRateEffectiveTimestamp ||
        r?.ValidStartDate ||
        r?.ExchangeRateExpiryTimestamp ||
        null;
    }
  }

  const cadPerUsd = cadPer.USD;
  if (!Number.isFinite(cadPerUsd) || cadPerUsd <= 0) {
    throw new Error("CBSA FX: missing/invalid USD->CAD rate (needed to normalize to USD).");
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
  if (!Number.isFinite(amount)) return { usd: null, rateUsed: null };

  const rate = fxRatesToUSD?.[cur];
  if (!Number.isFinite(rate) || rate <= 0) return { usd: null, rateUsed: null };

  return { usd: amount * rate, rateUsed: rate };
}

// --- eBay auth ---
async function getAppToken() {
  const creds = Buffer.from(`${EBAY_CLIENT_ID}:${EBAY_CLIENT_SECRET}`).toString("base64");

  const res = await fetch("https://api.ebay.com/identity/v1/oauth2/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${creds}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      scope: "https://api.ebay.com/oauth/api_scope",
    }),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Failed to get eBay token (${res.status}): ${txt}`);
  }

  const json = await res.json();
  if (!json.access_token) throw new Error("No access_token in token response");
  return json.access_token;
}

// FIX #2: fetch full item detail to get itemCreationDate when summary doesn't include it
async function ebayFetchItemDetail({ token, marketplaceId, itemId }) {
  const url = `https://api.ebay.com/buy/browse/v1/item/${encodeURIComponent(itemId)}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...getHeaderMarketplace(marketplaceId),
    },
  });
  if (!res.ok) return null; // non-fatal: just skip this item's date
  return res.json();
}

// --- eBay Browse Search ---
async function ebayBrowseSearch({
  token,
  marketplaceId,
  q,
  categoryId,
  limit,
  offset,
  aspectFilter,
}) {
  const url = new URL("https://api.ebay.com/buy/browse/v1/item_summary/search");
  url.searchParams.set("q", q);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("offset", String(offset));
  url.searchParams.set("category_ids", categoryId);

  url.searchParams.append("filter", "buyingOptions:{FIXED_PRICE}");

  if (aspectFilter) {
    url.searchParams.set("aspect_filter", aspectFilter);
  }

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...getHeaderMarketplace(marketplaceId),
    },
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Browse search failed (${marketplaceId}) ${res.status}: ${txt}`);
  }

  return res.json();
}

// --- Matching / Validation ---
function candidateAspectValuesForName(name) {
  const raw = normSpaces(name);

  const ascii = normSpaces(stripDiacritics(raw));
  const noDotsRaw = raw.replace(/\./g, "");
  const noDotsAscii = ascii.replace(/\./g, "");

  const noJrRaw = raw.replace(/\s+Jr\.?$/i, "").trim();
  const noJrAscii = ascii.replace(/\s+Jr\.?$/i, "").trim();

  const variants = new Set([raw, ascii, noDotsRaw, noDotsAscii, noJrRaw, noJrAscii]);
  return [...variants].map(normSpaces).filter(Boolean);
}

async function validatePlayerAthleteMatch({ token, marketplaceId, name, sport }) {
  const q = buildQuery(name, sport);

  for (const cand of candidateAspectValuesForName(name)) {
    const aspectFilter = `Player/Athlete:{${cand}}`;
    const data = await ebayBrowseSearch({
      token,
      marketplaceId,
      q,
      categoryId: CATEGORY_ID,
      limit: 1,
      offset: 0,
      aspectFilter,
    });

    const total = safeNum(data?.total) ?? 0;
    if (total > 0) return { ok: true, aspectValue: cand };

    await sleep(120);
  }

  return { ok: false, aspectValue: null };
}

async function validateSportMatch({ token, marketplaceId, name, sport }) {
  const q = buildQuery(name, sport);
  const candidates = sportAspectCandidates(sport);

  for (const s of candidates) {
    if (!s) continue;

    const aspectFilter = `Sport:{${s}}`;
    const data = await ebayBrowseSearch({
      token,
      marketplaceId,
      q,
      categoryId: CATEGORY_ID,
      limit: 1,
      offset: 0,
      aspectFilter,
    });

    const total = safeNum(data?.total) ?? 0;
    if (total > 0) return { ok: true, sportAspectValue: s };

    await sleep(120);
  }

  return { ok: false, sportAspectValue: null };
}

// --- computations ---
async function computeAvgActiveListing({
  token,
  marketplaceId,
  name,
  sport,
  aspectMode,
  aspectValue,
  fxRates,
}) {
  const q = buildQuery(name, sport);
  const aspectFilter = buildAspectFilter({ aspectMode, aspectValue });

  let offset = 0;

  // included samples
  const pricesUSD = [];
  const daysOnMarket = [];

  // FIX #2: track items missing a date so we can fetch detail for them
  const missingDateItems = [];

  let originalCurrency = null;
  let fxRateUsed = null;

  while (offset < LISTING_PAGE_LIMIT) {
    const data = await ebayBrowseSearch({
      token,
      marketplaceId,
      q,
      categoryId: CATEGORY_ID,
      limit: PAGE_SIZE,
      offset,
      aspectFilter,
    });

    const items = data?.itemSummaries || [];

    for (const it of items) {
      // ✅ RAW ONLY: skip graded listings entirely
      if (isGradedListing(it)) continue;

      // ✅ enforce ungraded condition policy (Near Mint / Excellent only)
      const okUngraded = ungradedPassesConditionPolicy(it);
      if (!okUngraded) continue;

      const p = it?.price;
      const v = safeNum(p?.value);
      if (v == null) continue;

      const cur = p?.currency || null;
      originalCurrency = originalCurrency || cur;

      const { usd, rateUsed } = convertToUSD(v, cur, fxRates);
      if (usd == null) continue;

      // ✅ days on market (active listing age)
      const iso = extractListingStartISO(it);
      const d = daysSince(iso);

      pricesUSD.push(usd);
      if (d != null) {
        daysOnMarket.push(d);
      } else if (it?.itemId && missingDateItems.length < MAX_ITEM_DETAIL_FETCHES) {
        missingDateItems.push({ itemId: it.itemId });
      }

      fxRateUsed = fxRateUsed || rateUsed;
    }

    if (items.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
    await sleep(120);
  }

  // FIX #2: fetch item detail for listings where summary had no creation date
  if (missingDateItems.length > 0) {
    console.log(`  📅 Fetching item detail for ${missingDateItems.length} listings missing date...`);
    for (const { itemId } of missingDateItems) {
      try {
        const detail = await ebayFetchItemDetail({ token, marketplaceId, itemId });
        if (detail) {
          const iso = extractListingStartISO(detail);
          const d = daysSince(iso);
          if (d != null) daysOnMarket.push(d);
        }
      } catch {
        // non-fatal — skip
      }
      await sleep(150);
    }
  }

  const taguchiListing = taguchiTrimmedMean(pricesUSD, TAGUCHI_TRIM_PCT);
  const marketStabilityCV = taguchiCV(pricesUSD, TAGUCHI_TRIM_PCT);
  const avgDaysOnMarket = avg(daysOnMarket);

  console.log(`  📊 ${name} ${marketplaceId}: nListing=${pricesUSD.length}, nDaysOnMarket=${daysOnMarket.length}/${pricesUSD.length}`);

  return {
    avgListing: taguchiListing,
    taguchiListing,
    marketStabilityCV,
    avgDaysOnMarket, // ✅ NEW
    nListing: pricesUSD.length,
    nDaysOnMarket: daysOnMarket.length, // debug/transparency
    currency: "USD",
    originalCurrency: originalCurrency || null,
    fxRateUsed: fxRateUsed || null,
  };
}

// --- data loading ---
function parseWithRecovery(content) {
  // Strip BOM and normalize whitespace
  let clean = content.replace(/^\uFEFF/, "").trim();

  // Attempt 1: direct parse
  try { return JSON.parse(clean); } catch (e1) {
    console.warn(`JSON parsing failed: ${e1.message}`);
    console.warn("Attempting recovery strategies...");

    // Attempt 2: fix trailing commas before ] or }
    try {
      const noTrailing = clean.replace(/,\s*([\]}])/g, "$1");
      const parsed = JSON.parse(noTrailing);
      console.warn(`Recovered by removing trailing commas (${Array.isArray(parsed) ? parsed.length : "ok"} items)`);
      return parsed;
    } catch { /* next */ }

    // Attempt 3: truncated JSON — find last complete object and close array
    const lastBrace = clean.lastIndexOf("}");
    if (lastBrace > 0) {
      for (let pos = lastBrace; pos > 0; pos--) {
        if (clean[pos] === "}") {
          const candidate = clean.substring(0, pos + 1).replace(/,\s*$/, "") + "]";
          try {
            const items = JSON.parse(candidate);
            console.warn(`Recovered ${Array.isArray(items) ? items.length : "some"} items from truncated JSON (cut at pos ${pos})`);
            return items;
          } catch { /* try earlier position */ }
        }
      }
    }

    // Attempt 4: line-by-line object extraction
    try {
      const objRegex = /\{[^{}]*\}/g;
      const matches = clean.match(objRegex) || [];
      const items = matches.map((m) => {
        try { return JSON.parse(m); } catch { return null; }
      }).filter(Boolean);
      if (items.length > 0) {
        console.warn(`Recovered ${items.length} items via line-by-line extraction`);
        return items;
      }
    } catch { /* fall through */ }

    throw new Error(`Cannot parse athletes.json (${e1.message}). File may be corrupted — try re-running the workflow.`);
  }
}

function loadAthletes() {
  if (!fs.existsSync(ATHLETES_PATH)) {
    throw new Error(
      `Missing ${ATHLETES_PATH}. Create data/athletes.json with [{name,sport}, ...] or adjust script.`
    );
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

// --- index computation: average of per-player index levels (base=100) ---
function computeScriptIndex(outData, athletes, sport) {
  let sum = 0;
  let used = 0;
  for (const a of athletes) {
    if (sport !== "All" && a.sport !== sport) continue;
    const rec = outData[a.name];
    const idx = rec?.indexLevel;
    if (idx != null && Number.isFinite(idx) && idx > 0) {
      sum += idx;
      used += 1;
    }
  }
  const average = used > 0 ? sum / used : 0;
  return { average, used };
}

// --- main ---
async function main() {
  const token = await getAppToken();
  const fx = await getFxRatesToUSD();
  let athletes = loadAthletes();

  // ✅ Single-athlete mode: EBAY_ONLY env var (comma-separated names)
  const onlyNames = process.env.EBAY_ONLY;
  if (onlyNames) {
    const wanted = onlyNames.split(",").map((n) => normalizeNameForCompare(n.trim()));
    athletes = athletes.filter((a) => wanted.includes(normalizeNameForCompare(a.name)));
    console.log(`🎯 Single-athlete mode: processing ${athletes.length} athlete(s)`);
  }

  // Load previous indexHistory and basePrices so we can append/reuse
  let prevHistory = [];
  let basePrices = {};  // { playerName: basePrice }
  let prevOut = {};
  try {
    if (fs.existsSync(OUT_PATH)) {
      const prev = JSON.parse(fs.readFileSync(OUT_PATH, "utf8"));
      prevOut = prev;
      if (Array.isArray(prev?._meta?.indexHistory)) {
        prevHistory = prev._meta.indexHistory;
      }
      if (prev?._meta?.basePrices && typeof prev._meta.basePrices === "object") {
        basePrices = prev._meta.basePrices;
      }
    }
  } catch { /* ignore parse errors */ }

  // In single-athlete mode, start from previous data so we don't wipe others
  const out = onlyNames ? { ...prevOut } : {
    _meta: {
      updatedAt: new Date().toISOString(),
      minSampleSize: MIN_EBAY_SAMPLE_SIZE,
      marketplaces: MARKETPLACES,
      categoryId: CATEGORY_ID,
      note:
        "Active listing robust mean (Browse API FIXED_PRICE). No sold data. Prices normalized to USD. Includes market stability CV (sd/mean). Ungraded restricted to Near Mint or Better / Excellent (damaged excluded). Includes avg days-on-market for active listings (listing age).",
      fx: {
        source: "CBSA Exchange Rates API",
        asOf: fx.asOf,
        ratesToUSD: {
          USD: 1,
          CAD: fx.rates?.CAD ?? null,
          EUR: fx.rates?.EUR ?? null,
        },
      },
      manufacturers: "none (all brands accepted)",
      listingStat: { method: "taguchi_winsorized_mean", trimPercent: TAGUCHI_TRIM_PCT },
      stabilityStat: {
        method: "cv",
        formula: "sd/mean",
        sample: "winsorized",
        trimPercent: TAGUCHI_TRIM_PCT,
      },
      ungradedPolicy: {
        allow: ["Near Mint or Better", "Excellent"],
        blocklist: "damaged/low-condition keywords",
      },
      daysOnMarket: {
        meaning: "Average age of ACTIVE listings (not time-to-sell).",
        field: "avgDaysOnMarket",
      },
    },
  };

  // Update timestamp in single-athlete mode too
  if (onlyNames && out._meta) {
    out._meta.updatedAt = new Date().toISOString();
  }

  let errorCount = 0;

  for (let i = 0; i < athletes.length; i++) {
    const { name, sport, searchKeyword } = athletes[i];
    console.log(`[${i + 1}/${athletes.length}] ${name} (${sport || "Unknown"})${searchKeyword ? ` [searchKeyword: ${searchKeyword}]` : ""}`);

    const queryName = searchKeyword || name;

    try {
      let match = null;

      for (const marketplaceId of ["EBAY_CA", "EBAY_US"]) {
        const v = await validatePlayerAthleteMatch({ token, marketplaceId, name: queryName, sport });
        if (v.ok) {
          match = { mode: "player", value: v.aspectValue, validatedOn: marketplaceId };
          break;
        }
      }

      if (!match) {
        for (const marketplaceId of ["EBAY_CA", "EBAY_US"]) {
          const s = await validateSportMatch({ token, marketplaceId, name: queryName, sport });
          if (s.ok) {
            match = { mode: "sport", value: s.sportAspectValue, validatedOn: marketplaceId };
            break;
          }
        }
      }

      if (!match) {
        console.log(`${name}: SKIPPED (no Player/Athlete match AND sport did not match)`);
        continue;
      }

      const rec = {
        match,
        marketplaces: {},
        avg: null,
        n: 0,
        avgListing: null,
        taguchiListing: null,
        marketStabilityCV: null,
        avgDaysOnMarket: null,
        nListing: 0,
        currency: "USD",
      };

      for (const marketplaceId of MARKETPLACES) {
        try {
          const listing = await computeAvgActiveListing({
            token,
            marketplaceId,
            name: queryName,
            sport,
            aspectMode: match.mode,
            aspectValue: match.value,
            fxRates: fx.rates,
          });

          rec.marketplaces[marketplaceId] = {
            aspectMode: match.mode,
            aspectValue: match.value,
            avgListing: listing.avgListing,
            taguchiListing: listing.taguchiListing,
            marketStabilityCV: listing.marketStabilityCV,
            avgDaysOnMarket: listing.avgDaysOnMarket,
            nListing: listing.nListing,
            nDaysOnMarket: listing.nDaysOnMarket,
            currency: listing.currency,
            originalCurrency: listing.originalCurrency,
            fxRateUsed: listing.fxRateUsed,
          };
        } catch (e) {
          console.log(`${name} (${marketplaceId}): ERROR ${e?.message || e}`);
        }
      }

      const ca = rec.marketplaces.EBAY_CA;
      const us = rec.marketplaces.EBAY_US;

      const pick =
        (ca && ca.taguchiListing != null ? ca : null) ||
        (us && us.taguchiListing != null ? us : null) ||
        ca ||
        us;

      rec.taguchiListing = pick?.taguchiListing ?? null;
      rec.avgListing = pick?.avgListing ?? null;
      rec.marketStabilityCV = pick?.marketStabilityCV ?? null;
      rec.avgDaysOnMarket = pick?.avgDaysOnMarket ?? null;
      rec.nListing = pick?.nListing ?? 0;
      rec.currency = "USD";

      rec.avg = rec.avgListing;
      rec.n = rec.nListing;

      // --- Base=100 index per player ---
      const robustPrice = rec.taguchiListing;
      if (robustPrice != null && Number.isFinite(robustPrice) && robustPrice > 0) {
        // Set base price on first observation
        if (!basePrices[name] || !Number.isFinite(basePrices[name]) || basePrices[name] <= 0) {
          basePrices[name] = robustPrice;
        }
        rec.basePriceUSD = basePrices[name];
        rec.indexLevel = 100 * (robustPrice / basePrices[name]);
      } else {
        rec.basePriceUSD = basePrices[name] ?? null;
        rec.indexLevel = null;
      }

      out[name] = rec;
    } catch (e) {
      errorCount++;
      console.error(`[${i + 1}/${athletes.length}] FAILED ${name}: ${e?.message || e}`);
      // On rate-limit (429), wait longer before continuing
      if (String(e?.message || "").includes("429")) {
        console.log("Rate limited — waiting 60s before continuing...");
        await sleep(60_000);
      }
    }

    // Always save progress after each athlete
    fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2));

    await sleep(500);
  }

  if (errorCount > 0) {
    console.warn(`\n⚠️  ${errorCount} athlete(s) failed but data for ${Object.keys(out).length - 1} athletes was saved.`);
  }

  // --- Append today's index snapshot to indexHistory (70/30 raw/graded weighted) ---
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  // Load graded data for weighted index
  const GRADED_PATH = path.join(__dirname, "..", "data", "ebay-graded-avg.json");
  let gradedData = {};
  try {
    if (fs.existsSync(GRADED_PATH)) {
      gradedData = JSON.parse(fs.readFileSync(GRADED_PATH, "utf8"));
    }
  } catch { /* ignore */ }

  const RAW_WEIGHT = 0.7;
  const GRADED_WEIGHT = 0.3;

  // Detect top sports from athletes list (same logic as frontend)
  const sportCounts = new Map();
  for (const a of athletes) {
    const s = a.sport || "Other";
    if (s === "Other") continue;
    sportCounts.set(s, (sportCounts.get(s) || 0) + 1);
  }
  const topSports = [...sportCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([s]) => s);

  // Persist basePrices in _meta
  out._meta.basePrices = basePrices;

  // Weighted index: blend raw indexLevel with graded indexLevel (70/30)
  function computeWeightedIndex(rawData, gradedData, athletes, sport) {
    let sum = 0;
    let used = 0;
    for (const a of athletes) {
      if (sport !== "All" && a.sport !== sport) continue;
      const rawRec = rawData[a.name];
      const gradedRec = gradedData[a.name];
      const rawIdx = rawRec?.indexLevel;
      const gradedIdx = gradedRec?.indexLevel;
      const hasRaw = rawIdx != null && Number.isFinite(rawIdx) && rawIdx > 0;
      const hasGraded = gradedIdx != null && Number.isFinite(gradedIdx) && gradedIdx > 0;

      if (hasRaw && hasGraded) {
        sum += rawIdx * RAW_WEIGHT + gradedIdx * GRADED_WEIGHT;
        used += 1;
      } else if (hasRaw) {
        sum += rawIdx;
        used += 1;
      } else if (hasGraded) {
        sum += gradedIdx;
        used += 1;
      }
    }
    const average = used > 0 ? sum / used : 0;
    return { average, used };
  }

  const snapshot = { date: today };
  for (const sport of topSports) {
    const idx = computeWeightedIndex(out, gradedData, athletes, sport);
    snapshot[sport] = parseFloat(idx.average.toFixed(1));
  }
  const allIdx = computeWeightedIndex(out, gradedData, athletes, "All");
  snapshot.All = parseFloat(allIdx.average.toFixed(1));

  // Dedupe: replace existing entry for today, keep last 90 days
  const history = prevHistory.filter((h) => h.date !== today);
  history.push(snapshot);
  // Keep only last 90 entries
  while (history.length > 90) history.shift();

  out._meta.indexHistory = history;

  console.log(`Index snapshot for ${today}:`, JSON.stringify(snapshot));

  // --- Append to standalone index-history.json (permanent archive, no cap) ---
  const HISTORY_PATH = path.join(__dirname, "..", "data", "index-history.json");
  let fullHistory = [];
  try {
    if (fs.existsSync(HISTORY_PATH)) {
      const parsed = JSON.parse(fs.readFileSync(HISTORY_PATH, "utf8"));
      if (Array.isArray(parsed)) fullHistory = parsed;
    }
  } catch { /* ignore */ }
  // Dedupe by date, then append
  fullHistory = fullHistory.filter((h) => h.date !== today);
  fullHistory.push(snapshot);
  fullHistory.sort((a, b) => a.date.localeCompare(b.date));
  fs.writeFileSync(HISTORY_PATH, JSON.stringify(fullHistory, null, 2));
  console.log(`Appended to ${HISTORY_PATH} (${fullHistory.length} total entries)`);

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2));
  console.log(`Wrote ${OUT_PATH}`);
}

main().catch((err) => {
  console.error("Fatal error in main():", err);
  // Still try to exit 0 so the workflow commits whatever data was saved
  process.exit(0);
});
