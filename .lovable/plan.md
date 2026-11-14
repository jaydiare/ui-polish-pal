# Show the date on the Market Intel "Last update" badge

## Problem
The green "Last update" badge at the top of Market Intel only shows the words "Last update" with no date. The data itself already carries the time it was last refreshed (latest run: Nov 11, 2026), but the badge never reads it.

## Fix
- Read the refresh time from the listed-price data already loaded on the page (falls back to the sold-price data if missing).
- Show it next to the label, e.g. "Last update · Nov 11, 2026, 3:00 PM".
- Format the date in the visitor's chosen language (English or Spanish).
- If no date is available, show "Last update · —" instead of an empty badge.

## Technical details
- `src/pages/Data.tsx` hero badge (~line 689): compute `updatedAt` from `listedData._meta.updatedAt ?? soldData._meta.updatedAt` with `toLocaleString` using `en-US` / `es-VE` based on the current language.
- No new text keys beyond reusing the existing label; add an ES translation for "Last update" if not already present.
