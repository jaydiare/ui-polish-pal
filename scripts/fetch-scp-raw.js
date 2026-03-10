#!/usr/bin/env node
// scripts/fetch-scp-raw.js
//
// Monthly script: queries SportsCardsPro /api/products for every athlete
// in data/athletes.json using "{Name} {Sport} Raw" queries.
// Output: data/scp-raw.json  +  public/data/scp-raw.json

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "data");
const PUBLIC_DIR = join(__dirname, "..", "public", "data");

const API_TOKEN = process.env.SPORTSCARDSPRO;
if (!API_TOKEN) {
  console.error("❌ SPORTSCARDSPRO secret not set.");
  process.exit(1);
}

const API_BASE = "https://www.sportscardspro.com/api/products";
const UA = "Mozilla/5.0 (compatible; VZLABot/1.0)";

function loadJson(path) {
  try { return JSON.parse(readFileSync(path, "utf-8")); } catch { return null; }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function querySCP(query) {
  const url = `${API_BASE}?t=${encodeURIComponent(API_TOKEN)}&q=${encodeURIComponent(query)}`;
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json", "User-Agent": UA },
    });
    if (!res.ok) {
      console.warn(`  ⚠️  HTTP ${res.status} for query "${query}"`);
      return null;
    }
    const data = await res.json();
    if (data.status === "error") {
      console.warn(`  ⚠️  API error for "${query}": ${data["error-message"] || "unknown"}`);
      return null;
    }
    const products = data.products || [];
    return products.length > 0 ? products : null;
  } catch (err) {
    console.warn(`  ⚠️  Fetch error for "${query}": ${err.message}`);
    return null;
  }
}

/**
 * Taguchi Winsorized Trimmed Mean
 * Trims top/bottom 20%, winsorizes remaining outliers to boundary values.
 */
function taguchiTrimmedMean(values) {
  if (!values || values.length === 0) return null;
  if (values.length === 1) return Math.round(values[0] * 100) / 100;

  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const trimCount = Math.max(1, Math.floor(n * 0.2));

  if (n <= 2 * trimCount) {
    const mid = Math.floor(n / 2);
    const median = n % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
    return Math.round(median * 100) / 100;
  }

  const lo = sorted[trimCount];
  const hi = sorted[n - 1 - trimCount];

  let sum = 0;
  for (const v of sorted) {
    sum += Math.min(Math.max(v, lo), hi);
  }
  return Math.round((sum / n) * 100) / 100;
}

function extractRawPrice(products) {
  if (!products || products.length === 0) return null;
  const prices = products
    .map((p) => p["loose-price"] || 0)
    .filter((v) => v > 0)
    .map((v) => v / 100);
  return taguchiTrimmedMean(prices);
}

function extractProductInfo(products) {
  if (!products || products.length === 0) return null;
  const p = products[0];
  return {
    productName: p["product-name"] || null,
    consoleName: p["console-name"] || null,
    id: p.id || null,
    matchCount: products.length,
  };
}

/* ── Main ── */
async function main() {
  console.log("🏷️  SCP Raw Price Fetcher");
  console.log("=".repeat(60));

  const athletes = loadJson(join(DATA_DIR, "athletes.json")) || [];
  if (athletes.length === 0) {
    console.error("❌ No athletes found in data/athletes.json");
    process.exit(1);
  }

  const results = [];
  let hits = 0;

  for (let i = 0; i < athletes.length; i++) {
    const a = athletes[i];
    const progress = `[${i + 1}/${athletes.length}]`;
    const query = `${a.name} ${a.sport} Raw`;
    console.log(`${progress} ${a.name} (${a.sport}) → "${query}"`);

    const products = await querySCP(query);
    const price = extractRawPrice(products);
    const info = extractProductInfo(products);
    if (price) hits++;

    results.push({
      name: a.name,
      sport: a.sport,
      scpRawPrice: price,
      scpRawProduct: info?.productName || null,
      scpRawId: info?.id || null,
      scpRawMatchCount: info?.matchCount || 0,
    });

    // Rate limit: 500ms between requests, extra pause every 50
    if ((i + 1) % 50 === 0) {
      console.log(`  ⏳ Pausing 3s after ${i + 1} athletes...`);
      await sleep(3000);
    } else {
      await sleep(500);
    }
  }

  const output = {
    _meta: {
      updatedAt: new Date().toISOString(),
      athleteCount: results.length,
      hits,
      type: "raw",
      description: "SportsCardsPro RAW price lookup (query: Name Sport Raw)",
    },
    athletes: results,
  };

  mkdirSync(DATA_DIR, { recursive: true });
  mkdirSync(PUBLIC_DIR, { recursive: true });

  const outPath = join(DATA_DIR, "scp-raw.json");
  const pubPath = join(PUBLIC_DIR, "scp-raw.json");
  writeFileSync(outPath, JSON.stringify(output, null, 2));
  writeFileSync(pubPath, JSON.stringify(output, null, 2));

  console.log(`\n✅ Done! ${results.length} athletes processed`);
  console.log(`   Raw price hits: ${hits}/${results.length}`);
  console.log(`   Saved to ${outPath}`);
  console.log(`   Saved to ${pubPath}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
