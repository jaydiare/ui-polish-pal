#!/usr/bin/env node
// Fetch live eBay auctions (ending soonest) for the top 100 Venezuelan athletes.
// ENV: EBAY_CLIENT_ID, EBAY_CLIENT_SECRET, AUCTIONS_TOP_N (optional, default 100)
const fs = require("fs");
const path = require("path");

const { EBAY_CLIENT_ID, EBAY_CLIENT_SECRET } = process.env;
if (!EBAY_CLIENT_ID || !EBAY_CLIENT_SECRET) {
  console.error("Missing EBAY_CLIENT_ID or EBAY_CLIENT_SECRET");
  process.exit(1);
}
const TOP_N = Number(process.env.AUCTIONS_TOP_N || 100);
const PER_ATHLETE = 10;
const CATEGORY = "261328";
const EXCLUDED_SPORTS = ["golf", "mma"];
const EXCLUDED_NAMES = ["marlon vera", "jhonattan vegas", "yulimar rojas", "daniel dhers"];
const EPN = "mkevt=1&mkcid=1&mkrid=711-53200-19255-0&campid=5339142305&toolid=10001&customid=vzla-auctions";
const DATA = path.join(__dirname, "..", "data");

const readJson = (f, d = {}) => { try { return JSON.parse(fs.readFileSync(path.join(DATA, f), "utf8")); } catch { return d; } };
const norm = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .toLowerCase().replace(/[.'’"]/g, "").replace(/\b(jr|sr)\b/g, "").replace(/\s+/g, " ").trim();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function titleMatches(title, name) {
  const t = norm(title);
  return norm(name).split(" ").filter((p) => p.length > 1).every((p) => new RegExp(`\\b${p}\\b`).test(t));
}

function countFor(map, name) {
  const n = norm(name);
  for (const [k, v] of Object.entries(map)) {
    if (k !== "_meta" && norm(k) === n) return Number(v?.nSoldUsed ?? v?.nListings ?? v?.nUsed ?? 0) || 0;
  }
  return 0;
}

async function getToken() {
  const creds = Buffer.from(`${EBAY_CLIENT_ID}:${EBAY_CLIENT_SECRET}`).toString("base64");
  const res = await fetch("https://api.ebay.com/identity/v1/oauth2/token", {
    method: "POST",
    headers: { Authorization: `Basic ${creds}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "client_credentials", scope: "https://api.ebay.com/oauth/api_scope" }),
  });
  if (!res.ok) throw new Error(`Token failed ${res.status}`);
  return (await res.json()).access_token;
}

async function search(token, q) {
  const url = new URL("https://api.ebay.com/buy/browse/v1/item_summary/search");
  url.searchParams.set("q", q);
  url.searchParams.set("category_ids", CATEGORY);
  url.searchParams.set("limit", "50");
  url.searchParams.set("sort", "endingSoonest");
  url.searchParams.append("filter", "buyingOptions:{AUCTION}");
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}`, "X-EBAY-C-MARKETPLACE-ID": "EBAY_US" } });
    if (res.ok) return res.json();
    if (res.status === 429 || res.status >= 500) { await sleep(2000 * attempt); continue; }
    throw new Error(`Search ${res.status}`);
  }
  throw new Error("Search failed after retries");
}

const withEpn = (u) => (u ? `${u}${u.includes("?") ? "&" : "?"}${EPN}` : u);

(async () => {
  const athletes = readJson("athletes.json", []);
  const sold = readJson("ebay-sold-avg.json");
  const listed = readJson("ebay-avg.json");
  const pool = athletes.filter((a) => a?.name && !EXCLUDED_SPORTS.includes(String(a.sport || "").toLowerCase()) && !EXCLUDED_NAMES.includes(norm(a.name)));
  const top = pool
    .map((a) => ({ ...a, score: countFor(sold, a.name) * 1000 + countFor(listed, a.name) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, TOP_N);

  const token = await getToken();
  const minEnd = Date.now() + 5 * 60 * 1000;
  const seen = new Set();
  const auctions = [];
  let failed = 0;

  for (const [i, a] of top.entries()) {
    const q = `${a.searchKeyword || a.name} ${a.sport || ""}`.trim();
    try {
      const json = await search(token, q);
      const items = (json.itemSummaries || [])
        .filter((it) => it.itemEndDate && Date.parse(it.itemEndDate) > minEnd && titleMatches(it.title, a.name) && !seen.has(it.itemId))
        .slice(0, PER_ATHLETE);
      for (const it of items) {
        seen.add(it.itemId);
        const bid = it.currentBidPrice || it.price || {};
        auctions.push({
          itemId: it.itemId, athlete: a.name, sport: a.sport || null, title: it.title,
          image: it.image?.imageUrl || it.thumbnailImages?.[0]?.imageUrl || null,
          currentBid: bid.value != null ? Number(bid.value) : null, currency: bid.currency || "USD",
          bidCount: it.bidCount ?? null, endDate: it.itemEndDate, url: withEpn(it.itemAffiliateWebUrl || it.itemWebUrl),
        });
      }
      console.log(`[${i + 1}/${top.length}] ${a.name}: ${items.length}`);
    } catch (e) {
      failed++;
      console.warn(`[${i + 1}/${top.length}] ${a.name}: ${e.message}`);
    }
    await sleep(300);
  }

  auctions.sort((x, y) => Date.parse(x.endDate) - Date.parse(y.endDate));
  if (!auctions.length && failed === top.length) { console.error("All searches failed; keeping previous file."); process.exit(0); }
  const out = { _meta: { generatedAt: new Date().toISOString(), athletes: top.length, failed, count: auctions.length }, auctions };
  fs.writeFileSync(path.join(DATA, "ebay-auctions.json"), JSON.stringify(out, null, 2));
  console.log(`Saved ${auctions.length} auctions (${failed} failed searches).`);
})().catch((e) => { console.error(e); process.exit(0); });
