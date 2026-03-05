// scripts/fetch-most-watched.js
// Fetches the most watched Trading Card Singles from eBay Merchandising API,
// cross-references with athletes.json, and outputs top 10 matched athletes.
//
// Env vars required:
//   EBAY_CLIENT_ID
//
// Output:
//   data/ebay-most-watched.json  →  also copied to public/data/

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EBAY_CLIENT_ID = process.env.EBAY_CLIENT_ID;
if (!EBAY_CLIENT_ID) {
  console.error("Missing EBAY_CLIENT_ID in env.");
  process.exit(1);
}

const ATHLETES_PATH = path.join(__dirname, "..", "data", "athletes.json");
const OUT_PATH = path.join(__dirname, "..", "data", "ebay-most-watched.json");
const PUBLIC_PATH = path.join(__dirname, "..", "public", "data", "ebay-most-watched.json");

const CATEGORY_ID = "261328"; // Trading Card Singles
const MAX_RESULTS = 100; // fetch max from API, then filter

/* ── Helpers ── */
function norm(s) {
  return s
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .trim();
}

function titleMatchesAthlete(title, athleteName) {
  const t = norm(title);
  const parts = norm(athleteName).split(/\s+/).filter(Boolean);
  if (parts.length < 2) return t.includes(parts[0] || "");
  return parts.every((part) => t.includes(part));
}

/* ── Main ── */
async function main() {
  const athletes = JSON.parse(fs.readFileSync(ATHLETES_PATH, "utf-8"));
  console.log(`Loaded ${athletes.length} athletes`);

  // Fetch most watched items from eBay Merchandising API
  const url =
    `https://svcs.ebay.com/MerchandisingService` +
    `?OPERATION-NAME=getMostWatchedItems` +
    `&SERVICE-VERSION=1.1.0` +
    `&CONSUMER-ID=${EBAY_CLIENT_ID}` +
    `&RESPONSE-DATA-FORMAT=JSON` +
    `&maxResults=${MAX_RESULTS}` +
    `&categoryId=${CATEGORY_ID}`;

  console.log("Fetching most watched items from eBay...");
  const res = await fetch(url);
  if (!res.ok) {
    console.error(`eBay API error: ${res.status} ${res.statusText}`);
    const text = await res.text();
    console.error(text);
    process.exit(1);
  }

  const json = await res.json();
  const items =
    json?.getMostWatchedItemsResponse?.itemRecommendations?.item || [];
  console.log(`Got ${items.length} most watched items`);

  if (!items.length) {
    console.warn("No items returned. Exiting without updating.");
    process.exit(0);
  }

  // Cross-reference with athletes
  // Build a map: athlete name → athlete record
  const athleteMap = new Map();
  for (const a of athletes) {
    athleteMap.set(norm(a.name), a);
  }

  // For each item, try to match an athlete; accumulate watch counts
  const watchCounts = new Map(); // athleteName → { watchCount, sport, items[] }

  for (const item of items) {
    const title = item.title?.[0] || item.title || "";
    const watchCount = parseInt(item.watchCount?.[0] || item.watchCount || "0", 10);
    const itemId = item.itemId?.[0] || item.itemId || "";
    const imageUrl = item.imageURL?.[0] || item.imageURL || "";
    const viewUrl = item.viewItemURL?.[0] || item.viewItemURL || "";

    // Try to find a matching athlete
    for (const [normName, athlete] of athleteMap) {
      if (titleMatchesAthlete(title, athlete.name)) {
        const existing = watchCounts.get(athlete.name) || {
          watchCount: 0,
          sport: athlete.sport,
          team: athlete.team,
          league: athlete.league,
          items: [],
        };
        existing.watchCount += watchCount;
        existing.items.push({
          title,
          watchCount,
          itemId,
          imageUrl,
          viewUrl,
        });
        watchCounts.set(athlete.name, existing);
        break; // first match wins
      }
    }
  }

  console.log(`Matched ${watchCounts.size} athletes from watched items`);

  // Sort by total watch count, take top 10
  const top10 = [...watchCounts.entries()]
    .sort((a, b) => b[1].watchCount - a[1].watchCount)
    .slice(0, 10)
    .map(([name, data], rank) => ({
      rank: rank + 1,
      name,
      sport: data.sport,
      team: data.team,
      league: data.league,
      watchCount: data.watchCount,
      topItem: data.items[0] || null,
      matchedItems: data.items.length,
    }));

  const output = {
    _meta: {
      updatedAt: new Date().toISOString(),
      source: "eBay Merchandising API – getMostWatchedItems",
      category: CATEGORY_ID,
      totalItemsFetched: items.length,
      athletesMatched: watchCounts.size,
    },
    top10,
  };

  fs.writeFileSync(OUT_PATH, JSON.stringify(output, null, 2));
  fs.mkdirSync(path.dirname(PUBLIC_PATH), { recursive: true });
  fs.writeFileSync(PUBLIC_PATH, JSON.stringify(output, null, 2));

  console.log("✅ Most watched data written:");
  for (const a of top10) {
    console.log(`  #${a.rank} ${a.name} (${a.sport}) — ${a.watchCount} watchers`);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
