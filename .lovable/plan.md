# ML Starter Kit for the VZLA Sports Elite Dataset

## Goal
Give you a practical, self-contained starting point for training your own models from `data/ml-dataset.csv`, beginning with volatility clustering and progressing to a short-horizon price-direction predictor.

## What gets built

### 1. Starter Python notebook: `notebooks/ml-starter.ipynb`
A ready-to-run Colab/Jupyter notebook that:
- Loads `data/ml-dataset.csv` (local or raw GitHub URL).
- Explores the panel structure, missing-value patterns, and sport/league breakdown.
- Builds a volatility-clustering baseline using `raw_cv`, `raw_return_vol_7d`, and `raw_price_chg_7d_pct`.
- Adds a simple price-direction classifier: will an athlete's raw price be higher in 7 days than today? (binary target).
- Uses a point-in-time feature set so you can't accidentally leak future information.
- Evaluates with grouped time-series cross-validation (no random shuffle across athletes/dates).
- Exports a small sample prediction CSV you can inspect.

### 2. Feature engineering script: `scripts/ml-features.py`
A plain Python script version of the feature pipeline in the notebook, runnable from the command line:

```bash
python scripts/ml-features.py --input data/ml-dataset.csv --output data/ml-features.parquet
```

It produces a model-ready Parquet file with rolling windows (7, 14, 30 days), lagged prices, momentum features, and the forward-looking 7-day price-direction target.

### 3. Documentation update: `docs/ML-DATASET.md`
Add a "Getting started with modeling" section that links to the notebook, explains the point-in-time rule, warns about the static-feature caveat, and suggests next models (deal-score ranking, graded-price gap predictor).

## Technical approach

### Volatility clustering baseline
- Features per athlete: `raw_cv`, `raw_return_vol_7d`, `raw_price_chg_7d_pct`, `raw_price_chg_30d_pct`.
- Standardize features per sport (Baseball vs. Soccer have different price scales).
- Run K-Means or Gaussian Mixture for 3-5 clusters.
- Interpret clusters as, for example: "stable low-volume", "high-volatility momentum", "steady liquid".

### Price-direction classifier
- Target: `raw_price_t_plus_7 > raw_price_t`.
- Point-in-time features only (values known on `date` or earlier).
- Example models: logistic regression baseline, then XGBoost or LightGBM.
- Validation: time-series split by date; never train on future data.
- Group-aware: avoid having the same athlete in both train and test to get a realistic generalization estimate.

### Caveats surfaced in the notebook
- Daily history starts 2026-06-06, so long-horizon forecasts are limited.
- `psa_pop`, `scp_*` are static snapshots joined to every row — useful as athlete-level descriptors, but not as historical time-varying signals.
- Graded columns are sparse; the first model should probably focus on raw prices.

## Out of scope
- No model deployed inside the app yet (that's a follow-up once you have a model you trust).
- No new data collection; this uses the existing `ml-dataset.csv`.
- No automated retraining pipeline; the dataset refreshes daily, but training stays manual for now.

## Deliverables
1. `notebooks/ml-starter.ipynb`
2. `scripts/ml-features.py`
3. Updated `docs/ML-DATASET.md`
