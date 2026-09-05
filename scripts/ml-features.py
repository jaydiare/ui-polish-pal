#!/usr/bin/env python3
"""
Build a model-ready feature frame from data/ml-dataset.csv.

Usage:
    python scripts/ml-features.py --input data/ml-dataset.csv --output data/ml-features.parquet

Output columns include point-in-time rolling features and a forward-looking
7-day price-direction target. No future information is leaked into features.
"""

import argparse
from pathlib import Path

import numpy as np
import pandas as pd


def build_features(df: pd.DataFrame) -> pd.DataFrame:
    """Add rolling/lagged features and the 7-day direction target per athlete."""
    df = df.copy()
    df["date"] = pd.to_datetime(df["date"])
    df = df.sort_values(["name", "date"])

    def per_athlete(group: pd.DataFrame) -> pd.DataFrame:
        group = group.sort_values("date")

        # Lagged prices (point-in-time)
        group["raw_price_lag_7"] = group["raw_price"].shift(7)
        group["raw_price_lag_14"] = group["raw_price"].shift(14)
        group["raw_price_lag_30"] = group["raw_price"].shift(30)

        # Rolling means / momentum
        group["raw_price_ma_7"] = group["raw_price"].rolling(7, min_periods=3).mean()
        group["raw_price_ma_14"] = group["raw_price"].rolling(14, min_periods=5).mean()
        group["raw_price_ma_30"] = group["raw_price"].rolling(30, min_periods=5).mean()
        group["raw_volume_ma_7"] = group["raw_n_listings"].rolling(7, min_periods=3).mean()
        group["raw_volume_ma_30"] = group["raw_n_listings"].rolling(30, min_periods=5).mean()

        # Ratios vs moving averages
        group["raw_price_vs_ma_7"] = group["raw_price"] / group["raw_price_ma_7"] - 1
        group["raw_price_vs_ma_30"] = group["raw_price"] / group["raw_price_ma_30"] - 1

        # Target: price higher 7 days from now?
        group["target_up_7d"] = (group["raw_price"].shift(-7) > group["raw_price"]).astype("Int8")

        return group

    df = df.groupby("name", group_keys=False).apply(per_athlete)
    return df


def main() -> None:
    parser = argparse.ArgumentParser(description="Build ML features from ml-dataset.csv")
    parser.add_argument("--input", default="data/ml-dataset.csv", help="Path to ml-dataset.csv")
    parser.add_argument("--output", default="data/ml-features.parquet", help="Output parquet path")
    args = parser.parse_args()

    input_path = Path(args.input)
    output_path = Path(args.output)

    if not input_path.exists():
        raise FileNotFoundError(f"Input file not found: {input_path}")

    print(f"Loading {input_path}...")
    df = pd.read_csv(input_path, parse_dates=["date"])

    print("Building features...")
    featured = build_features(df)

    feature_cols = [
        "raw_price", "raw_cv", "raw_n_listings", "raw_index",
        "raw_price_chg_7d_pct", "raw_price_chg_30d_pct", "raw_return_vol_7d",
        "days_on_market", "days_since_first_seen",
        "raw_price_lag_7", "raw_price_lag_14", "raw_price_lag_30",
        "raw_price_ma_7", "raw_price_ma_14", "raw_price_ma_30",
        "raw_volume_ma_7", "raw_volume_ma_30",
        "raw_price_vs_ma_7", "raw_price_vs_ma_30",
    ]

    # Only keep rows that have both a target and complete core features
    model_ready = featured.dropna(subset=["target_up_7d"] + feature_cols).copy()

    print(f"Rows before filtering: {len(featured):,}")
    print(f"Rows after filtering:  {len(model_ready):,}")
    print(f"Athletes: {model_ready['name'].nunique():,}")
    print(f"Target rate (price up in 7d): {model_ready['target_up_7d'].mean():.3f}")

    output_path.parent.mkdir(parents=True, exist_ok=True)
    model_ready.to_parquet(output_path, index=False)
    print(f"Saved {output_path}")


if __name__ == "__main__":
    main()
