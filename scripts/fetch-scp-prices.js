#!/usr/bin/env node
// scripts/fetch-scp-prices.js
//
// Monthly script: queries SportsCardsPro /api/products for every athlete
// in data/athletes.json. Fetches both "raw" and "PSA" queries.
// Output: data/scp-prices.json  +  public/data/scp-prices.json

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

/**
 * Query SportsCardsPro /api/products endpoint
 * Returns the first matching product or null
 */
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
    // Response is { products: [...] } with product objects
    const products = data.products || [];
    return products.length > 0 ? products : null;
  } catch (err) {
    console.warn(`  ⚠️  Fetch error for "${query}": ${err.message}`);
    return null;
  }
}

/**
 * Extract best price from SCP product results
 * SCP prices are in cents
 */
function extractPrice(products) {
  if (!products || products.length === 0) return null;
  // Pick first product's loose (raw) or new (graded) price
  const p = products[0];
  // loose-price = raw/ungraded, new-price = PSA 10 equivalent
  const price = p["loose-price"] || p["new-price"] || p["cib-price"] || 0;
  return price > 0 ? Math.round(price) / 100 : null;
}

function extractRawPrice(products) {
  if (!products || products.length === 0) return null;
  const p = products[0];
  const price = p["loose-price"] || 0;
  return price > 0 ? Math.round(price) / 100 : null;
}

function extractGradedPrice(products) {
  if (!products || products.length === 0) return null;
  const p = products[0];
  // new-price typically = PSA 10
  const price = p["new-price"] || p["cib-price"] || 0;
  return price > 0 ? Math.round(price) / 100 : null;
}

function extractProductInfo(products) {
  if (!products || products.length === 0) return null;
  const p = products[0];
  return {
    productName: p["product-name"] || null,
    consoleName: p["console-name"] || null,
    id: p.id || null,
  };
}

/* ── Main ── */
async function main() {
  console.log("🏷️  SportsCardsPro Price Fetcher");
  console.log("=".repeat(60));

  const athletes = loadJson(join(DATA_DIR, "athletes.json")) || [];
  if (athletes.length === 0) {
    console.error("❌ No athletes found in data/athletes.json");
    process.exit(1);
  }

  // Load existing results so we can preserve them on partial failures
  const existing = loadJson(join(DATA_DIR, "scp-prices.json"));
  const existingMap = {};
  if (existing?.athletes) {
    for (const a of existing.athletes) {
      existingMap[a.name] = a;
    }
  }

  const results = [];
  let rawHits = 0;
  let gradedHits = 0;

  for (let i = 0; i < athletes.length; i++) {
    const a = athletes[i];
    const progress = `[${i + 1}/${athletes.length}]`;
    console.log(`${progress} ${a.name} (${a.sport})`);

    // Query for raw cards: "Name Raw"
    const rawQuery = `${a.name} Raw`;
    const rawProducts = await querySCP(rawQuery);
    const rawPrice = extractRawPrice(rawProducts);
    const rawInfo = extractProductInfo(rawProducts);
    if (rawPrice) rawHits++;

    await sleep(500); // Rate limit

    // Query for graded cards: "Name PSA"
    const gradedQuery = `${a.name} PSA`;
    const gradedProducts = await querySCP(gradedQuery);
    const gradedPrice = extractGradedPrice(gradedProducts);
    const gradedInfo = extractProductInfo(gradedProducts);
    if (gradedPrice) gradedHits++;

    results.push({
      name: a.name,
      sport: a.sport,
      scpRawPrice: rawPrice,
      scpGradedPrice: gradedPrice,
      scpRawProduct: rawInfo?.productName || null,
      scpGradedProduct: gradedInfo?.productName || null,
      scpRawId: rawInfo?.id || null,
      scpGradedId: gradedInfo?.id || null,
    });

    // Rate limit: 500ms between requests, extra pause every 50 athletes
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
      rawHits,
      gradedHits,
      description: "SportsCardsPro price lookup for Venezuelan athlete cards",
    },
    athletes: results,
  };

  mkdirSync(dirname(join(DATA_DIR, "scp-prices.json")), { recursive: true });
  mkdirSync(dirname(join(PUBLIC_DIR, "scp-prices.json")), { recursive: true });

  const outPath = join(DATA_DIR, "scp-prices.json");
  const pubPath = join(PUBLIC_DIR, "scp-prices.json");
  writeFileSync(outPath, JSON.stringify(output, null, 2));
  writeFileSync(pubPath, JSON.stringify(output, null, 2));

  console.log(`\n✅ Done! ${results.length} athletes processed`);
  console.log(`   Raw price hits:    ${rawHits}/${results.length}`);
  console.log(`   Graded price hits: ${gradedHits}/${results.length}`);
  console.log(`   Saved to ${outPath}`);
  console.log(`   Saved to ${pubPath}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
