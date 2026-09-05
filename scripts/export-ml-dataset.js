#!/usr/bin/env node
// scripts/export-ml-dataset.js
//
// Flattens data/athlete-history.json (daily panel time series) into a
// long-format ML-ready CSV: one row per athlete per day, joined with
// static/slow features (sport, league, grading populations, SCP prices)
// and derived rolling features (7d/30d price change, return volatility).

import { readFileSync, writeFileSync } from "fs";
import { gzipSync } from "zlib";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "data");

function loadJson(file) {
  try { return JSON.parse(readFileSync(join(DATA_DIR, file), "utf-8")); } catch { return null; }
}

const normKey = (s) =>
  String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[.\-']/g, "").replace(/\s+/g, " ").toLowerCase().trim();

// ---------- Load sources ----------
const athletes = loadJson("athletes.json") || [];
const history = loadJson("athlete-history.json") || {};
const gemrate = loadJson("gemrate.json");
const gemrateBeckett = loadJson("gemrate_beckett.json");
const gemrateSgc = loadJson("gemrate_sgc.json");
const scpPrices = loadJson("scp-prices.json");

// ---------- Static feature maps (accent-insensitive) ----------
const metaMap = {}; // normKey -> { sport, league }
for (const a of athletes) {
  metaMap[normKey(a.name)] = { sport: a.sport || "", league: a.league || "" };
}

function buildPopMap(file, graderKey) {
  const map = {};
  if (file?.athletes) {
    for (const [name, data] of Object.entries(file.athletes)) {
      const pop = data?.graders?.[graderKey]?.grades ?? data?.totals?.grades;
      if (pop != null && Number.isFinite(pop) && pop > 0) map[normKey(name)] = pop;
    }
  }
  return map;
}
const psaPopMap = buildPopMap(gemrate, "PSA");
const bgsPopMap = buildPopMap(gemrateBeckett, "beckett");
const sgcPopMap = buildPopMap(gemrateSgc, "SGC");

const scpMap = {};
if (scpPrices?.athletes) {
  for (const a of scpPrices.athletes) {
    scpMap[normKey(a.name)] = {
      scpRaw: a.scpRawPrice ?? null,
      scpGraded: a.scpGradedPrice ?? null,
    };
  }
}

// ---------- CSV helpers ----------
const HEADERS = [
  "date", "name", "sport", "league",
  "raw_price", "raw_cv", "raw_n_listings", "raw_index", "raw_obs_days",
  "graded_price", "graded_cv", "graded_n_listings", "graded_index",
  "days_on_market",
  "psa_pop", "bgs_pop", "sgc_pop",
  "scp_raw_price", "scp_graded_price",
  "days_since_first_seen",
  "raw_price_chg_7d_pct", "raw_price_chg_30d_pct", "raw_return_vol_7d",
];

function csvCell(v) {
  if (v == null || v === "" || (typeof v === "number" && !Number.isFinite(v))) return "";
  if (typeof v === "number") return String(Math.round(v * 10000) / 10000);
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const num = (v) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : null);
const numOrZero = (v) => (Number.isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : null);

function pctChange(cur, prev) {
  if (cur == null || prev == null || prev <= 0) return null;
  return ((cur - prev) / prev) * 100;
}

function rollingVolatility(returns) {
  if (returns.length < 2) return null;
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, r) => a + (r - mean) ** 2, 0) / (returns.length - 1);
  return Math.sqrt(variance) * 100; // % units
}

// ---------- Build rows ----------
const lines = [HEADERS.join(",")];
let rowCount = 0;

for (const [name, entries] of Object.entries(history)) {
  if (!Array.isArray(entries) || entries.length === 0) continue;
  const key = normKey(name);
  const meta = metaMap[key] || { sport: entries.find((e) => e?.sport)?.sport || "", league: "" };
  const scp = scpMap[key] || {};
  const psaPop = psaPopMap[key] ?? null;
  const bgsPop = bgsPopMap[key] ?? null;
  const sgcPop = sgcPopMap[key] ?? null;

  const firstDate = entries[0]?.date ? new Date(entries[0].date) : null;

  // Pre-compute daily raw returns for rolling volatility
  const rawPrices = entries.map((e) => num(e?.raw?.price));
  const dailyReturns = rawPrices.map((p, i) =>
    i === 0 || p == null || rawPrices[i - 1] == null ? null : (p - rawPrices[i - 1]) / rawPrices[i - 1]
  );

  entries.forEach((e, i) => {
    if (!e?.date) return;
    const raw = e.raw || {};
    const graded = e.graded || {};

    const rawPrice = rawPrices[i];
    const dom = num(raw.days) ?? num(graded.days);
    const daysSinceFirst = firstDate
      ? Math.round((new Date(e.date) - firstDate) / 86400000)
      : null;

    const chg7 = i >= 7 ? pctChange(rawPrice, rawPrices[i - 7]) : null;
    const chg30 = i >= 30 ? pctChange(rawPrice, rawPrices[i - 30]) : null;
    const vol7 = i >= 7
      ? rollingVolatility(dailyReturns.slice(Math.max(1, i - 6), i + 1).filter((r) => r != null))
      : null;

    lines.push([
      e.date, name, meta.sport, meta.league,
      rawPrice, numOrZero(raw.cv), numOrZero(raw.n) ?? 0, num(raw.idx), num(raw.obsDays),
      num(graded.price), numOrZero(graded.cv), numOrZero(graded.n), num(graded.idx),
      dom,
      psaPop, bgsPop, sgcPop,
      num(scp.scpRaw), num(scp.scpGraded),
      daysSinceFirst,
      chg7, chg30, vol7,
    ].map(csvCell).join(","));
    rowCount++;
  });
}

const csv = lines.join("\n") + "\n";
writeFileSync(join(DATA_DIR, "ml-dataset.csv"), csv);
writeFileSync(join(DATA_DIR, "ml-dataset.csv.gz"), gzipSync(csv));

console.log(`✅ Wrote ${rowCount} rows (${Object.keys(history).length} athletes) to data/ml-dataset.csv`);
