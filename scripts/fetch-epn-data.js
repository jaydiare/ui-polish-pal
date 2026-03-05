// scripts/fetch-epn-data.js
// Fetches eBay Partner Network campaign + transaction data
// to determine banner CTR and "Hot Seller" athletes.
//
// Env vars required:
//   EPN_ACCOUNT_SID, EPN_AUTH_TOKEN
//
// Outputs:
//   data/epn-performance.json

import fs from "fs";

const SID = process.env.EPN_SID;
const TOKEN = process.env.EPN_AUTH_TOKEN;

if (!SID || !TOKEN) {
  console.error("Missing EPN_SID or EPN_AUTH_TOKEN");
  process.exit(1);
}

const BASE = `https://api.partner.ebay.com/Mediapartners/${SID}`;
const AUTH_HEADER = "Basic " + Buffer.from(`${SID}:${TOKEN}`).toString("base64");

// ── helpers ──────────────────────────────────────────────────────────

async function epnGet(path) {
  const url = path.startsWith("http") ? path : `${BASE}${path}`;
  console.log(`  GET ${url.replace(TOKEN, "***")}`);
  const res = await fetch(url, {
    headers: { Authorization: AUTH_HEADER, Accept: "application/json" },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`EPN ${res.status}: ${text}`);
  }
  return res.json();
}

function dateFmt(d) {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD (EPN expected format)
}

// ── load athletes for name matching ──────────────────────────────────

function loadAthletes() {
  try {
    const raw = fs.readFileSync("data/athletes.json", "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function normalizeStr(s) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function matchAthlete(itemTitle, athletes) {
  const title = normalizeStr(itemTitle);
  for (const a of athletes) {
    const parts = normalizeStr(a.name).split(/\s+/);
    if (parts.every((p) => title.includes(p))) {
      return a.name;
    }
  }
  return null;
}

// ── fetch transaction detail report ──────────────────────────────────

async function fetchTransactions(startDate, endDate) {
  const path =
    `/Reports/ebay_partner_transaction_detail` +
    `?STATUS=ALL&StartDate=${startDate}&EndDate=${endDate}&date_type=event_date`;

  try {
    const data = await epnGet(path);
    // Response can be an array of records or wrapped in an object
    if (Array.isArray(data)) return data;
    if (data?.records) return data.records;
    if (data?.transactions) return data.transactions;
    return [];
  } catch (err) {
    console.warn("Could not fetch transaction detail:", err.message);
    return [];
  }
}

// ── fetch action updates (conversions) ───────────────────────────────

async function fetchActions(startDate, endDate) {
  try {
    const data = await epnGet(
      `/ActionUpdates?StartDate=${startDate}&EndDate=${endDate}`
    );
    if (Array.isArray(data)) return data;
    if (data?.actionUpdates) return data.actionUpdates;
    return [];
  } catch (err) {
    console.warn("Could not fetch action updates:", err.message);
    return [];
  }
}

// ── fetch campaigns ──────────────────────────────────────────────────

async function fetchCampaigns() {
  try {
    const data = await epnGet("/Campaigns");
    if (Array.isArray(data)) return data;
    if (data?.campaigns) return data.campaigns;
    return [];
  } catch (err) {
    console.warn("Could not fetch campaigns:", err.message);
    return [];
  }
}

// ── main ─────────────────────────────────────────────────────────────

async function main() {
  const now = new Date();
  const start30 = new Date(now);
  start30.setDate(start30.getDate() - 30);

  const startDate = dateFmt(start30);
  const endDate = dateFmt(now);

  console.log(`\n📊 EPN Data Fetch: ${startDate} to ${endDate}`);

  // 1. Fetch campaigns
  console.log("\n🔹 Fetching campaigns...");
  const campaigns = await fetchCampaigns();
  console.log(`   Found ${campaigns.length} campaign(s)`);

  // 2. Fetch transactions (last 30 days)
  console.log("\n🔹 Fetching transactions...");
  const transactions = await fetchTransactions(startDate, endDate);
  console.log(`   Found ${transactions.length} transaction(s)`);

  // 3. Fetch action updates (conversions)
  console.log("\n🔹 Fetching action updates...");
  const actions = await fetchActions(startDate, endDate);
  console.log(`   Found ${actions.length} action update(s)`);

  // 4. Load athletes for matching
  const athletes = loadAthletes();
  console.log(`   Loaded ${athletes.length} athletes for matching`);

  // ── Aggregate by customId (banner placement) ──────────────────────

  const placementStats = {};

  for (const txn of transactions) {
    const customId = txn.customId || txn.custom_id || txn.customid || "unknown";
    if (!placementStats[customId]) {
      placementStats[customId] = { clicks: 0, impressions: 0, earnings: 0, conversions: 0, items: [] };
    }
    const stat = placementStats[customId];

    // Count as a click event
    stat.clicks += parseInt(txn.clicks || txn.quantity_clicks || "1", 10) || 1;
    stat.impressions += parseInt(txn.impressions || txn.quantity_impressions || "0", 10) || 0;
    stat.earnings += parseFloat(txn.earnings || txn.totalEarnings || txn.total_earnings || "0") || 0;

    // Check if it was a sale/conversion
    const status = (txn.status || txn.actionType || "").toLowerCase();
    if (status.includes("sale") || status.includes("won") || status.includes("paid")) {
      stat.conversions += 1;
    }

    // Extract item title for hot-sellers matching
    const itemTitle = txn.itemName || txn.item_name || txn.itemTitle || txn.item_title || "";
    if (itemTitle) {
      const matched = matchAthlete(itemTitle, athletes);
      if (matched) stat.items.push(matched);
    }
  }

  // Also count actions as conversions
  for (const action of actions) {
    const customId = action.customId || action.custom_id || "unknown";
    if (!placementStats[customId]) {
      placementStats[customId] = { clicks: 0, impressions: 0, earnings: 0, conversions: 0, items: [] };
    }
    placementStats[customId].conversions += 1;

    const itemTitle = action.itemName || action.item_name || "";
    if (itemTitle) {
      const matched = matchAthlete(itemTitle, athletes);
      if (matched) placementStats[customId].items.push(matched);
    }
  }

  // Calculate CTR per placement
  const placements = {};
  for (const [id, stat] of Object.entries(placementStats)) {
    const ctr = stat.impressions > 0 ? stat.clicks / stat.impressions : 0;
    placements[id] = {
      clicks: stat.clicks,
      impressions: stat.impressions,
      ctr: Math.round(ctr * 10000) / 100, // percentage with 2 decimals
      earnings: Math.round(stat.earnings * 100) / 100,
      conversions: stat.conversions,
    };
  }

  // ── Hot Sellers: aggregate athlete mentions across all placements ──

  const athleteCounts = {};
  for (const stat of Object.values(placementStats)) {
    for (const name of stat.items) {
      athleteCounts[name] = (athleteCounts[name] || 0) + 1;
    }
  }

  const hotSellers = Object.entries(athleteCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([name, count]) => ({ name, conversions: count }));

  // ── Determine best banner by CTR ───────────────────────────────────

  const bannerPlacements = ["sidebar-ebay", "footer-main", "footer-alt"];
  let bestBanner = null;
  let bestCtr = -1;
  for (const bp of bannerPlacements) {
    const p = placements[bp];
    if (p && p.ctr > bestCtr) {
      bestCtr = p.ctr;
      bestBanner = bp;
    }
  }

  // ── Build output ───────────────────────────────────────────────────

  const output = {
    _meta: {
      updatedAt: now.toISOString(),
      period: { start: startDate, end: endDate },
    },
    placements,
    bestBanner,
    hotSellers,
    campaigns: campaigns.map((c) => ({
      id: c.campaignId || c.campaign_id || c.id,
      name: c.campaignName || c.campaign_name || c.name,
    })),
  };

  fs.writeFileSync("data/epn-performance.json", JSON.stringify(output, null, 2));
  console.log("\n✅ Saved data/epn-performance.json");
  console.log(`   Placements tracked: ${Object.keys(placements).length}`);
  console.log(`   Hot sellers found: ${hotSellers.length}`);
  console.log(`   Best banner: ${bestBanner || "not enough data"}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
