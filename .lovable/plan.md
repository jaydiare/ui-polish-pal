# Plan: migrate to eBay's current APIs

## What the site uses today
- **Browse API (REST, current)**: active listing prices (raw + graded) and the Auctions page. Already on the modern API, only needs a version/quota check.
- **Trading API (old XML, `ws/api.dll`)**: `check-best-offer.js` uses it to read your store listings and Best Offer settings. This is the main legacy piece to move.
- **Negotiation API (REST, current)**: `send-offers.js` sends offers to watchers. Already modern.
- **Sold prices**: the sold scripts read eBay's public search pages (HTML), not an API. These break whenever eBay changes its page layout.
- **eBay Partner Network reporting** (`fetch-epn-data.js`): separate partner API, keep as is.
- **Sign-in tokens** (`ebay.token.js`, OAuth identity v1): already modern.

## Steps
1. **Store listings and Best Offer**: replace Trading API calls in `check-best-offer.js` with the Sell **Inventory API** (read offers/listings) plus **Account/Negotiation** where needed. Add the `sell.inventory` scope to the token request. Note: listings created outside the Inventory API may not appear there; if so, keep a small Trading API fallback until they are migrated with `bulkMigrateListing`.
2. **Sold prices**: apply for eBay's **Marketplace Insights API** (restricted, needs eBay approval). If approved, switch the four sold scripts to it and keep the HTML reader only as a backup. If not approved, keep the current reader.
3. **Browse API check**: confirm all calls use `buy/browse/v1`, the right marketplace header, and stay within the 5,000/day quota.
4. **Shared helper**: one small eBay client file (token refresh, retries, rate limits) reused by every script.
5. **Test run**: run each GitHub workflow once by hand, compare new numbers against the last saved JSON before switching the schedule.

## What only you can do
- Request Marketplace Insights access in the eBay developer portal.
- Re-authorize your seller account once after the new scope is added.

## Technical details
- Files: `scripts/check-best-offer.js`, `scripts/ebay.token.js`, `scripts/ebay.config.js`, the `*sold-update-ebay-avg.js` scripts, and their workflows.
- No change to the website pages; output JSON files keep the same shape.
- Methodology trim % stays tied to `TAGUCHI_TRIM_PCT`.
