# Market Sentiment Chart on Market Intel

A new chart on the Market Intel page showing how raw and graded card prices have moved over time, plus a sentiment line that tells you at a glance whether the market is bullish or bearish.

## What you will see

A single card near the top of Market Intel with:

- **Two price lines over time** — the raw (ungraded) market index and the graded market index, both on a base-100 scale so they can be compared directly.
- **A sentiment line** on a second axis, running from bearish (-100) to bullish (+100), with a neutral line at zero. Green shading above zero, red below.
- **A headline reading** above the chart: "Bullish", "Neutral" or "Bearish" with the current score and the change since a week ago.
- Time-range buttons: 30 days / 90 days / All.
- Tap-friendly tooltip showing the date, both index values and the sentiment score for that day (same pin-then-read behaviour used by the other charts).
- Full English and Spanish labels, plus a short "how this is calculated" note.

## How sentiment is measured

For each day, sentiment combines three signals into one -100..+100 score:

- **Breadth** — share of tracked athletes whose price rose vs. fell over the trailing 7 days.
- **Momentum** — 7-day percentage change of the overall index.
- **Stability** — average price variability; high volatility dampens the score toward neutral.

Bullish above +15, bearish below -15, neutral in between. The exact formula is shown in the chart's methodology note so it is not a black box.

## Technical notes

- New component `src/components/MarketSentimentChart.tsx`, rendered in `src/pages/Data.tsx` alongside the existing ML tracker section.
- Data source: `data/athlete-history.json`, which Market Intel already fetches, so no extra network request. It carries per-athlete daily `raw.price`, `raw.idx`, `raw.cv` and `graded.price`, `graded.idx`. The daily raw and graded indexes are the mean of each athlete's `idx` values for that date (athletes with no graded entry are skipped from the graded series). `data/index-history.json` is used as a cross-check for the raw series only; it has no graded column, which is why the aggregation is done from the per-athlete history.
- Rendered with Recharts `ComposedChart` (two `Line`s on the left axis, an `Area`/`Line` for sentiment on the right axis, `ReferenceLine` at 0), matching the existing dark chart styling and tokens.
- Series computed in a `useMemo` and downsampled when the range exceeds ~120 points to keep mobile smooth.
- New i18n keys under `sentiment.*` added to both EN and ES in `src/i18n/translations.ts`.
- No workflow, script or backend changes; everything is derived from data already collected daily.
