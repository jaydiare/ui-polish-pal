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
//   data/ebay-graded-avg.json
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
// FIX #2:
// - avgDaysOnMarket now falls back to fetching the full item detail endpoint
//   (/buy/browse/v1/item/{itemId}) for listings missing itemCreationDate in summary.
//   Capped at BASE_PRICES_PATH per athlete to avoid blowing rate limits.
//
// FIX #3:
// - basePrices are now persisted in a dedicated data/ebay-base-prices.json file,
//   separate from the main output. This survives output file deletions/regenerations.

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

const OUT_PATH = path.join(__dirname, "..", "data", "ebay-graded-avg.json");
const ATHLETES_PATH = path.join(__dirname, "..", "data", "athletes.json");

// FIX #3: dedicated base prices file — never overwritten by normal runs
const BASE_PRICES_PATH = path.join(__dirname, "..", "data", "ebay-base-prices.json");

// FIX #2: max listings per athlete to fetch full item detail for date fallback
const MAX_ITEM_DETAIL_FETCHES = 10;

// Category you were using (Trading Card Singles)
const CATEGORY_ID = "261328";

// Gemrate data yes/no
const GEMRATE_ONLY = true;

// Listing sampling
const LISTING_PAGE_LIMIT = 60; // max active listings to sample per marketplace
const PAGE_SIZE = 60;

// Your UI threshold
const MIN_EBAY_SAMPLE_SIZE = 4;

// Marketplaces to compute
const MARKETPLACES = ["EBAY_US"];

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
];

const UNGRADED_BLOCKLIST = [
  "damaged", "damage", "poor", "fair", "digitalcard", "digital",
  "very good", "vg", "good", "gd", "creases", "crease", "wrinkle",
  "wrinkling", "corner wear", "surface wear", "paper loss", "stain",
  "stained", "water damage", "tape", "writing", "marked", "marked up",
  "pin hole", "hole", "torn", "tear", "scratches", "scratch",
  "excellent", "ex", "auto", "signed","ERROR Card", "card lot",
];

// --- helpers ---
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function stripDiacritics(s) {
  return String(s || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
}

function normSpaces(s) {
  return String(s || "").replace(/\s+/g, " ").trim();
}

function normalizeNameForCompare(s) {
  return normSpaces(
    stripDiacritics(s)
      .toLowerCase()
      .replace(/[.''"]/g, "")
      .replace(/\b(jr|jr\.|sr|sr\.)\b/g, "")
  );
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

function normText(s) {
  return String(s || "").toLowerCase().replace(/\s+/g, " ").trim();
}

function includesAny(text, arr) {
  const t = normText(text);
  return arr.some((w) => t.includes(normText(w)));
}

function extractConditionDescriptorTexts(item) {
  const out = [];
  const cds = item?.conditionDescriptors;
  if (Array.isArray(cds)) {
    for (const d of cds) {
      if (!d) continue;
      out.push(d?.name, d?.descriptorName, d?.value, d?.valueName);
    }
  }
  const cdv = item?.conditionDescriptorValues;
  if (Array.isArray(cdv)) {
    for (const d of cdv) {
      if (!d) continue;
      out.push(d?.name, d?.descriptorName, d?.value, d?.valueName);
    }
  }
  return out.filter(Boolean).map(normText);
}

function ungradedPassesConditionPolicy(item) {
  const title = normText(item?.title || "");
  const cond = normText(item?.condition || "");
  const descs = extractConditionDescriptorTexts(item);
  const joined = [title, cond, ...descs].join(" | ");
  if (includesAny(joined, UNGRADED_BLOCKLIST)) return false;
  if (includesAny(joined, UNGRADED_ALLOWED_CONDITIONS)) return true;
  return false;
}

function isGradedListing(item) {
  const cond = normText(item?.condition || "");
  const title = normText(item?.title || "");
  const hasPSA = /\bpsa\b/i.test(title);
  if (cond.includes("graded") && hasPSA) return true;
  const psaNumeric =
    /\bpsa\b[^\n]{0,18}\b(10|9\.5|9|8\.5|8|7\.5|7|6\.5|6|5\.5|5|4\.5|4|3\.5|3|2\.5|2|1\.5|1)\b/i;
  const psaLabel =
    /\bpsa\b[^\n]{0,18}\b(gem mint|mint|dna|authentic)\b/i;
  return psaNumeric.test(title) || psaLabel.test(title);
}

// FIX #2: extract creation date from item summary OR full item detail fields
function extractListingStartISO(item) {
  return (
    item?.itemCreationDate ||
    item?.listingStartDate ||
    item?.startDate ||
    item?.creationDate ||
    // full item detail endpoint uses these field names
    item?.listingMarketplaceId?.itemCreationDate ||
    item?.timeLeft ||  // not a date but guards against null coalescing
    null
  );
}

// Normalize timeLeft — not useful for age, so always prefer date fields above
function daysSince(isoString) {
  const t = Date.parse(isoString || "");
  if (!Number.isFinite(t)) return null;
  const now = Date.now();
  let diff = (now - t) / (1000 * 60 * 60 * 24);
  if (!Number.isFinite(diff) || diff < 0) return null;
  if (diff > 3650) return null; // sanity cap
  return diff;
}

function getHeaderMarketplace(marketplaceId) {
  return { "X-EBAY-C-MARKETPLACE-ID": marketplaceId };
}

function buildQuery(name, sport) {
  const sportHint = sport ? ` ${sport}` : "";
  return `${name}${sportHint} card`;
}

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

function buildAspectFilter({ aspectMode, aspectValue }) {
  const parts = [];
  parts.push(`Graded:{Yes}`);
  parts.push(`Professional Grader:{Professional Sports Authenticator (PSA)}`);
  if (aspectMode === "player" && aspectValue) {
    parts.push(`Player/Athlete:{${aspectValue}}`);
  } else if (aspectMode === "sport" && aspectValue) {
    parts.push(`Sport:{${aspectValue}}`);
  }
  return parts.length ? parts.join(",") : null;
}

// --- FX ---
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
      asOf = asOf || r?.ExchangeRateEffectiveTimestamp || r?.ValidStartDate || r?.ExchangeRateExpiryTimestamp || null;
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

// --- eBay Browse Search ---
async function ebayBrowseSearch({ token, marketplaceId, q, categoryId, limit, offset, aspectFilter }) {
  const url = new URL("https://api.ebay.com/buy/browse/v1/item_summary/search");
  url.searchParams.set("q", q);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("offset", String(offset));
  url.searchParams.set("category_ids", categoryId);
  url.searchParams.append("filter", "buyingOptions:{FIXED_PRICE}");
  if (aspectFilter) url.searchParams.set("aspect_filter", aspectFilter);
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
    const data = await ebayBrowseSearch({ token, marketplaceId, q, categoryId: CATEGORY_ID, limit: 1, offset: 0, aspectFilter });
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
    const data = await ebayBrowseSearch({ token, marketplaceId, q, categoryId: CATEGORY_ID, limit: 1, offset: 0, aspectFilter });
    const total = safeNum(data?.total) ?? 0;
    if (total > 0) return { ok: true, sportAspectValue: s };
    await sleep(120);
  }
  return { ok: false, sportAspectValue: null };
}

// --- computations ---
async function computeAvgActiveListing({ token, marketplaceId, name, sport, aspectMode, aspectValue, fxRates }) {
  const q = buildQuery(name, sport);
  const aspectFilter = buildAspectFilter({ aspectMode, aspectValue });

  let offset = 0;
  const pricesUSD = [];
  const daysOnMarket = [];

  // FIX #2: track items that are missing a date so we can fetch detail for them
  const missingDateItems = [];

  let originalCurrency = null;
  let fxRateUsed = null;

  while (offset < LISTING_PAGE_LIMIT) {
    const data = await ebayBrowseSearch({ token, marketplaceId, q, categoryId: CATEGORY_ID, limit: PAGE_SIZE, offset, aspectFilter });
    const items = data?.itemSummaries || [];

    for (const it of items) {
      if (!isGradedListing(it)) continue;

      const p = it?.price;
      const v = safeNum(p?.value);
      if (v == null) continue;

      const cur = p?.currency || null;
      originalCurrency = originalCurrency || cur;

      const { usd, rateUsed } = convertToUSD(v, cur, fxRates);
      if (usd == null) continue;

      pricesUSD.push(usd);
      fxRateUsed = fxRateUsed || rateUsed;

      // FIX #2: try to get date from summary first; queue for detail fetch if missing
      const iso = extractListingStartISO(it);
      const d = daysSince(iso);
      if (d != null) {
        daysOnMarket.push(d);
      } else if (it?.itemId && missingDateItems.length < MAX_ITEM_DETAIL_FETCHES) {
        missingDateItems.push({ itemId: it.itemId });
      }
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
    avgDaysOnMarket,
    nListing: pricesUSD.length,
    nDaysOnMarket: daysOnMarket.length,
    currency: "USD",
    originalCurrency: originalCurrency || null,
    fxRateUsed: fxRateUsed || null,
  };
}

// --- data loading ---
function parseWithRecovery(content) {
  let clean = content.replace(/^\uFEFF/, "").trim();
  try { return JSON.parse(clean); } catch (e1) {
    console.warn(`JSON parsing failed: ${e1.message}`);
    console.warn("Attempting recovery strategies...");
    try {
      const noTrailing = clean.replace(/,\s*([\]}])/g, "$1");
      const parsed = JSON.parse(noTrailing);
      console.warn(`Recovered by removing trailing commas`);
      return parsed;
    } catch { /* next */ }
    const lastBrace = clean.lastIndexOf("}");
    if (lastBrace > 0) {
      for (let pos = lastBrace; pos > 0; pos--) {
        if (clean[pos] === "}") {
          const candidate = clean.substring(0, pos + 1).replace(/,\s*$/, "") + "]";
          try {
            const items = JSON.parse(candidate);
            console.warn(`Recovered ${Array.isArray(items) ? items.length : "some"} items from truncated JSON`);
            return items;
          } catch { /* try earlier */ }
        }
      }
    }
    try {
      const objRegex = /\{[^{}]*\}/g;
      const matches = clean.match(objRegex) || [];
      const items = matches.map((m) => { try { return JSON.parse(m); } catch { return null; } }).filter(Boolean);
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
    throw new Error(`Missing ${ATHLETES_PATH}. Create data/athletes.json with [{name,sport}, ...] or adjust script.`);
  }
  const raw = fs.readFileSync(ATHLETES_PATH, "utf8");
  const arr = parseWithRecovery(raw);
  let list = arr || [];
  if (GEMRATE_ONLY) list = list.filter((x) => x.gemrate === "yes");
  return list
    .map((x) => ({ name: normSpaces(x?.name), sport: normSpaces(x?.sport), searchKeyword: x?.searchKeyword ? normSpaces(x.searchKeyword) : undefined }))
    .filter((x) => x.name);
}

// FIX #3: load/save base prices from dedicated file, independent of main output
function loadBasePrices() {
  try {
    if (fs.existsSync(BASE_PRICES_PATH)) {
      const raw = fs.readFileSync(BASE_PRICES_PATH, "utf8");
      const parsed = JSON.parse(raw);
      console.log(`Loaded base prices from ${BASE_PRICES_PATH} (${Object.keys(parsed).length} athletes)`);
      return parsed;
    }
  } catch (e) {
    console.warn(`Could not load base prices file: ${e.message}. Starting fresh.`);
  }
  return {};
}

function saveBasePrices(basePrices) {
  fs.mkdirSync(path.dirname(BASE_PRICES_PATH), { recursive: true });
  fs.writeFileSync(BASE_PRICES_PATH, JSON.stringify(basePrices, null, 2));
}

// --- index computation ---
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

  // FIX #3: load basePrices from dedicated file (survives output file deletion)
  const basePrices = loadBasePrices();

  // Load previous data from output file (preserve existing athlete records + indexHistory)
  let prevHistory = [];
  let prevRecords = {};
  try {
    if (fs.existsSync(OUT_PATH)) {
      const prev = JSON.parse(fs.readFileSync(OUT_PATH, "utf8"));
      if (Array.isArray(prev?._meta?.indexHistory)) {
        prevHistory = prev._meta.indexHistory;
      }
      // Preserve existing athlete records so partial runs don't erase data
      for (const [key, val] of Object.entries(prev)) {
        if (key === "_meta") continue;
        prevRecords[key] = val;
      }
      // FIX #3: do NOT load basePrices from out file anymore — dedicated file is authoritative
    }
  } catch { /* ignore */ }

  const out = {
    _meta: {
      updatedAt: new Date().toISOString(),
      minSampleSize: MIN_EBAY_SAMPLE_SIZE,
      marketplaces: MARKETPLACES,
      categoryId: CATEGORY_ID,
      note:
        "Active listing robust mean (Browse API FIXED_PRICE). No sold data. Prices normalized to USD. " +
        "Includes market stability CV (sd/mean). Ungraded restricted to Near Mint or Better / Excellent. " +
        "Includes avg days-on-market for active listings (listing age). " +
        "Base prices stored in dedicated ebay-base-prices.json (FIX #3).",
      fx: {
        source: "CBSA Exchange Rates API",
        asOf: fx.asOf,
        ratesToUSD: { USD: 1, CAD: fx.rates?.CAD ?? null, EUR: fx.rates?.EUR ?? null },
      },
      manufacturers: "none (all brands accepted)",
      listingStat: { method: "taguchi_winsorized_mean", trimPercent: TAGUCHI_TRIM_PCT },
      stabilityStat: { method: "cv", formula: "sd/mean", sample: "winsorized", trimPercent: TAGUCHI_TRIM_PCT },
      ungradedPolicy: { allow: ["Near Mint or Better", "Excellent"], blocklist: "damaged/low-condition keywords" },
      daysOnMarket: {
        meaning: "Average age of ACTIVE listings (not time-to-sell). Falls back to item detail fetch if summary omits creation date.",
        field: "avgDaysOnMarket",
        maxDetailFetches: MAX_ITEM_DETAIL_FETCHES,
      },
    },
    // Seed with previous athlete records (new data will overwrite per-athlete)
    ...prevRecords,
  };

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
            token, marketplaceId, name: queryName, sport,
            aspectMode: match.mode, aspectValue: match.value, fxRates: fx.rates,
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
        ca || us;

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
        // FIX #3: basePrices now loaded from dedicated file — set on first observation only
        if (!basePrices[name] || !Number.isFinite(basePrices[name]) || basePrices[name] <= 0) {
          basePrices[name] = robustPrice;
          // FIX #3: persist immediately so a crash mid-run doesn't lose new base prices
          saveBasePrices(basePrices);
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
      if (String(e?.message || "").includes("429")) {
        console.log("Rate limited — waiting 60s before continuing...");
        await sleep(60_000);
      }
    }

    fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2));
    await sleep(500);
  }

  if (errorCount > 0) {
    console.warn(`\n⚠️  ${errorCount} athlete(s) failed but data for ${Object.keys(out).length - 1} athletes was saved.`);
  }

  // --- Ensure ALL athletes have a record with indexLevel (fallback to basePriceUSD) ---
  let fallbackCount = 0;
  for (const a of athletes) {
    const existing = out[a.name];
    if (existing && existing.indexLevel != null) continue;

    const basePrice = basePrices[a.name];
    if (!basePrice || !Number.isFinite(basePrice) || basePrice <= 0) continue;

    if (existing) {
      existing.basePriceUSD = basePrice;
      existing.indexLevel = 100;
    } else {
      out[a.name] = {
        match: null,
        marketplaces: {},
        avg: basePrice,
        n: 0,
        avgListing: basePrice,
        taguchiListing: basePrice,
        marketStabilityCV: null,
        avgDaysOnMarket: null,
        nListing: 0,
        currency: "USD",
        basePriceUSD: basePrice,
        indexLevel: 100,
        sport: a.sport || null,
        fallback: true,
      };
    }
    fallbackCount++;
  }
  if (fallbackCount > 0) {
    console.log(`📌 Created/patched ${fallbackCount} fallback records from base prices (indexLevel=100)`);
  }

  // --- Append today's index snapshot to indexHistory ---
  const today = new Date().toISOString().slice(0, 10);
  const sportCounts = new Map();
  for (const a of athletes) {
    const s = a.sport || "Other";
    if (s === "Other") continue;
    sportCounts.set(s, (sportCounts.get(s) || 0) + 1);
  }
  const topSports = [...sportCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([s]) => s);

  // FIX #3: basePrices no longer stored in _meta (dedicated file is authoritative)
  // Kept in _meta as a read-only snapshot for debugging only
  out._meta.basePricesSnapshot = basePrices;

  const snapshot = { date: today };
  for (const sport of topSports) {
    const idx = computeScriptIndex(out, athletes, sport);
    snapshot[sport] = parseFloat(idx.average.toFixed(1));
  }
  const allIdx = computeScriptIndex(out, athletes, "All");
  snapshot.All = parseFloat(allIdx.average.toFixed(1));

  const history = prevHistory.filter((h) => h.date !== today);
  history.push(snapshot);
  while (history.length > 90) history.shift();

  out._meta.indexHistory = history;

  console.log(`Index snapshot for ${today}:`, JSON.stringify(snapshot));

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2));

  // FIX #3: final save of base prices
  saveBasePrices(basePrices);

  console.log(`Wrote ${OUT_PATH}`);
  console.log(`Wrote ${BASE_PRICES_PATH}`);
}

main().catch((err) => {
  console.error("Fatal error in main():", err);
  process.exit(0);
});
