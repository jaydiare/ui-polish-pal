#!/usr/bin/env node
// scripts/snapshot-market-data.js
//
// Weekly backup: reads all market data sources and produces a single
// vzla-athlete-market-data.json with the same columns as BlogDataTable.

import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "data");
const PUBLIC_DIR = join(__dirname, "..", "public", "data");

function loadJson(path) {
  try { return JSON.parse(readFileSync(path, "utf-8")); } catch { return null; }
}

const normKey = (s) =>
  String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[.\-']/g, "").replace(/\s+/g, " ").toLowerCase().trim();

// Load data sources
const athletes = loadJson(join(DATA_DIR, "athletes.json")) || [];
const ebayAvg = loadJson(join(DATA_DIR, "ebay-avg.json")) || {};
const ebayGradedAvg = loadJson(join(DATA_DIR, "ebay-graded-avg.json")) || {};
const ebaySoldAvg = loadJson(join(DATA_DIR, "ebay-sold-avg.json")) || {};
const ebayGradedSoldAvg = loadJson(join(DATA_DIR, "ebay-graded-sold-avg.json")) || {};
const athleteHistory = loadJson(join(DATA_DIR, "athlete-history.json")) || {};
const gemrate = loadJson(join(DATA_DIR, "gemrate.json"));
const gemrateBeckett = loadJson(join(DATA_DIR, "gemrate_beckett.json"));
const scpPricesData = loadJson(join(DATA_DIR, "scp-prices.json"));

// Build gemrate pop map
const gemratePopMap = {};
if (gemrate?.athletes) {
  for (const [name, data] of Object.entries(gemrate.athletes)) {
    const pop = data?.graders?.PSA?.grades ?? data?.totals?.grades;
    if (pop != null && Number.isFinite(pop) && pop > 0) {
      gemratePopMap[name] = pop;
      const norm = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (norm !== name) gemratePopMap[norm] = pop;
    }
  }
}

// Build beckett pop map
const beckettPopMap = {};
if (gemrateBeckett?.athletes) {
  for (const [name, data] of Object.entries(gemrateBeckett.athletes)) {
    const pop = data?.graders?.beckett?.grades ?? data?.totals?.grades;
    if (pop != null && Number.isFinite(pop) && pop > 0) {
      beckettPopMap[name] = pop;
      const norm = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (norm !== name) beckettPopMap[norm] = pop;
    }
  }
}

// Lookup helpers
function findRecord(name, sport, data) {
  if (!data || typeof data !== "object") return null;
  // Try exact name
  if (data[name]) return data[name];
  // Try "Name | Sport"
  const keyed = `${name} | ${sport}`;
  if (data[keyed]) return data[keyed];
  // Normalized search
  const norm = normKey(name);
  for (const k of Object.keys(data)) {
    if (k === "_meta") continue;
    if (normKey(k) === norm) return data[k];
  }
  return null;
}

function getPrice(rec) {
  if (!rec) return null;
  const v = Number(rec.avgListing ?? rec.taguchiListing ?? rec.trimmedListing ?? rec.avg ?? rec.average);
  return Number.isFinite(v) && v > 0 ? Math.round(v * 100) / 100 : null;
}

function getSoldPrice(rec) {
  if (!rec) return null;
  const v = Number(rec.taguchiSold ?? rec.avg);
  return Number.isFinite(v) && v > 0 ? Math.round(v * 100) / 100 : null;
}

function getCV(rec) {
  if (!rec) return null;
  const cv = Number(rec.marketStabilityCV ?? rec.cv);
  return Number.isFinite(cv) && cv >= 0 ? Math.round(cv * 10000) / 10000 : null;
}

function getSignalSN(cv) {
  if (cv == null || cv < 0.01) return null;
  const sn = 10 * Math.log10(1 / (cv * cv));
  return Math.min(Math.round(sn * 100) / 100, 40);
}

// Build SCP price map
const scpPriceMap = {};
if (scpPricesData?.athletes) {
  for (const a of scpPricesData.athletes) {
    scpPriceMap[a.name] = a;
  }
}

const now = new Date().toISOString();
const rows = [];

for (const a of athletes) {
  const rawRec = findRecord(a.name, a.sport, ebayAvg);
  const soldRec = findRecord(a.name, a.sport, ebaySoldAvg);
  const isGemrate = a.gemrate?.toLowerCase() === "yes";
  const gradedRec = isGemrate ? findRecord(a.name, a.sport, ebayGradedAvg) : null;
  const gradedSoldRec = isGemrate ? findRecord(a.name, a.sport, ebayGradedSoldAvg) : null;

  const cv = getCV(rawRec);

  // Days on market
  let dom = rawRec?.avgDaysOnMarket ?? null;
  if ((dom == null || dom <= 0) && athleteHistory[a.name]) {
    const entries = athleteHistory[a.name];
    const last = entries?.[entries.length - 1];
    if (last?.obsDays > 0) dom = last.obsDays;
  }

  const normName = a.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const psaPop = gemratePopMap[a.name] ?? gemratePopMap[normName] ?? null;

  rows.push({
    name: a.name,
    sport: a.sport,
    rawListedPrice: getPrice(rawRec),
    rawSoldPrice: getSoldPrice(soldRec),
    gradedListedPrice: getPrice(gradedRec),
    gradedSoldPrice: getSoldPrice(gradedSoldRec),
    stabilityCV: cv,
    signalStrength: getSignalSN(cv),
    psaPop: psaPop > 0 ? psaPop : null,
    bgsPop: beckettPopMap[a.name] ?? beckettPopMap[normName] ?? null,
    daysOnMarket: dom != null && dom > 0 ? Math.round(dom) : null,
    indexLevel: rawRec?.indexLevel ?? null,
    scpRawPrice: scpPriceMap[a.name]?.scpRawPrice ?? null,
    scpGradedPrice: scpPriceMap[a.name]?.scpGradedPrice ?? null,
  });
}

const output = {
  _meta: {
    updatedAt: now,
    athleteCount: rows.length,
    description: "Weekly snapshot of VZLA athlete market data",
  },
  athletes: rows,
};

const outPath = join(DATA_DIR, "vzla-athlete-market-data.json");
const pubPath = join(PUBLIC_DIR, "vzla-athlete-market-data.json");
writeFileSync(outPath, JSON.stringify(output, null, 2));
writeFileSync(pubPath, JSON.stringify(output, null, 2));

console.log(`✅ Wrote ${rows.length} athletes to vzla-athlete-market-data.json`);
