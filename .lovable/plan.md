# ML Dataset Builder

## Goal
Turn the accumulated market data into a clean, flattened ML-ready dataset (CSV) that regenerates automatically, plus a one-command local export.

## What gets built

### 1. Export script: `scripts/export-ml-dataset.js`
Flattens `data/athlete-history.json` (panel time series) into a long-format CSV — one row per athlete per day:

```text
date, name, sport, league,
raw_price, raw_cv, raw_n_listings, raw_index, raw_obs_days,
graded_price, graded_cv, graded_n_listings, graded_index,
days_on_market,
psa_pop, bgs_pop, sgc_pop,
scp_raw_price, scp_graded_price
```

- Static/slow features (sport, league, PSA/BGS/SGC populations, SCP prices) joined from `athletes.json`, `gemrate*.json`, `scp-*.json` using the existing accent-insensitive name normalizer.
- Derived ML features per athlete: 7-day and 30-day price change %, rolling volatility (std of daily returns), days since first seen.
- Missing values left empty (standard for pandas/XGBoost), no imputation in the export.
- Output: `data/ml-dataset.csv` (+ gzip copy). ~51k rows today, growing ~570/day.

### 2. Data dictionary: `docs/ML-DATASET.md`
Column definitions, units, known caveats (90-day depth, sparse graded rows, winsorized prices), and example Python/pandas loading snippet.

### 3. Automation
Extend the existing daily `snapshot-history.yml` workflow (already commits history files daily) with one step: run the export script and commit `ml-dataset.csv` — dataset stays current with zero extra infrastructure.

### 4. Local command
`npm run export:ml` for on-demand regeneration.

## Technical notes
- Pure Node.js, no new dependencies (CSV written manually with proper quoting).
- Follows the One-Pipeline-One-File convention; reuses `normKey` name-matching pattern from `snapshot-market-data.js`.
- GitHub CSV diff noise is acceptable; gzip copy keeps size manageable.

## Explicitly out of scope
- No model training (that's your next step, in Python).
- No new data collection.
