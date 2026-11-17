# Fix the eBay auctions job crash

The auctions job on GitHub stops immediately because the script is written in an older style that the project no longer accepts for `.js` files.

## Fix
- Rename `scripts/fetch-ebay-auctions.js` to `scripts/fetch-ebay-auctions.cjs` (same approach the other older scripts use).
- Update `.github/workflows/ebay-auctions.yml` to run `node scripts/fetch-ebay-auctions.cjs`.
- Update the project notes (AGENTS.md) to the new filename.

## Check
- Run the script locally with `node --check` to confirm it loads without the error. Real auctions still need one manual run from the GitHub Actions tab.
