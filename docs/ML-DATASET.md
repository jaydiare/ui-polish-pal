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
