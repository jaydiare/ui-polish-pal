#!/usr/bin/env python3
"""
Train lightweight ML models on data/ml-dataset.csv and export per-athlete
scores to data/athlete-ml-scores.json for display on athlete cards.

Scores (latest day per athlete):
  - predicted_up_7d_prob: probability raw price is higher in 7 days
  - volatility_cluster: stable | momentum | volatile
  - deal_score: 0-100 composite of upside, liquidity, and stability
  - feature_importance: top 3 drivers for the prediction

Usage:
    python scripts/ml-score-athletes.py
"""

import json
import warnings
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import GroupShuffleSplit
from sklearn.preprocessing import StandardScaler


warnings.filterwarnings("ignore")

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
INPUT_CSV = DATA_DIR / "ml-dataset.csv"
OUTPUT_JSON = DATA_DIR / "athlete-ml-scores.json"
HISTORY_JSON = DATA_DIR / "athlete-ml-scores-history.json"
HISTORY_MAX_SNAPSHOTS = 52


def load_data(path: Path) -> pd.DataFrame:
    if not path.exists():
        raise FileNotFoundError(f"Input not found: {path}")
    df = pd.read_csv(path, parse_dates=["date"])
    df = df.sort_values(["name", "date"]).reset_index(drop=True)
    return df


def build_features(df: pd.DataFrame) -> pd.DataFrame:
    """Add point-in-time rolling features and the forward target."""
    frames = []
    for _, group in df.groupby("name"):
        g = group.sort_values("date").copy()

        # Lagged prices
        g["raw_price_lag_7"] = g["raw_price"].shift(7)
        g["raw_price_lag_14"] = g["raw_price"].shift(14)
        g["raw_price_lag_30"] = g["raw_price"].shift(30)

        # Moving averages
        g["raw_price_ma_7"] = g["raw_price"].rolling(7, min_periods=3).mean()
        g["raw_price_ma_14"] = g["raw_price"].rolling(14, min_periods=5).mean()
        g["raw_price_ma_30"] = g["raw_price"].rolling(30, min_periods=5).mean()
        g["raw_volume_ma_7"] = g["raw_n_listings"].rolling(7, min_periods=3).mean()
        g["raw_volume_ma_30"] = g["raw_n_listings"].rolling(30, min_periods=5).mean()

        # Ratios vs moving averages
        g["raw_price_vs_ma_7"] = g["raw_price"] / g["raw_price_ma_7"] - 1
        g["raw_price_vs_ma_30"] = g["raw_price"] / g["raw_price_ma_30"] - 1

        # Target: price higher 7 days from now?
        g["target_up_7d"] = (g["raw_price"].shift(-7) > g["raw_price"]).astype("Int8")

        # Target: actual raw price 30 days from now (regression / quantiles)
        g["target_price_30d"] = g["raw_price"].shift(-30)

        # Depth of usable history at each point in time
        g["history_days"] = np.arange(1, len(g) + 1)


        frames.append(g)

    return pd.concat(frames, ignore_index=True)


def grouped_time_series_split(df: pd.DataFrame, n_splits: int = 1, test_size: float = 0.2):
    """Train on earlier dates, test on later dates; no athlete overlap."""
    df = df.copy()
    df["date_ordinal"] = df["date"].map(pd.Timestamp.toordinal)
    # Use the median date per athlete as a group-level time proxy
    athlete_dates = df.groupby("name")["date_ordinal"].median().reset_index()
    splitter = GroupShuffleSplit(n_splits=n_splits, test_size=test_size, random_state=42)
    for train_idx, test_idx in splitter.split(athlete_dates, groups=athlete_dates["name"]):
        train_names = set(athlete_dates.loc[train_idx, "name"])
        test_names = set(athlete_dates.loc[test_idx, "name"])
        train = df[df["name"].isin(train_names)].copy()
        test = df[df["name"].isin(test_names)].copy()
        # Enforce temporal ordering: test dates > train dates
        train_cutoff = train["date"].quantile(0.85)
        test = test[test["date"] > train_cutoff]
        if len(test) > 0:
            yield train, test


def train_classifier(df: pd.DataFrame) -> tuple[LogisticRegression, list[str]]:
    feature_cols = [
        "raw_price",
        "raw_cv",
        "raw_n_listings",
        "raw_index",
        "days_on_market",
        "days_since_first_seen",
        "raw_price_chg_7d_pct",
        "raw_price_chg_30d_pct",
        "raw_return_vol_7d",
        "raw_price_lag_7",
        "raw_price_lag_14",
        "raw_price_lag_30",
        "raw_price_ma_7",
        "raw_price_ma_14",
        "raw_price_ma_30",
        "raw_volume_ma_7",
        "raw_volume_ma_30",
        "raw_price_vs_ma_7",
        "raw_price_vs_ma_30",
    ]

    model_df = df.dropna(subset=["target_up_7d"] + feature_cols).copy()
    if len(model_df) < 200:
        raise ValueError(f"Not enough labeled rows for training: {len(model_df)}")

    X = model_df[feature_cols].values
    y = model_df["target_up_7d"].astype(int).values

    # Standardize
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # Cross-validate
    accs = []
    for train, test in grouped_time_series_split(model_df):
        train_idx = model_df.index.isin(train.index)
        test_idx = model_df.index.isin(test.index)
        if test_idx.sum() < 20:
            continue
        clf = LogisticRegression(max_iter=1000, class_weight="balanced", random_state=42)
        clf.fit(X_scaled[train_idx], y[train_idx])
        accs.append(clf.score(X_scaled[test_idx], y[test_idx]))

    # Final model on all data
    clf = LogisticRegression(max_iter=1000, class_weight="balanced", random_state=42)
    clf.fit(X_scaled, y)

    print(f"Classifier trained on {len(model_df)} rows / {model_df['name'].nunique()} athletes")
    if accs:
        print(f"Grouped time-series accuracy: {np.mean(accs):.3f} (+/- {np.std(accs):.3f})")
    else:
        print("Could not form a grouped time-series test split (too little data).")

    return clf, feature_cols, scaler


QUANTILES = {"low": 0.1, "mid": 0.5, "high": 0.9}


def train_quantile_models(df: pd.DataFrame, feature_cols: list[str]) -> dict:
    """
    Fit three gradient-boosted quantile regressors on log(price 30 days ahead).
    Log target keeps the band proportional to the price level.
    """
    model_df = df.dropna(subset=["target_price_30d"] + feature_cols).copy()
    model_df = model_df[(model_df["target_price_30d"] > 0) & (model_df["raw_price"] > 0)]
    if len(model_df) < 300:
        print(f"Not enough rows for the 30-day forecast ({len(model_df)}); skipping.")
        return {}

    X = model_df[feature_cols].values
    y = np.log(model_df["target_price_30d"].values.astype(float))

    # Hold out later dates for observability
    cutoff = model_df["date"].quantile(0.85)
    train_mask = (model_df["date"] <= cutoff).values
    test_mask = ~train_mask

    models = {}
    for key, alpha in QUANTILES.items():
        m = GradientBoostingRegressor(
            loss="quantile",
            alpha=alpha,
            n_estimators=200,
            max_depth=3,
            learning_rate=0.05,
            random_state=42,
        )
        m.fit(X, y)
        models[key] = m

    print(f"Quantile forecaster trained on {len(model_df):,} rows / {model_df['name'].nunique()} athletes")

    if test_mask.sum() >= 50:
        eval_models = {}
        for key, alpha in QUANTILES.items():
            m = GradientBoostingRegressor(
                loss="quantile",
                alpha=alpha,
                n_estimators=200,
                max_depth=3,
                learning_rate=0.05,
                random_state=42,
            )
            m.fit(X[train_mask], y[train_mask])
            eval_models[key] = m

        y_true = np.exp(y[test_mask])
        pred_mid = np.exp(eval_models["mid"].predict(X[test_mask]))
        pred_low = np.exp(eval_models["low"].predict(X[test_mask]))
        pred_high = np.exp(eval_models["high"].predict(X[test_mask]))

        mdape = float(np.median(np.abs(pred_mid - y_true) / np.maximum(y_true, 1e-6)) * 100)
        coverage = float(np.mean((y_true >= pred_low) & (y_true <= pred_high)) * 100)
        print(f"Holdout median abs pct error: {mdape:.1f}%")
        print(f"Holdout 10-90 band coverage: {coverage:.1f}% (target ~80%)")
    else:
        print("Holdout too small to evaluate the forecast band.")

    return models


def confidence_tier(band_pct: float, history_days: float, n_listings: float) -> str:
    if band_pct is None or not np.isfinite(band_pct):
        return "low"
    if band_pct < 0.25 and history_days >= 60 and n_listings >= 3:
        return "high"
    if band_pct < 0.50 and history_days >= 30:
        return "medium"
    return "low"





def train_volatility_clusters(df: pd.DataFrame) -> tuple[KMeans, StandardScaler]:
    cluster_cols = ["raw_cv", "raw_return_vol_7d", "raw_price_chg_7d_pct"]
    cluster_df = df.dropna(subset=cluster_cols).copy()
    if len(cluster_df) < 100:
        raise ValueError(f"Not enough rows for clustering: {len(cluster_df)}")

    # Standardize per sport
    cluster_df["cluster_group"] = cluster_df["sport"].fillna("Other")
    scaled = []
    scalers = {}
    for sport, g in cluster_df.groupby("cluster_group"):
        if len(g) < 10:
            continue
        scaler = StandardScaler()
        vals = scaler.fit_transform(g[cluster_cols].values)
        scalers[sport] = scaler
        g_scaled = g.copy()
        g_scaled[[f"{c}_std" for c in cluster_cols]] = vals
        scaled.append(g_scaled)

    if not scaled:
        raise ValueError("Not enough data per sport to standardize clusters")

    scaled_df = pd.concat(scaled, ignore_index=True)
    X = scaled_df[[f"{c}_std" for c in cluster_cols]].values

    kmeans = KMeans(n_clusters=3, random_state=42, n_init=10)
    kmeans.fit(X)

    # Label clusters by their centroid characteristics
    centroids = kmeans.cluster_centers_
    # cv and vol are positive; price_chg can be negative
    # Order by (cv + vol) ascending -> stable, momentum, volatile
    labels = ["stable", "momentum", "volatile"]
    order = np.argsort(centroids[:, 0] + centroids[:, 1])
    label_map = {old: labels[i] for i, old in enumerate(order)}
    kmeans.label_map_ = label_map
    kmeans.sport_scalers_ = scalers

    cluster_labels = np.array([label_map[l] for l in kmeans.labels_])
    print("Volatility cluster sizes:")
    for label, count in zip(*np.unique(cluster_labels, return_counts=True)):
        print(f"  {label}: {count}")

    return kmeans, cluster_cols


def predict_cluster(row: pd.Series, kmeans: KMeans, cluster_cols: list[str]) -> str:
    sport = row.get("sport", "Other") or "Other"
    scaler = kmeans.sport_scalers_.get(sport)
    if scaler is None:
        scaler = list(kmeans.sport_scalers_.values())[0]
    vals = row[cluster_cols].values.reshape(1, -1)
    scaled = scaler.transform(vals)
    raw_label = kmeans.predict(scaled)[0]
    return kmeans.label_map_[raw_label]


def compute_deal_score(row: pd.Series, prob: float, cluster: str) -> float:
    """
    Composite 0-100 score:
    - Higher predicted probability -> higher score
    - Recent momentum helps
    - Reasonable listing volume adds liquidity premium
    - Very high CV / volatile cluster penalizes slightly
    """
    score = prob * 60  # up to 60 points

    chg_7d = row.get("raw_price_chg_7d_pct") or 0
    chg_30d = row.get("raw_price_chg_30d_pct") or 0
    score += np.clip(chg_7d / 5, -10, 10)  # +/- 10
    score += np.clip(chg_30d / 10, -10, 10)  # +/- 10

    n_listings = row.get("raw_n_listings") or 0
    score += np.clip(n_listings / 5, 0, 10)  # up to 10 for liquidity

    if cluster == "volatile":
        score -= 5
    elif cluster == "stable":
        score += 5

    return float(np.clip(score, 0, 100))


def top_features(clf: LogisticRegression, feature_cols: list[str], row_values: np.ndarray) -> list[dict]:
    """Return top 3 feature drivers for this prediction using coefficient * value."""
    coefs = clf.coef_[0]
    contributions = coefs * row_values
    order = np.argsort(-np.abs(contributions))[:3]
    return [{"feature": feature_cols[i], "impact": float(contributions[i])} for i in order]


def append_history(records: dict) -> None:
    """Upsert today's scores into the dated history file (bi-weekly snapshots)."""
    history = {}
    if HISTORY_JSON.exists():
        try:
            with open(HISTORY_JSON) as f:
                loaded = json.load(f)
            history = loaded.get("history", {}) or {}
        except (json.JSONDecodeError, OSError):
            history = {}

    dates = {r.get("scored_at") for r in records.values() if r.get("scored_at")}
    snapshot_date = max(dates) if dates else pd.Timestamp.utcnow().strftime("%Y-%m-%d")

    history[snapshot_date] = {
        name: {
            "deal_score": rec["deal_score"],
            "prob": rec["predicted_up_7d_prob"],
            "cluster": rec["volatility_cluster"],
        }
        for name, rec in records.items()
    }

    kept = sorted(history.keys())[-HISTORY_MAX_SNAPSHOTS:]
    history = {d: history[d] for d in kept}

    payload = {
        "_meta": {
            "updated_at": pd.Timestamp.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
            "dates": kept,
            "snapshots": len(kept),
        },
        "history": history,
    }

    with open(HISTORY_JSON, "w") as f:
        json.dump(payload, f, indent=2)

    print(f"History now holds {len(kept)} snapshot(s) -> {HISTORY_JSON}")


def main() -> None:
    print(f"Loading {INPUT_CSV}...")
    df = load_data(INPUT_CSV)
    print(f"Rows: {len(df):,}, Athletes: {df['name'].nunique():,}, Dates: {df['date'].nunique():,}")

    print("Building features...")
    df = build_features(df)

    print("Training classifier...")
    clf, feature_cols, scaler = train_classifier(df)

    print("Training volatility clusters...")
    kmeans, cluster_cols = train_volatility_clusters(df)

    print("Training 30-day quantile forecaster...")
    quantile_models = train_quantile_models(df, feature_cols)

    print("Scoring latest day per athlete...")
    latest = df.loc[df.groupby("name")["date"].idxmax()].copy()
    latest = latest.dropna(subset=feature_cols)

    X_latest = latest[feature_cols].values
    X_latest_scaled = scaler.transform(X_latest)
    probs = clf.predict_proba(X_latest_scaled)[:, 1]

    if quantile_models:
        q_low = np.exp(quantile_models["low"].predict(X_latest))
        q_mid = np.exp(quantile_models["mid"].predict(X_latest))
        q_high = np.exp(quantile_models["high"].predict(X_latest))
        # Keep the band monotonic even if quantile models cross
        q_low, q_high = np.minimum(q_low, q_high), np.maximum(q_low, q_high)
        q_mid = np.clip(q_mid, q_low, q_high)
    else:
        q_low = q_mid = q_high = np.full(len(latest), np.nan)


    records = {}
    for i, (_, row) in enumerate(latest.iterrows()):
        name = row["name"]
        prob = float(probs[i])
        cluster = predict_cluster(row, kmeans, cluster_cols)
        deal = compute_deal_score(row, prob, cluster)
        drivers = top_features(clf, feature_cols, X_latest_scaled[i])

        records[name] = {
            "predicted_up_7d_prob": round(prob, 4),
            "volatility_cluster": cluster,
            "deal_score": round(deal, 1),
            "feature_importance": drivers,
            "scored_at": row["date"].strftime("%Y-%m-%d"),
        }

    output = {
        "_meta": {
            "generated_at": pd.Timestamp.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
            "source": str(INPUT_CSV),
            "athletes_scored": len(records),
            "model": "LogisticRegression",
            "cluster_model": "KMeans(k=3)",
        },
        "athletes": records,
    }

    OUTPUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_JSON, "w") as f:
        json.dump(output, f, indent=2)

    print(f"Wrote {len(records)} athlete scores to {OUTPUT_JSON}")

    append_history(records)


if __name__ == "__main__":
    main()
