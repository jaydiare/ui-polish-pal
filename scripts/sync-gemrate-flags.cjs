#!/usr/bin/env node
/**
 * Sync gemrate flags in athletes.json based on gemrate.json (PSA),
 * gemrate_beckett.json, and gemrate_sgc.json presence.
 * If athlete name exists in ANY grader file → gemrate = "yes"
 * Otherwise → gemrate = "no"
 */
const fs = require("fs");
const path = require("path");

const BASE = path.join(__dirname, "..");
const ATHLETES_PATH = path.join(BASE, "data", "athletes.json");
const GEMRATE_PATH = path.join(BASE, "data", "gemrate.json");
const BECKETT_PATH = path.join(BASE, "data", "gemrate_beckett.json");
const SGC_PATH = path.join(BASE, "data", "gemrate_sgc.json");
const PUBLIC_ATHLETES = path.join(BASE, "public", "data", "athletes.json");

const athletes = JSON.parse(fs.readFileSync(ATHLETES_PATH, "utf-8"));

function loadGraderNames(filePath) {
  try {
    const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    return new Set(Object.keys(data.athletes || {}));
  } catch {
    return new Set();
  }
}

const psaNames = loadGraderNames(GEMRATE_PATH);
const beckettNames = loadGraderNames(BECKETT_PATH);
const sgcNames = loadGraderNames(SGC_PATH);

const graded = new Set([...psaNames, ...beckettNames, ...sgcNames]);

const NEW_GRADED_PATH = path.join(BASE, "data", "new-graded-athletes.json");

let changed = 0;
const newlyGraded = [];
for (const a of athletes) {
  const hasGraded = graded.has(a.name);
  const newVal = hasGraded ? "yes" : "no";
  if (a.gemrate !== newVal) {
    console.log(`  ${a.name} (${a.sport}): ${a.gemrate ?? "unset"} → ${newVal}`);
    if (newVal === "yes") {
      newlyGraded.push({ name: a.name, sport: a.sport, league: a.league, team: a.team, date: new Date().toISOString().slice(0, 10) });
    }
    a.gemrate = newVal;
    changed++;
  }
}

console.log(`\n✅ ${changed} athletes updated, ${newlyGraded.length} newly graded, ${athletes.length} total.`);
console.log(`   Sources: PSA=${psaNames.size}, Beckett=${beckettNames.size}, SGC=${sgcNames.size} → ${graded.size} unique graded names.`);

// Append newly graded to cumulative log
let existing = [];
if (fs.existsSync(NEW_GRADED_PATH)) {
  try { existing = JSON.parse(fs.readFileSync(NEW_GRADED_PATH, "utf-8")); } catch {}
}
const merged = [...existing, ...newlyGraded];
fs.writeFileSync(NEW_GRADED_PATH, JSON.stringify(merged, null, 2), "utf-8");

fs.writeFileSync(ATHLETES_PATH, JSON.stringify(athletes, null, 2), "utf-8");
fs.mkdirSync(path.dirname(PUBLIC_ATHLETES), { recursive: true });
fs.writeFileSync(PUBLIC_ATHLETES, JSON.stringify(athletes, null, 2), "utf-8");
