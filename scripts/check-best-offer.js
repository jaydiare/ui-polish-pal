// scripts/check-best-offer.js
// Checks all active eBay listings and enables Best Offer if not already enabled.
//
// Uses the eBay Trading API (XML):
//   - GetMyeBaySelling  → list active items
//   - ReviseFixedPriceItem → enable Best Offer
//
// Env vars required:
//   EBAY_CLIENT_ID, EBAY_CLIENT_SECRET, EBAY_REFRESH_TOKEN, EBAY_SCOPES
//
// Required OAuth scopes: sell.inventory, sell.account
// (must be added to EBAY_SCOPES on Render + GitHub Secrets)

import { refreshAccessToken } from "./ebay.token.js";

const TRADING_API = "https://api.ebay.com/ws/api.dll";
const SITE_ID = "0"; // US

// ── helpers ──────────────────────────────────────────────────────────

async function tradingCall(callName, body, token) {
  const res = await fetch(TRADING_API, {
    method: "POST",
    headers: {
      "Content-Type": "text/xml",
      "X-EBAY-API-COMPATIBILITY-LEVEL": "1267",
      "X-EBAY-API-CALL-NAME": callName,
      "X-EBAY-API-SITEID": SITE_ID,
      "X-EBAY-API-IAF-TOKEN": token,
    },
    body,
  });
  return res.text();
}

function extractTag(xml, tag) {
  const re = new RegExp(`<${tag}>(.*?)</${tag}>`, "s");
  const m = xml.match(re);
  return m ? m[1].trim() : null;
}

function extractAll(xml, tag) {
  const re = new RegExp(`<${tag}>(.*?)</${tag}>`, "gs");
  const results = [];
  let m;
  while ((m = re.exec(xml)) !== null) results.push(m[1].trim());
  return results;
}

// ── get active listings (paginated) ──────────────────────────────────

async function getActiveListings(token) {
  const items = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const xml = `<?xml version="1.0" encoding="utf-8"?>
<GetMyeBaySellingRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <ActiveList>
    <Sort>TimeLeft</Sort>
    <Pagination>
      <EntriesPerPage>200</EntriesPerPage>
      <PageNumber>${page}</PageNumber>
    </Pagination>
  </ActiveList>
  <DetailLevel>ReturnAll</DetailLevel>
</GetMyeBaySellingRequest>`;

    const resp = await tradingCall("GetMyeBaySelling", xml, token);

    const ack = extractTag(resp, "Ack");
    if (ack !== "Success" && ack !== "Warning") {
      console.error("GetMyeBaySelling failed:", extractTag(resp, "ShortMessage"));
      break;
    }

    // Extract items from ActiveList
    const itemBlocks = resp.match(/<Item>(.*?)<\/Item>/gs) || [];
    for (const block of itemBlocks) {
      const itemId = extractTag(block, "ItemID");
      const title = extractTag(block, "Title");
      const bestOffer = extractTag(block, "BestOfferEnabled");
      if (itemId) {
        items.push({
          itemId,
          title: title || "(no title)",
          bestOfferEnabled: bestOffer === "true",
        });
      }
    }

    totalPages = parseInt(extractTag(resp, "TotalNumberOfPages") || "1", 10);
    page++;
  }

  return items;
}

// ── enable best offer on a single listing ────────────────────────────

async function enableBestOffer(itemId, token) {
  const xml = `<?xml version="1.0" encoding="utf-8"?>
<ReviseFixedPriceItemRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <Item>
    <ItemID>${itemId}</ItemID>
    <BestOfferDetails>
      <BestOfferEnabled>true</BestOfferEnabled>
    </BestOfferDetails>
  </Item>
</ReviseFixedPriceItemRequest>`;

  const resp = await tradingCall("ReviseFixedPriceItem", xml, token);
  const ack = extractTag(resp, "Ack");

  if (ack === "Success" || ack === "Warning") {
    return { success: true };
  } else {
    const msg = extractTag(resp, "LongMessage") || extractTag(resp, "ShortMessage");
    return { success: false, error: msg };
  }
}

// ── main ─────────────────────────────────────────────────────────────

async function main() {
  console.log("🔑 Refreshing access token…");
  const token = await refreshAccessToken(process.env.EBAY_REFRESH_TOKEN);

  console.log("📦 Fetching active listings…");
  const items = await getActiveListings(token);
  console.log(`   Found ${items.length} active listing(s).`);

  const missing = items.filter((i) => !i.bestOfferEnabled);
  console.log(`   ${missing.length} listing(s) without Best Offer enabled.`);

  if (missing.length === 0) {
    console.log("✅ All listings already have Best Offer enabled.");
    return;
  }

  let enabled = 0;
  let failed = 0;

  for (const item of missing) {
    console.log(`   → Enabling Best Offer on: ${item.title} (${item.itemId})`);
    const result = await enableBestOffer(item.itemId, token);

    if (result.success) {
      enabled++;
    } else {
      failed++;
      console.error(`     ✗ Failed: ${result.error}`);
    }

    // Respect API rate limits (~5000 calls/day for Trading API)
    await new Promise((r) => setTimeout(r, 500));
  }

  console.log(`\n✅ Done. Enabled: ${enabled}, Failed: ${failed}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
