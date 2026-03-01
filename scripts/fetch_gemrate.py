#!/usr/bin/env python3
"""
Scrape gemrate.com for Venezuelan athletes' PSA graded-card stats.
Runs in batches (like ebay-sold-avg) with progress tracking.
Queries PSA grader only for each athlete found in data/athletes.json.
Outputs data/gemrate.json with per-athlete PSA totals.
"""

import json, os, re, time, sys, random
import requests

GEMRATE_URL = "https://www.gemrate.com/player"

BATCH_SIZE = 10  # athletes per run

# Rotate realistic browser User-Agents to reduce Cloudflare blocks
USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
]

# Polite delay range (seconds) between requests
DELAY_MIN = 3
DELAY_MAX = 6

# Max retries per request
MAX_RETRIES = 2

# Sport -> gemrate category mapping
CAT_MAP = {
    "Baseball": "baseball-cards",
    "Soccer": "soccer-cards",
    "Basketball": "basketball-cards",
    "Football": "football-cards",
    "Boxing": "boxing-wrestling-cards-mma",
    "Tennis": "",
    "Golf": "golf-cards",
}


def get_headers():
    """Return headers with a random User-Agent."""
    return {
        "User-Agent": random.choice(USER_AGENTS),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Content-Type": "application/x-www-form-urlencoded",
        "Origin": "https://www.gemrate.com",
        "Referer": "https://www.gemrate.com/player",
        "Connection": "keep-alive",
        "Cache-Control": "no-cache",
    }


def parse_summary(html: str):
    """Extract # of Cards, Total Gems, Total Grades, Gem Rate from the HTML."""
    if "you have been blocked" in html.lower() or "cf-error-details" in html.lower():
        return "blocked"

    if "- Summary" not in html:
        return None

    def extract_stat(label):
        pattern = rf"{re.escape(label)}<br><strong[^>]*>([\d,]+%?)</strong>"
        m = re.search(pattern, html, re.IGNORECASE)
        if not m:
            return None
        val = m.group(1).replace(",", "")
        if "%" in val:
            return float(val.replace("%", ""))
        return int(val)

    cards = extract_stat("# of Cards")
    gems = extract_stat("Total Gems")
    grades = extract_stat("Total Grades")
    gem_rate = extract_stat("Gem Rate")

    if cards is None and gems is None and grades is None:
        return None

    return {
        "cards": cards or 0,
        "gems": gems or 0,
        "grades": grades or 0,
        "gemRate": gem_rate if gem_rate is not None else 0,
    }


def fetch_gemrate(session, player: str, category: str = ""):
    """POST to gemrate.com and return parsed PSA stats or None."""
    data = {
        "player": player,
        "grader": "psa",
        "category": category,
        "submit": "Submit",
    }

    for attempt in range(MAX_RETRIES + 1):
        try:
            resp = session.post(
                GEMRATE_URL,
                data=data,
                headers=get_headers(),
                timeout=30,
            )
            if resp.status_code != 200:
                print(f"  ⚠ HTTP {resp.status_code}", file=sys.stderr)
                if attempt < MAX_RETRIES:
                    time.sleep(10 * (attempt + 1))
                    continue
                return None

            result = parse_summary(resp.text)

            if result == "blocked":
                print(f"  🚫 Cloudflare blocked (attempt {attempt+1})", file=sys.stderr)
                if attempt < MAX_RETRIES:
                    time.sleep(15 * (attempt + 1))
                    continue
                return None

            return result

        except Exception as e:
            print(f"  ⚠ Error: {e}", file=sys.stderr)
            if attempt < MAX_RETRIES:
                time.sleep(10)
                continue
            return None

    return None


def main():
    base_dir = os.path.join(os.path.dirname(__file__), "..")
    athletes_path = os.path.join(base_dir, "data", "athletes.json")
    output_path = os.path.join(base_dir, "data", "gemrate.json")
    public_path = os.path.join(base_dir, "public", "data", "gemrate.json")
    progress_path = os.path.join(base_dir, "data", "gemrate-progress.json")

    with open(athletes_path, "r", encoding="utf-8") as f:
        athletes = json.load(f)

    # Dedupe by name, maintain stable order
    seen = set()
    unique = []
    for a in athletes:
        name = a.get("name", "").strip()
        if name and name not in seen:
            seen.add(name)
            unique.append(a)

    # Load progress
    progress = {"startIdx": 0}
    if os.path.exists(progress_path):
        try:
            with open(progress_path, "r", encoding="utf-8") as f:
                progress = json.load(f)
        except Exception:
            pass

    start_idx = progress.get("startIdx", 0)

    # Wrap around if past the end
    if start_idx >= len(unique):
        start_idx = 0

    end_idx = min(start_idx + BATCH_SIZE, len(unique))
    batch = unique[start_idx:end_idx]

    print(f"📊 Gemrate PSA batch: athletes {start_idx}–{end_idx - 1} of {len(unique)} (batch size {BATCH_SIZE})")

    # Load existing results to merge
    existing_data = {"_meta": {}, "athletes": {}}
    if os.path.exists(output_path):
        try:
            with open(output_path, "r", encoding="utf-8") as f:
                existing_data = json.load(f)
        except Exception:
            pass

    results = existing_data.get("athletes", {})
    session = requests.Session()
    blocked_count = 0

    for i, a in enumerate(batch):
        name = a["name"]
        sport = a.get("sport", "")
        category = CAT_MAP.get(sport, "")
        idx = start_idx + i

        print(f"  [{idx + 1}/{len(unique)}] {name}...", end=" ")
        stats = fetch_gemrate(session, name, category)

        if stats and isinstance(stats, dict) and stats["grades"] > 0:
            results[name] = {
                "name": name,
                "sport": sport,
                "graders": {"PSA": stats},
                "totals": stats,
            }
            print(f"✅ {stats['grades']} grades, {stats['gemRate']}% gem rate")
            blocked_count = 0
        else:
            if stats is None:
                blocked_count += 1
            print("—")

        # Random polite delay
        delay = random.uniform(DELAY_MIN, DELAY_MAX)
        time.sleep(delay)

        # If too many consecutive blocks, pause longer
        if blocked_count > 3:
            print("  ⏸ Multiple blocks, pausing 60s...", file=sys.stderr)
            time.sleep(60)
            blocked_count = 0

    # Compute next batch start
    next_start = end_idx if end_idx < len(unique) else 0

    from datetime import datetime, timezone

    # Save progress
    progress_out = {
        "startIdx": next_start,
        "lastBatchAt": datetime.now(timezone.utc).isoformat(),
        "lastBatchRange": f"{start_idx}-{end_idx - 1}",
        "totalAthletes": len(unique),
    }
    os.makedirs(os.path.dirname(progress_path), exist_ok=True)
    with open(progress_path, "w", encoding="utf-8") as f:
        json.dump(progress_out, f, indent=2)

    # Save output
    output = {
        "_meta": {
            "updatedAt": datetime.now(timezone.utc).isoformat(),
            "athleteCount": len(results),
            "graders": ["PSA"],
            "batchInfo": {
                "startIdx": start_idx,
                "endIdx": end_idx,
                "totalAthletes": len(unique),
            },
        },
        "athletes": results,
    }

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    os.makedirs(os.path.dirname(public_path), exist_ok=True)

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    with open(public_path, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(f"\n✅ Batch done! {len(results)} total athletes with PSA data. Next batch starts at index {next_start}.")


if __name__ == "__main__":
    main()
