# Re-enable Gemrate Sales Volume Trends (Monthly)

## Goal
Bring the "Sales Volume Trends" section on the Data page back to life with fresh monthly data instead of the frozen May 26 snapshot.

## Changes

1. **Workflow** (`.github/workflows/gemrate-sales-trends.yml`)
   - Re-add a monthly cron schedule (e.g. `0 6 2 * *`, 2nd of each month) alongside `workflow_dispatch`.
   - Set `ENABLE_LEGACY_GEMRATE_SALES_TRENDS: "1"` in the job env so the scraper actually runs.

2. **Scraper** (`scripts/fetch-gemrate-sales-trends.js`)
   - Keep the graceful-exit behavior: if the Gemrate grid is missing or the site changes, exit 0 and keep the existing snapshot (no more monthly red failures).
   - Keep everything else as-is: roster matching against `data/athletes.json`, writes to `data/` and `public/data/`.

3. **Verify**
   - Run the script locally with the flag enabled to confirm it can still extract data from gemrate.com/sales-trends; if the source markup changed, patch the extraction selectors so the run succeeds.
   - Confirm `SalesTrendsTable` on /data renders the refreshed snapshot.

## Notes
- If Gemrate blocks the scrape or changed their grid beyond a quick fix, the workflow will safely keep the last good snapshot rather than failing.
