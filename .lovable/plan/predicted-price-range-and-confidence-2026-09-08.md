# Predicted Price Range and Confidence

## Goal
Show, for each athlete, where the model expects their raw card price to sit 30 days from now, plus how confident that estimate is. It appears as new columns in the Market Data table, built from the same ML features that drive the Deal Score.

## What the user sees

Two new sortable columns in the Market Data table (`/market-data`):

| Column | Example | Meaning |
|---|---|---|
| Forecast (30d) | $18.40 ($15.10 - $22.70) | Central 30-day price estimate with a low/high band |
| Confidence | High / Medium / Low | How tight and reliable the band is |

- Colour cue on the central estimate: green when it sits above today's raw price, red when below, neutral when flat.
- Hovering the value shows today's raw price, the band, and a short "model estimate, not investment advice" note.
- Both columns join the existing "hide empty" filter list and the CSV export.
- Athletes without enough history show a dash.

Explanatory text is added to the intro panel on the Market Data page describing how the range and confidence are produced.

## How the forecast is produced (technical)

Extend `scripts/ml-score-athletes.py` (no new pipeline, same bi-weekly workflow run):

1. **Target.** Add `target_price_30d` = raw price 30 rows ahead per athlete, alongside the existing 7-day direction target.
2. **Model.** Three `GradientBoostingRegressor` models with `loss="quantile"` at alpha 0.1, 0.5 and 0.9, trained on the exact feature list already used by the classifier (`raw_price`, lags, moving averages, CV, volume, momentum, listing age, index). Log-price target so the band scales with price level.
3. **Validation.** Reuse `grouped_time_series_split`; log median absolute percentage error and empirical coverage of the 10-90 band so the run stays observable.
4. **Confidence tier.** Derived from relative band width (`(p90 - p10) / p50`) combined with the athlete's history depth and listing volume:
   - High: band width under 25%, at least 60 days of history
   - Medium: band width under 50%
   - Low: everything else
5. **Output.** New fields per athlete in `data/athlete-ml-scores.json`:
   `forecast_30d_low`, `forecast_30d_mid`, `forecast_30d_high`, `forecast_confidence`, `forecast_band_pct`, `forecast_basis_price`.
   Existing fields are untouched, so the Deal Score, badges and Hot Players chart keep working.
6. Copy to `public/data/athlete-ml-scores.json` stays part of the same workflow step.

## Frontend changes

- `src/lib/vzla-helpers.ts` — add the forecast fields to `AthleteMlScore`.
- `src/components/BlogDataTable.tsx` — add `forecastMid`, `forecastLow`, `forecastHigh`, `forecastConfidence` to `RowData`, populate them from `useAthleteMlScores()`, add the two columns with custom renderers, and register `forecastMid` / `forecastConfidence` in `FILTERABLE_COLS`. Confidence sorts High > Medium > Low.
- `src/pages/MarketData.tsx` — one paragraph explaining the forecast columns.
- `src/i18n/translations.ts` — EN/ES keys for the tooltip and confidence tiers.
- `docs/ML-DATASET.md` — document the new fields and the quantile model.

## Out of scope
- No forecast on athlete cards or Market Intel charts in this pass.
- No change to the Deal Score formula or the 7-day upside probability.
- No new workflow or schedule; the forecast refreshes with the existing bi-weekly scorer run.
