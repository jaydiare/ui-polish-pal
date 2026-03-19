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

FOCUS_SPORT = "Baseball"

print(f"📊 Analysis period: {period_start} → {period_end}")
print(f"   Focus sport: {FOCUS_SPORT}")
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

    # Filter: only include the focus sport
    if sport and sport != FOCUS_SPORT:
        continue
    if not sport:
        # Try to match from athletes list; skip unknowns
        continue

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
    "focusSport": FOCUS_SPORT,
    "totalAthletes": len(history),
    "baseballAthletesAnalyzed": len(top_movers),
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

print(f"   Baseball athletes analyzed: {len(top_movers)}")
print(f"   Anomalies: {len(anomalies)}")

# ---------------------------------------------------------------------------
# 3. LLM narrative generation (Google Gemini free tier)
# ---------------------------------------------------------------------------

def call_gemini(prompt, api_key, max_retries=2):
    """Call Gemini API with conservative backoff to stay within free-tier limits.
    
    Free-tier limits (Gemini 2.5 Flash):
      - 5 requests per minute (RPM)
      - ~20 requests per day (RPD)
      - ~200K input tokens per minute (TPM)
    We only make 1 request per run, so RPD is fine.
    Retries use 60s+ gaps to respect RPM.
    """
    import requests, time

    url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"
    headers = {"Content-Type": "application/json"}
    params = {"key": api_key}

    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.7,
            "maxOutputTokens": 1500,
            "responseMimeType": "application/json",
        },
    }

    for attempt in range(max_retries + 1):
        resp = requests.post(url, headers=headers, params=params, json=payload, timeout=90)
        if resp.status_code == 429 and attempt < max_retries:
            wait = 60 * (attempt + 1)  # 60s, 120s
            print(f"   ⏳ Rate limited, retrying in {wait}s (attempt {attempt + 1}/{max_retries})...")
            time.sleep(wait)
            continue
        resp.raise_for_status()
        break

    data = resp.json()
    text = data["candidates"][0]["content"]["parts"][0]["text"]
    return json.loads(text)


def build_prompt(stats):
    return f"""You are a sports card market analyst specializing in Venezuelan baseball players.
Analyze this bi-weekly BASEBALL-ONLY market data and produce a JSON report with these fields:

- "headline": A punchy one-line market headline (max 15 words)
- "summary": 2-3 paragraph market overview focused on baseball cards (plain text, ~150 words)
- "keyInsights": Array of 3-4 bullet-point insights (strings)
- "baseballOutlook": A 2-3 sentence outlook for the Venezuelan baseball card market
- "watchList": Array of 3 baseball player names worth watching and why (objects with "name" and "reason")
- "riskAlerts": Array of any concerning trends (strings), empty if none

Data for {stats['period']['start']} to {stats['period']['end']}:

BASEBALL: {json.dumps(stats['sportSummary'], separators=(',',':'))}

GAINERS: {json.dumps([{{'name':g['name'],'chg':g['listedPriceChange'],'price':g['listedPrice']}} for g in stats['topMovers']['gainers'][:3]], separators=(',',':'))}

LOSERS: {json.dumps([{{'name':l['name'],'chg':l['listedPriceChange'],'price':l['listedPrice']}} for l in stats['topMovers']['losers'][:3]], separators=(',',':'))}

VOLATILE: {json.dumps([{{'name':v['name'],'cv':v['cv'],'price':v['listedPrice']}} for v in stats['mostVolatile'][:3]], separators=(',',':'))}

ANOMALIES: {json.dumps([{{'name':a['name'],'reason':a['reason']}} for a in stats['anomalies'][:5]], separators=(',',':'))}

CHEAPEST: {json.dumps([{{'name':c['name'],'price':c['listedPrice']}} for c in stats['cheapestListed'][:3]], separators=(',',':'))}

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
        "focusSport": FOCUS_SPORT,
        "version": "1.1",
        "llmUsed": narrative is not None,
    },
    "stats": stats,
}

if narrative:
    output["narrative"] = narrative

# ---------------------------------------------------------------------------
# 5. Generate plain-text summary
# ---------------------------------------------------------------------------

lines = []
lines.append(f"=== VZLA Sports Baseball Market Report ===")
lines.append(f"Period: {period_start} → {period_end}")
lines.append(f"Baseball athletes analyzed: {len(top_movers)}")
lines.append("")

if sport_summary.get(FOCUS_SPORT):
    s = sport_summary[FOCUS_SPORT]
    lines.append(f"Avg listed price: ${s['avgPrice']:.2f}  |  Median: ${s['medianPrice']:.2f}  |  Avg change: {s['avgChange']:+.1f}%")
    lines.append("")

gainers = stats["topMovers"]["gainers"][:5]
losers = stats["topMovers"]["losers"][:5]

if gainers:
    lines.append("TOP GAINERS:")
    for g in gainers:
        lines.append(f"  ▲ {g['name']}: {g['listedPriceChange']:+.1f}% (${g['listedPrice']:.2f})")
    lines.append("")

if losers:
    lines.append("TOP LOSERS:")
    for l in losers:
        lines.append(f"  ▼ {l['name']}: {l['listedPriceChange']:+.1f}% (${l['listedPrice']:.2f})")
    lines.append("")

if anomalies:
    lines.append(f"ANOMALIES ({len(anomalies)}):")
    for a in anomalies[:5]:
        reasons = "; ".join(a.get("reason", []))
        lines.append(f"  ⚠ {a['name']}: {reasons}")
    lines.append("")

if stats["cheapestListed"]:
    lines.append("VALUE PICKS (cheapest listed):")
    for c in stats["cheapestListed"][:5]:
        lines.append(f"  💰 {c['name']}: ${c['listedPrice']:.2f}")
    lines.append("")

if narrative:
    lines.append("AI NARRATIVE:")
    lines.append(narrative.get("headline", ""))
    lines.append("")
    lines.append(narrative.get("summary", ""))

text_summary = "\n".join(lines)
output["textSummary"] = text_summary

out_path = OUT_DIR / f"{date_stamp}_vzlasports.json"
out_path.write_text(json.dumps(output, indent=2, ensure_ascii=False), encoding="utf-8")

print(f"\n{text_summary}")
print(f"\n✅ Wrote {out_path.relative_to(ROOT)}")
