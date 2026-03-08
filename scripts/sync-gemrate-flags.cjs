#!/usr/bin/env node
/**
 * Sync gemrate flags in athletes.json based on gemrate.json presence.
 * If athlete name exists in gemrate.json athletes → gemrate = "yes"
 * Otherwise → gemrate = "no"
 */
const fs = require("fs");
const path = require("path");

const BASE = path.join(__dirname, "..");
const ATHLETES_PATH = path.join(BASE, "data", "athletes.json");
const GEMRATE_PATH = path.join(BASE, "data", "gemrate.json");
const PUBLIC_ATHLETES = path.join(BASE, "public", "data", "athletes.json");

const athletes = JSON.parse(fs.readFileSync(ATHLETES_PATH, "utf-8"));
const gemrate = JSON.parse(fs.readFileSync(GEMRATE_PATH, "utf-8"));

const graded = new Set(Object.keys(gemrate.athletes || {}));

let changed = 0;
for (const a of athletes) {
  const hasGraded = graded.has(a.name);
  const newVal = hasGraded ? "yes" : "no";
  if (a.gemrate !== newVal) {
    console.log(`  ${a.name} (${a.sport}): ${a.gemrate ?? "unset"} → ${newVal}`);
    a.gemrate = newVal;
    changed++;
  }
}

console.log(`\n✅ ${changed} athletes updated, ${athletes.length} total.`);

fs.writeFileSync(ATHLETES_PATH, JSON.stringify(athletes, null, 2), "utf-8");
fs.mkdirSync(path.dirname(PUBLIC_ATHLETES), { recursive: true });
fs.writeFileSync(PUBLIC_ATHLETES, JSON.stringify(athletes, null, 2), "utf-8");
