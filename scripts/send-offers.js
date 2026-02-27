// scripts/send-offers.js
// Automatically sends 10% discount offers to watchers/interested buyers
// on eligible eBay listings using the Negotiation API.
//
// Env vars required:
//   EBAY_CLIENT_ID, EBAY_CLIENT_SECRET, EBAY_REFRESH_TOKEN, EBAY_SCOPES
//
// Required OAuth scopes: sell.inventory.readonly, sell.negotiation
// (must be added to EBAY_SCOPES on Render + GitHub Secrets)

import { refreshAccessToken } from "./ebay.token.js";

const MARKETPLACE_ID = "EBAY_US";
const NEGOTIATION_API = "https://api.ebay.com/sell/negotiation/v1";
const DISCOUNT_PCT = 0.10; // 10% off

// ── helpers ──────────────────────────────────────────────────────────

async function apiGet(url, token) {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-EBAY-C-MARKETPLACE-ID": MARKETPLACE_ID,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GET ${url} → ${res.status}: ${text}`);
  }
  return res.json();
}

async function apiPost(url, body, token) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-EBAY-C-MARKETPLACE-ID": MARKETPLACE_ID,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    return { success: false, status: res.status, error: text };
  }
  // 200 or 201 = success; some endpoints return 204 (no content)
  if (res.status === 204) return { success: true };
  try {
    return { success: true, data: await res.json() };
  } catch {
    return { success: true };
  }
}

// ── find eligible items ──────────────────────────────────────────────

async function findEligibleItems(token) {
  const items = [];
  let url = `${NEGOTIATION_API}/find_eligible_items?limit=100`;

  while (url) {
    const data = await apiGet(url, token);
    if (data.eligibleItems) items.push(...data.eligibleItems);

    // Pagination
    url = null;
    if (data.next) url = data.next;
  }

  return items;
}

// ── send offer ───────────────────────────────────────────────────────

async function sendOffer(item, token) {
  const listingId = item.listingId;

  // Calculate 10% discount from current price
  const currentPrice = parseFloat(item.currentPrice?.value || item.price?.value || "0");
  const currency = item.currentPrice?.currency || item.price?.currency || "USD";

  if (currentPrice <= 0) {
    console.log(`   ⏭ Skipping ${listingId}: no valid price`);
    return { skipped: true };
  }

  const offerPrice = (currentPrice * (1 - DISCOUNT_PCT)).toFixed(2);

  const payload = {
    offeredItems: [
      {
        listingId,
        price: {
          currency,
          value: offerPrice,
        },
      },
    ],
    message: `Hi! I'd like to offer you a ${Math.round(DISCOUNT_PCT * 100)}% discount on this item. Act fast — this offer is valid for 48 hours!`,
    allowCounterOffer: true,
  };

  const result = await apiPost(`${NEGOTIATION_API}/send_offer`, payload, token);

  if (result.success) {
    console.log(`   ✓ Sent offer: $${offerPrice} (was $${currentPrice}) on listing ${listingId}`);
  } else {
    // 409 = offer already sent / duplicate
    if (result.status === 409) {
      console.log(`   ⏭ Already offered on listing ${listingId}`);
      return { skipped: true };
    }
    console.error(`   ✗ Failed on ${listingId}: ${result.error}`);
  }

  return result;
}

// ── main ─────────────────────────────────────────────────────────────

async function main() {
  console.log("🔑 Refreshing access token…");
  const token = await refreshAccessToken(process.env.EBAY_REFRESH_TOKEN);

  console.log("🔍 Finding eligible items for offers…");
  const items = await findEligibleItems(token);
  console.log(`   Found ${items.length} eligible item(s).`);

  if (items.length === 0) {
    console.log("✅ No eligible items for offers right now.");
    return;
  }

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const item of items) {
    const result = await sendOffer(item, token);

    if (result.skipped) skipped++;
    else if (result.success) sent++;
    else failed++;

    // Respect rate limits
    await new Promise((r) => setTimeout(r, 1000));
  }

  console.log(`\n✅ Done. Sent: ${sent}, Skipped: ${skipped}, Failed: ${failed}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
