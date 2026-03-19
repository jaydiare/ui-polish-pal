#!/usr/bin/env python3
"""
Bi-weekly market analysis for VZLA Sports Elite.

Loads athlete history + current market data, computes statistical insights,
then calls Google Gemini (free tier) to generate a narrative report.
Output: data/analysis/YYYYMMDD_vzlasports.json

Usage:
  python scripts/bi-weekly-analysis.py          # full run
  SKIP_LLM=1 python scripts/bi-weekly-analysis.py  # stats only, no Gemini call
"""

import json, os, sys, statistics
from datetime import datetime, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
OUT_DIR = DATA / "analysis"
OUT_DIR.mkdir(exist_ok=True)

# ---------------------------------------------------------------------------
# 1. Load data
# ---------------------------------------------------------------------------

def load_json(path):
    try:
        return json.loads(path.read_text("utf-8"))
    except Exception:
        return None

history = load_json(DATA / "athlete-history.json") or {}
ebay_avg = load_json(DATA / "ebay-avg.json") or {}
ebay_sold = load_json(DATA / "ebay-sold-avg.json") or {}
ebay_graded = load_json(DATA / "ebay-graded-avg.json") or {}
index_hist = load_json(DATA / "index-history.json") or []
athletes_list = load_json(DATA / "athletes.json") or []
gemrate = load_json(DATA / "gemrate.json")
market_data = load_json(DATA / "vzla-athlete-market-data.json")

today = datetime.now(tz=None)  # UTC in CI
date_stamp = today.strftime("%Y%m%d")
period_start = (today - timedelta(days=14)).strftime("%Y-%m-%d")
period_end = today.strftime("%Y-%m-%d")

print(f"📊 Analysis period: {period_start} → {period_end}")
print(f"   Athletes in history: {len(history)}")

# ---------------------------------------------------------------------------
# 2. Compute statistical insights
# ---------------------------------------------------------------------------

def safe_pct(old, new):
    if old is None or new is None or old == 0:
        return None
    return round((new - old) / old * 100, 2)

top_movers = []       # biggest price changes
most_volatile = []    # highest CV
cheapest_listed = []  # best value opportunities
most_liquid = []      # shortest days on market
anomalies = []        # unusual movements

sport_agg = {}  # sport -> { prices: [], changes: [] }

for name, entries in history.items():
    if len(entries) < 2:
        continue

    # Get entries within this analysis window (last 14 days)
    recent = [e for e in entries if e.get("date", "") >= period_start]
    if len(recent) < 2:
        recent = entries[-2:]  # fallback: compare last two snapshots

    first = recent[0]
    last = recent[-1]

    first_price = first.get("raw", {}).get("price")
    last_price = last.get("raw", {}).get("price")
    pct_change = safe_pct(first_price, last_price)

    # Sold price
    first_sold = first.get("sold")
    last_sold = last.get("sold")
    sold_change = safe_pct(first_sold, last_sold)

    # CV (stability)
    cv = last.get("raw", {}).get("cv")

    # Days on market
    dom = last.get("raw", {}).get("days")

    # Listing count
    n = last.get("raw", {}).get("n", 0)

    # Sport lookup
    sport = None
    for a in athletes_list:
        if a.get("name") == name:
            sport = a.get("sport")
            break

    rec = {
        "name": name,
        "sport": sport or "Unknown",
        "listedPrice": last_price,
        "soldPrice": last_sold,
        "listedPriceChange": pct_change,
        "soldPriceChange": sold_change,
        "cv": cv,
        "daysOnMarket": dom,
        "listings": n,
        "dataPoints": len(recent),
    }

    if pct_change is not None:
        top_movers.append(rec)

    if cv is not None and cv > 0:
        most_volatile.append(rec)

    if last_price is not None and last_price > 0:
        cheapest_listed.append(rec)

    if dom is not None and dom > 0:
        most_liquid.append(rec)

    # Anomaly: >50% price change or CV > 1.0
    if (pct_change is not None and abs(pct_change) > 50) or (cv is not None and cv > 1.0):
        anomalies.append({
            **rec,
            "reason": []
        })
        if pct_change is not None and abs(pct_change) > 50:
            anomalies[-1]["reason"].append(f"Price moved {pct_change:+.1f}%")
        if cv is not None and cv > 1.0:
            anomalies[-1]["reason"].append(f"Very high volatility (CV={cv:.2f})")

    # Sport aggregation
    if sport and last_price:
        agg = sport_agg.setdefault(sport, {"prices": [], "changes": [], "names": []})
        agg["prices"].append(last_price)
        agg["names"].append(name)
        if pct_change is not None:
            agg["changes"].append(pct_change)

# Sort and pick top items
top_movers.sort(key=lambda x: abs(x["listedPriceChange"] or 0), reverse=True)
most_volatile.sort(key=lambda x: x["cv"] or 0, reverse=True)
cheapest_listed.sort(key=lambda x: x["listedPrice"] or 999999)
most_liquid.sort(key=lambda x: x["daysOnMarket"] or 999999)

# Sport summaries
sport_summary = {}
for sport, agg in sport_agg.items():
    sport_summary[sport] = {
        "athleteCount": len(agg["prices"]),
        "avgPrice": round(statistics.mean(agg["prices"]), 2) if agg["prices"] else None,
        "medianPrice": round(statistics.median(agg["prices"]), 2) if agg["prices"] else None,
        "avgChange": round(statistics.mean(agg["changes"]), 2) if agg["changes"] else None,
    }

# Index trend (last entries)
index_trend = []
for entry in index_hist[-7:]:
    index_trend.append({
        "date": entry.get("date"),
        "all": entry.get("All"),
        "baseball": entry.get("Baseball"),
        "soccer": entry.get("Soccer"),
        "basketball": entry.get("Basketball"),
    })

# Build the stats payload
stats = {
    "period": {"start": period_start, "end": period_end},
    "totalAthletes": len(history),
    "athletesAnalyzed": len(top_movers) + len([e for e in history.values() if len(e) < 2]),
    "sportSummary": sport_summary,
    "indexTrend": index_trend,
    "topMovers": {
        "gainers": [m for m in top_movers[:10] if (m["listedPriceChange"] or 0) > 0],
        "losers": [m for m in top_movers[:10] if (m["listedPriceChange"] or 0) < 0],
    },
    "mostVolatile": most_volatile[:10],
    "cheapestListed": cheapest_listed[:10],
    "mostLiquid": most_liquid[:10],
    "anomalies": anomalies[:15],
}

print(f"   Top movers: {len(top_movers)}")
print(f"   Anomalies: {len(anomalies)}")
print(f"   Sports tracked: {list(sport_summary.keys())}")

# ---------------------------------------------------------------------------
# 3. LLM narrative generation (Google Gemini free tier)
# ---------------------------------------------------------------------------

def call_gemini(prompt, api_key, max_retries=4):
    """Call Gemini API with exponential backoff for rate limits."""
    import requests, time

    url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"
    headers = {"Content-Type": "application/json"}
    params = {"key": api_key}

    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.7,
            "maxOutputTokens": 2000,
            "responseMimeType": "application/json",
        },
    }

    for attempt in range(max_retries + 1):
        resp = requests.post(url, headers=headers, params=params, json=payload, timeout=60)
        if resp.status_code == 429 and attempt < max_retries:
            wait = 2 ** attempt * 15  # 15s, 30s, 60s, 120s
            print(f"   ⏳ Rate limited, retrying in {wait}s (attempt {attempt + 1}/{max_retries})...")
            time.sleep(wait)
            continue
        resp.raise_for_status()
        break

    data = resp.json()
    text = data["candidates"][0]["content"]["parts"][0]["text"]
    return json.loads(text)


def build_prompt(stats):
    return f"""You are a sports card market analyst for Venezuelan athletes.
Analyze this bi-weekly market data and produce a JSON report with these fields:

- "headline": A punchy one-line market headline (max 15 words)
- "summary": 2-3 paragraph market overview (plain text, ~150 words)
- "keyInsights": Array of 3-5 bullet-point insights (strings)
- "sportOutlook": Object with sport names as keys, each a 1-2 sentence outlook
- "watchList": Array of 3-5 athlete names worth watching and why (objects with "name" and "reason")
- "riskAlerts": Array of any concerning trends (strings), empty if none

Market data for {stats['period']['start']} to {stats['period']['end']}:

SPORT SUMMARY:
{json.dumps(stats['sportSummary'], indent=2)}

INDEX TREND (recent):
{json.dumps(stats['indexTrend'], indent=2)}

TOP GAINERS:
{json.dumps(stats['topMovers']['gainers'][:5], indent=2)}

TOP LOSERS:
{json.dumps(stats['topMovers']['losers'][:5], indent=2)}

MOST VOLATILE:
{json.dumps(stats['mostVolatile'][:5], indent=2)}

ANOMALIES:
{json.dumps(stats['anomalies'][:10], indent=2)}

CHEAPEST LISTED (value opportunities):
{json.dumps(stats['cheapestListed'][:5], indent=2)}

Return ONLY valid JSON matching the schema above."""


narrative = None
api_key = os.environ.get("GEMINI_API_KEY", "")
skip_llm = os.environ.get("SKIP_LLM", "")

if skip_llm:
    print("   ⏩ Skipping LLM (SKIP_LLM set)")
elif not api_key:
    print("   ⚠️  GEMINI_API_KEY not set — skipping narrative generation")
    print("      Get a free key at https://ai.google.dev and add as GitHub secret")
else:
    try:
        print("   🤖 Calling Gemini for narrative...")
        prompt = build_prompt(stats)
        narrative = call_gemini(prompt, api_key)
        print("   ✅ Narrative generated")
    except Exception as e:
        print(f"   ❌ Gemini call failed: {e}")
        narrative = None

# ---------------------------------------------------------------------------
# 4. Build final output
# ---------------------------------------------------------------------------

output = {
    "_meta": {
        "generatedAt": today.isoformat() + "Z",
        "period": {"start": period_start, "end": period_end},
        "version": "1.0",
        "llmUsed": narrative is not None,
    },
    "stats": stats,
}

if narrative:
    output["narrative"] = narrative

out_path = OUT_DIR / f"{date_stamp}_vzlasports.json"
out_path.write_text(json.dumps(output, indent=2, ensure_ascii=False), encoding="utf-8")

print(f"\n✅ Wrote {out_path.relative_to(ROOT)}")
