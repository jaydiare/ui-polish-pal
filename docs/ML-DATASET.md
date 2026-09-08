# ML Dataset: `data/ml-dataset.csv`

A flattened, ML-ready export of the VZLA Sports Elite market data. One row per athlete per day (long/panel format). Regenerate locally with `npm run export:ml`; regenerated and committed daily by the `snapshot-history.yml` workflow after the athlete history snapshot.

## Shape

- ~570 athletes x ~90 daily rows (grows by one row per athlete per day)
- ~51k rows at introduction; ~5.9 MB CSV, ~0.9 MB gzipped (`ml-dataset.csv.gz`)

## Columns

| Column | Unit | Description |
|---|---|---|
| `date` | ISO date | Observation day (UTC) |
| `name` | string | Athlete name (canonical, with diacritics) |
| `sport` | string | Baseball, Soccer, Basketball, etc. |
| `league` | string | MLB, La Liga, NBA, etc. (from roster) |
| `raw_price` | USD | Taguchi winsorized mean of raw (ungraded) active eBay listings |
| `raw_cv` | ratio | Coefficient of variation of raw listings (0.25 = 25%) |
| `raw_n_listings` | count | Number of raw active listings after filters |
| `raw_index` | base-100 | Raw price index level vs. first observation |
| `raw_obs_days` | days | Consecutive days the athlete has had raw listings |
| `graded_price` | USD | Taguchi mean of graded (PSA/BGS/SGC) active listings |
| `graded_cv` | ratio | CV of graded listings |
| `graded_n_listings` | count | Number of graded active listings |
| `graded_index` | base-100 | Graded price index level |
| `days_on_market` | days | Average listing age (raw preferred, graded fallback) |
| `psa_pop` | count | PSA graded population (Gemrate) — static, updated weekly |
| `bgs_pop` | count | Beckett graded population — static |
| `sgc_pop` | count | SGC graded population — static |
| `scp_raw_price` | USD | SportsCardsPro raw market price — static, updated monthly |
| `scp_psa9_price` | USD | SportsCardsPro PSA 9 price — static |
| `scp_psa10_price` | USD | SportsCardsPro PSA 10 price — static |
| `days_since_first_seen` | days | Days since the athlete's first history entry |
| `raw_price_chg_7d_pct` | % | Raw price change vs. 7 days earlier |
| `raw_price_chg_30d_pct` | % | Raw price change vs. 30 days earlier |
| `raw_return_vol_7d` | % | Sample std-dev of daily raw returns over the trailing 7 days |

Empty cell = missing/unavailable. No imputation is applied.

## Caveats

- **History depth:** daily history starts 2026-06-06. Long-horizon forecasting improves as data accumulates.
- **Winsorized prices:** `raw_price`/`graded_price` are Taguchi winsorized means (40% trim), not raw averages — robust to outliers but smoothed.
- **Sparse graded data:** many athletes have few or no graded listings; `graded_*` columns are often empty or based on n=1-3.
- **Static features are snapshot-joined:** `psa_pop`, `*_pop`, and `scp_*` columns hold each athlete's *latest* value on every row — they are not historical. Avoid using them as if they were known on `date` in strict point-in-time training.
- **Survivorship:** athletes appear only while they have (or had) tracked listings.
- **`scp_psa9_price` / `scp_psa10_price` may be entirely empty** until the bi-weekly graded pricing job populates them (gemrate-flagged athletes only).
- **Names:** history keys may lack diacritics (e.g. `Ronald Acuna Jr.`); joins are accent-insensitive, but filter on `name` exactly as it appears in the CSV.

## Loading example

```python
import pandas as pd

df = pd.read_csv(
    "https://raw.githubusercontent.com/<owner>/<repo>/main/data/ml-dataset.csv",
    parse_dates=["date"],
)
df = df.sort_values(["name", "date"])

# Example: per-athlete feature frame for a price-direction classifier
baseball = df[df["sport"] == "Baseball"].dropna(subset=["raw_price"])
```

## Getting started with modeling

A starter notebook and feature pipeline are included in the repo:

- **`notebooks/ml-starter.ipynb`** — ready-to-run Jupyter/Colab notebook with:
  - Data loading and missing-value exploration
  - Volatility clustering baseline (K-Means, standardized per sport)
  - 7-day price-direction classifier (logistic regression + random forest)
  - Group-aware time-series validation
  - Sample prediction export
- **`scripts/ml-features.py`** — command-line feature engineering pipeline:

```bash
python scripts/ml-features.py --input data/ml-dataset.csv --output data/ml-features.parquet
```

This produces a model-ready Parquet file with rolling windows, lagged prices, momentum ratios, and the forward 7-day direction target. All features are point-in-time only — no future leakage.

### Suggested next models

1. **Deal-score ranking** — combine predicted upside, current price, and listing volume to surface underpriced cards.
2. **Graded-price gap predictor** — predict the ratio between graded and raw prices for athletes with enough graded data.
3. **Volatility regime switch detector** — flag athletes moving from stable to high-volatility regimes.

### Modeling caveats

- **Point-in-time only.** `psa_pop`, `bgs_pop`, `sgc_pop`, and `scp_*` are static snapshots joined to every row. Use them as athlete descriptors, not as values known on `date`.
- **Short history.** Daily history begins 2026-06-06. Long-horizon forecasting improves as the dataset grows.
- **Sparse graded data.** Most athletes have few graded listings; raw-price models are more reliable today.
- **Survivorship.** Athletes appear only while tracked listings exist.

## Athlete card scores (`athlete-ml-scores.json`)

`scripts/ml-score-athletes.py` turns the dataset into per-athlete scores displayed as badges on the athlete cards.

Run it with:

```bash
python scripts/ml-score-athletes.py
```

It writes `data/athlete-ml-scores.json` (copied to `public/data/` for the app) with one entry per athlete, using the most recent day available:

| Field | Meaning |
|---|---|
| `predicted_up_7d_prob` | Logistic-regression probability the raw price is higher in 7 days (0–1) |
| `volatility_cluster` | `stable`, `momentum`, or `volatile` (K-Means, k=3, per sport) |
| `deal_score` | 0–100 composite of predicted upside, momentum, liquidity and stability |
| `feature_importance` | Top 3 drivers (`coef x value`), shown in the badge tooltip |
| `scored_at` | Date of the snapshot the score was computed from |

### How the badges read

- `🔮 X% Up` — only shown when the predicted probability is at least 55%.
- `🛡️ Stable` / `⚡ Momentum` / `🌊 Volatile` — volatility cluster.
- `Deal Score` bar — the 0–100 composite under the card header.

Scores refresh with the bi-weekly analysis workflow (`.github/workflows/bi-weekly-analysis.yml`); they are model estimates from historical prices, not investment advice.

### Score history (`athlete-ml-scores-history.json`)

Every scorer run also upserts a dated snapshot into `data/athlete-ml-scores-history.json` (copied to `public/data/`):

```json
{
  "_meta": { "updated_at": "...", "dates": ["2026-09-05"], "snapshots": 1 },
  "history": {
    "2026-09-05": { "Ronald Acuna Jr.": { "deal_score": 38.5, "prob": 0.4058, "cluster": "momentum" } }
  }
}
```

Only the fields the chart needs are stored, and the file keeps the most recent 52 snapshots (about two years of bi-weekly runs); older dates are dropped. The Market Intel page reads it to draw the **ML Deal Tracker**, which plots the 30 highest current Deal Scores over time, one dot per player per run, colored by volatility group.

### 30-day price forecast (`forecast_*` fields)

The same scorer also fits three `GradientBoostingRegressor` models with `loss="quantile"` (alpha 0.1 / 0.5 / 0.9) on `log(raw price 30 days ahead)`, using the identical feature list as the Deal Score classifier. The log target keeps the band proportional to the price level.

| Field | Meaning |
|---|---|
| `forecast_30d_mid` | Median (p50) predicted raw price 30 days out |
| `forecast_30d_low` | 10th-percentile prediction |
| `forecast_30d_high` | 90th-percentile prediction |
| `forecast_band_pct` | `(high - low) / mid`, the relative band width |
| `forecast_confidence` | `high`, `medium` or `low` |
| `forecast_basis_price` | Raw price on the scoring date, for comparison |

Confidence tiers: **high** = band under 25% with at least 60 days of history and 3+ listings; **medium** = band under 50% with at least 30 days of history; **low** otherwise.

Each run logs holdout median absolute percentage error and empirical coverage of the 10–90 band (target ~80%) so the quality of the forecast is visible in the workflow output.

The Market Data table (`/market-data`) renders these as two sortable columns, **Forecast 30d** (central estimate with the range underneath, green above / red below today's raw price) and **Confidence**. Both are included in the CSV export and the hide-empty filters. Model estimates, not investment advice.
