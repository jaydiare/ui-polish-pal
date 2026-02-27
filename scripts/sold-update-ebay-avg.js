// scripts/sold-update-ebay-avg.js
// Node 20+ (uses global fetch)
//
// Pulls SOLD listing comps via Apify actor caffein.dev/ebay-sold-listings
// Applies the same robust statistical pipeline as update-ebay-avg.js:
//   - Taguchi winsorized mean (not just median)
//   - Market stability CV (sd/mean on winsorized sample)
//   - Ungraded condition policy (Near Mint or Better / Excellent only)
//   - Manufacturer/brand filter (Topps, Panini, Upper Deck, etc.)
//   - Junk title exclusion (lots, breaks, you pick, etc.)
//   - Currency normalization to USD via CBSA Exchange Rates API
//
// Env:
//   APIFY_TOKEN
//
// Input:
//   data/athletes.json: [{ name, sport, ... }]
//
// Output:
//   data/ebay-sold-avg.json

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const APIFY_TOKEN = process.env.APIFY_TOKEN;
if (!APIFY_TOKEN) {
  console.error("Missing APIFY_TOKEN in env.");
  process.exit(1);
}

const ATHLETES_PATH = path.join(__dirname, "..", "data", "athletes.json");
const OUT_PATH = path.join(__dirname, "..", "data", "ebay-sold-avg.json");

// Apify actor
const ACTOR_ID = "caffein.dev~ebay-sold-listings";

// Sampling
const RESULTS_LIMIT = 60;
const MIN_SAMPLE_SIZE = 4;

// Taguchi caps (winsorization %)
const TAGUCHI_TRIM_PCT = 0.4;

// Allowed brands (same as update-ebay-avg.js manufacturers)
const BRANDS = [
  "topps", "panini", "upper deck", "leaf",
  "artesania sport", "ovenca venezuelan", "sport grafico",
  "line up", "venezuelan league", "byn",
];

// --------------------
// Ungraded condition policy (mirrors update-ebay-avg.js)
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

const UNGRADED_BLOCKLIST = [
  "damaged", "damage", "poor", "fair", "very good", "vg",
  "good", "gd", "creases", "crease", "wrinkle", "wrinkling",
  "corner wear", "surface wear", "paper loss", "stain", "stained",
  "water damage", "tape", "writing", "marked", "marked up",
  "pin hole", "hole", "torn", "tear", "scratches", "scratch",
];

// Junk title exclusion (from your reference script)
const JUNK_PHRASES = [
  "you pick", "you choose", "pick your", "choose your",
  "your choice", "complete your set", "complete set",
  "set builder", "set break", "base singles", "insert singles",
  "singles you pick", "you pick!", "you pick -",
  "lot", "team lot", "player lot", "break", "case break",
  "random", "bulk", "paper rc's & vets", "rc's & vets",
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

// --- condition policy ---
function normText(s) {
  return String(s || "").toLowerCase().replace(/\s+/g, " ").trim();
}

function includesAny(text, arr) {
  const t = normText(text);
  return arr.some((w) => t.includes(normText(w)));
}

function isGradedListing(item) {
  const title = norm(item?.title || "");
  if (norm(item?.condition || "").includes("graded")) return true;
  const graderHints = ["psa", "bgs", "sgc", "cgc", "beckett", "gem mint", "gm mt", "9.5", "10"];
  return graderHints.some((k) => title.includes(k));
}

function ungradedPassesConditionPolicy(item) {
  const title = normText(item?.title || "");
  const cond = normText(item?.condition || "");
  const joined = [title, cond].join(" | ");

  if (includesAny(joined, UNGRADED_BLOCKLIST)) return false;
  if (includesAny(joined, UNGRADED_ALLOWED_CONDITIONS)) return true;

  // Sold listings often lack condition detail — be permissive for sold comps
  // (unlike active listings where we're strict)
  return true;
}

// --- junk / brand / relevance filters ---
function isJunkSoldCompTitle(title) {
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

// Prefer totalPrice if present, else sold+shipping, else sold
function getTotalPrice(item) {
  const soldCur = item?.soldCurrency || item?.shippingCurrency || null;

  const total = safeNum(item?.totalPrice);
  if (total != null && total > 0) return { amount: total, currency: soldCur, mode: "totalPrice" };

  const sold = safeNum(item?.soldPrice);
  const ship = safeNum(item?.shippingPrice);
  if (sold != null && sold > 0 && ship != null && ship >= 0) {
    return { amount: sold + ship, currency: soldCur, mode: "sold+shipping" };
  }
  if (sold != null && sold > 0) return { amount: sold, currency: soldCur, mode: "soldOnly" };

  return { amount: null, currency: null, mode: null };
}

// --- Apify call ---
async function runApifyActorAndGetItems(input) {
  const url =
    `https://api.apify.com/v2/acts/${encodeURIComponent(ACTOR_ID)}` +
    `/run-sync-get-dataset-items?token=${encodeURIComponent(APIFY_TOKEN)}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Apify actor failed (${res.status}): ${txt}`);
  }

  return res.json();
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
      source: "Apify Actor caffein.dev/ebay-sold-listings",
      note:
        "SOLD comps. Brand-filtered (Topps/Panini/Upper Deck/etc). Junk titles removed. " +
        "Taguchi winsorized mean + market stability CV. Ungraded condition policy (permissive for sold). " +
        "Currency normalized to USD via CBSA.",
      resultsLimit: RESULTS_LIMIT,
      minSampleSize: MIN_SAMPLE_SIZE,
      brands: BRANDS,
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
        note: "Permissive for sold comps (unknown condition accepted)",
      },
      fx: { source: "CBSA Exchange Rates API", asOf: fx.asOf },
    },
  };

  for (let i = 0; i < athletes.length; i++) {
    const { name, sport } = athletes[i];
    console.log(`[${i + 1}/${athletes.length}] ${name} (${sport || "Unknown"})`);

    const keyword = buildKeyword(name, sport);

    const input = {
      keyword,
      maxItems: RESULTS_LIMIT,
      limit: RESULTS_LIMIT,
    };

    try {
      const items = await runApifyActorAndGetItems(input);

      const pricesUSD = [];
      let firstCur = null;
      let fxRateUsed = null;

      for (const it of items || []) {
        const title = it?.title || "";
        if (!title) continue;

        // 1) Brand filter
        if (!hasAllowedBrand(title)) continue;

        // 2) Junk title filter
        if (isJunkSoldCompTitle(title)) continue;

        // 3) Player relevance (last name)
        if (!titleLooksRelevantToPlayer(title, name)) continue;

        // 4) Ungraded condition policy
        const graded = isGradedListing(it);
        if (!graded) {
          if (!ungradedPassesConditionPolicy(it)) continue;
        }

        // 5) Price extraction
        const { amount, currency } = getTotalPrice(it);
        if (amount == null) continue;

        firstCur = firstCur || currency || null;

        const { usd, rateUsed } = convertToUSD(amount, currency, fx.rates);
        if (usd == null) continue;

        pricesUSD.push(usd);
        fxRateUsed = fxRateUsed || rateUsed;
      }

      const hasSample = pricesUSD.length >= MIN_SAMPLE_SIZE;

      const taguchiSold = taguchiTrimmedMean(pricesUSD, TAGUCHI_TRIM_PCT);
      const medianSold = median(pricesUSD);
      const marketStabilityCV = taguchiCV(pricesUSD, TAGUCHI_TRIM_PCT);

      out[name] = {
        keyword,
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
      console.log(`${name}: ERROR ${e?.message || e}`);
      out[name] = {
        keyword,
        nSoldUsed: 0,
        avg: null,
        taguchiSold: null,
        medianSold: null,
        marketStabilityCV: null,
        currency: "USD",
        error: String(e?.message || e),
      };
    }

    // Progressive save (like update-ebay-avg.js)
    fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2));

    await sleep(300);
  }

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2));
  console.log(`Wrote ${OUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
