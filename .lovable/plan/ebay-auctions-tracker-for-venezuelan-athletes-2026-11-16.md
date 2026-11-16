# eBay Auctions Tracker for Venezuelan athletes

Yes, your existing eBay access works. Your price scripts already search eBay for "Buy It Now" listings; the tracker runs the same search for auctions, sorted by "ending soonest".

## What visitors get
A new page, "Auctions", added to the navigation menu. It shows live eBay auctions for the top 100 Venezuelan athletes:
- Card photo, title, athlete name, current bid
- An "Ending soon" countdown that ticks every second, with auctions ending soonest at the top
- The list drops auctions once they end
- Each card links to eBay with your affiliate tracking
- A note showing when the list was last refreshed
- English and Spanish text

## How it stays fresh
A scheduled job on GitHub refreshes the list every 3 hours. It is free and uses about 800 of your 5,000 daily eBay calls (100 athletes, 8 runs a day). Bid amounts can be up to 3 hours old, so the page says "Bid at last refresh" and the countdown always uses the real end time.

## Which athletes count as "top 100"
The 100 athletes with the most sales in your current sold data. Golf, MMA and the excluded athletes are left out.

## Technical details
- New `scripts/fetch-ebay-auctions.js`: reuses token + `ebayBrowseSearch` pattern from `update-ebay-avg.js` with `filter=buyingOptions:{AUCTION}`, `sort=endingSoonest`, category 261328, strict name matching + `searchKeyword`, limit 10 per athlete, EBAY_US only. Keeps itemId, title, image, currentBidPrice, bidCount, itemEndDate, itemWebUrl (EPN customid). Drops auctions ending in under 5 min.
- Output `data/ebay-auctions.json` + copy to `public/data/`, with `generatedAt`.
- New `.github/workflows/ebay-auctions.yml`: cron every 3h, Node 24, contents: write, fetch/rebase 3-attempt retry like the other workflows.
- New lazy-loaded page `src/pages/Auctions.tsx` at `/auctions`, nav link, sitemap entry, Helmet SEO, i18n keys in both locales.
- No database or backend needed.
