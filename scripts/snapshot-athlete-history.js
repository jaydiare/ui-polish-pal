#!/usr/bin/env node
// scripts/snapshot-athlete-history.js
//
// Daily snapshot: reads ebay-avg.json + ebay-graded-avg.json + ebay-sold-avg.json
// and appends a dated entry per athlete to data/athlete-history.json.
//
// Fields captured per athlete:
//   - taguchiListing (raw price)
//   - marketStabilityCV
//   - avgDaysOnMarket (from eBay API, if available)
//   - observedDays (computed from firstSeen date — reliable fallback)
//   - nListing
//   - indexLevel
//   - taguchiSold (from sold data)
//
// firstSeen tracking:
//   When an athlete first appears with active listing data (nListing > 0),
//   we record the date. On subsequent snapshots, observedDays = today - firstSeen.
//   If listings disappear (nListing drops to 0), firstSeen is reset so the
//   counter restarts when new listings appear.
//
// Keeps last 90 days of history to prevent unbounded file growth.

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "data");

const HISTORY_FILE = join(DATA_DIR, "athlete-history.json");
const FIRST_SEEN_FILE = join(DATA_DIR, "athlete-first-seen.json");
const RAW_FILE = join(DATA_DIR, "ebay-avg.json");
const GRADED_FILE = join(DATA_DIR, "ebay-graded-avg.json");
const SOLD_FILE = join(DATA_DIR, "ebay-sold-avg.json");

const MAX_DAYS = 90;

function readJson(path) {
  try {
    if (!existsSync(path)) return null;
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return null;
  }
}

function today() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function extractSnapshot(record) {
  if (!record || typeof record !== "object") return null;
  const price = record.taguchiListing ?? record.avgListing ?? null;
  const cv = record.marketStabilityCV ?? null;
  const days = record.avgDaysOnMarket ?? null;
  const nListing = record.nListing ?? null;
  const indexLevel = record.indexLevel ?? null;
  // Only snapshot if there's at least a price
  if (price == null) return null;
  const snap = { price: Math.round(price * 100) / 100 };
  if (cv != null) snap.cv = Math.round(cv * 10000) / 10000;
  if (days != null) snap.days = Math.round(days);
  if (nListing != null) snap.n = nListing;
  if (indexLevel != null) snap.idx = Math.round(indexLevel * 100) / 100;
  return snap;
}

function main() {
  const date = today();
  console.log(`📸 Snapshot for ${date}`);

  const raw = readJson(RAW_FILE);
  const graded = readJson(GRADED_FILE);
  const sold = readJson(SOLD_FILE);

  if (!raw) {
    console.error("❌ Could not read ebay-avg.json");
    process.exit(1);
  }

  // Load existing history
  let history = readJson(HISTORY_FILE) || {};

  // Build today's snapshots
  let count = 0;
  const allKeys = new Set([
    ...Object.keys(raw || {}),
    ...Object.keys(graded || {}),
  ]);

  for (const name of allKeys) {
    if (name === "_meta") continue;

    const rawSnap = extractSnapshot(raw?.[name]);
    const gradedSnap = extractSnapshot(graded?.[name]);
    const soldRec = sold?.[name];
    const soldPrice = soldRec?.taguchiSold ?? soldRec?.avg ?? null;

    // Skip if no data at all
    if (!rawSnap && !gradedSnap) continue;

    const entry = {};
    if (rawSnap) entry.raw = rawSnap;
    if (gradedSnap) entry.graded = gradedSnap;
    if (soldPrice != null) entry.sold = Math.round(soldPrice * 100) / 100;

    // Sport from raw or graded data
    const sport = raw?.[name]?.sport || graded?.[name]?.sport || null;
    if (sport) entry.sport = sport;

    // Initialize athlete history array if needed
    if (!history[name]) history[name] = [];

    // Check if we already have an entry for today
    const existing = history[name].findIndex((e) => e.date === date);
    const record = { date, ...entry };

    if (existing >= 0) {
      history[name][existing] = record; // overwrite
    } else {
      history[name].push(record);
    }

    // Trim to MAX_DAYS
    if (history[name].length > MAX_DAYS) {
      history[name] = history[name].slice(-MAX_DAYS);
    }

    count++;
  }

  // Clean up athletes with empty arrays
  for (const name of Object.keys(history)) {
    if (!history[name].length) delete history[name];
  }

  writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
  console.log(`✅ Snapshotted ${count} athletes → ${HISTORY_FILE}`);
}

main();
