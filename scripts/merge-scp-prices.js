#!/usr/bin/env node
// scripts/merge-scp-prices.js
//
// Merges scp-raw.json + scp-graded.json → scp-prices.json
// Run after both fetch scripts complete.

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "data");
const PUBLIC_DIR = join(__dirname, "..", "public", "data");

function loadJson(path) {
  try { return JSON.parse(readFileSync(path, "utf-8")); } catch { return null; }
}

function main() {
  const raw = loadJson(join(DATA_DIR, "scp-raw.json"));
  const graded = loadJson(join(DATA_DIR, "scp-graded.json"));

  // Build graded lookup by name
  const gradedMap = {};
  if (graded?.athletes) {
    for (const a of graded.athletes) {
      gradedMap[a.name] = a;
    }
  }

  const rawAthletes = raw?.athletes || [];
  let rawHits = 0;
  let gradedHits = 0;

  const merged = rawAthletes.map((r) => {
    const g = gradedMap[r.name] || {};
    if (r.scpRawPrice) rawHits++;
    if (g.scpGradedPrice) gradedHits++;
    return {
      name: r.name,
      sport: r.sport,
      scpRawPrice: r.scpRawPrice ?? null,
      scpGradedPrice: g.scpGradedPrice ?? null,
      scpRawProduct: r.scpRawProduct ?? null,
      scpGradedProduct: g.scpGradedProduct ?? null,
      scpRawId: r.scpRawId ?? null,
      scpGradedId: g.scpGradedId ?? null,
    };
  });

  const output = {
    _meta: {
      updatedAt: new Date().toISOString(),
      athleteCount: merged.length,
      rawHits,
      gradedHits,
      description: "SportsCardsPro merged prices (raw + graded)",
    },
    athletes: merged,
  };

  mkdirSync(DATA_DIR, { recursive: true });
  mkdirSync(PUBLIC_DIR, { recursive: true });

  writeFileSync(join(DATA_DIR, "scp-prices.json"), JSON.stringify(output, null, 2));
  writeFileSync(join(PUBLIC_DIR, "scp-prices.json"), JSON.stringify(output, null, 2));

  console.log(`✅ Merged ${merged.length} athletes → scp-prices.json`);
  console.log(`   Raw hits: ${rawHits} | Graded hits: ${gradedHits}`);
}

main();
