# Price History Chart on Athlete Cards

Add a full price history chart that opens in a modal when the small sparkline on an athlete card is clicked.

## What the user sees

- The existing mini sparkline on each card stays, but becomes clickable (with a subtle hover cue and a "View price history" label for screen readers).
- Clicking it opens a centered dialog with the athlete's name, sport and team in the header.
- Inside: a large line chart of listing price over time, using the same daily snapshot data that feeds the sparkline (~90-day rolling window).
- Raw and graded series are both plotted when available, with a legend and small toggle chips to show/hide each series. In Raw or Graded mode the dialog opens focused on that series.
- Hovering (or tapping) a point shows a tooltip with the date and price, formatted as `USD $`.
- Summary strip under the chart: current price, period high, period low, and change over the window (percent plus absolute), colored up/down.
- Empty case: if fewer than 7 data points exist, the sparkline is not rendered today, so no modal entry point appears. No change there.
- Copy is added to both EN and ES locale files.

## Technical details

- New component `src/components/PriceHistoryDialog.tsx` using the existing shadcn `Dialog` and the project's Recharts setup (same chart patterns as the market intel charts), dark theme tokens only, no hardcoded colors.
- `src/components/AthleteCard.tsx`: wrap the sparkline block in a button that sets local `historyOpen` state; pass `athlete`, the already-computed `rawSparkData` / `gradedSparkData` (values + dates) and `priceMode` into the dialog. The dialog is rendered only when opened so the grid stays light.
- Reuse the existing `extractSparkline` output; no new data fetching, no changes to `useAthleteData` or the JSON pipeline.
- Respect `prefers-reduced-motion` (disable chart animation), keyboard accessible trigger, focus trap handled by Dialog, `aria-label` on the trigger.
- Add translation keys for the dialog title, series labels, and summary labels to `src/i18n/translations.ts` (en + es).
