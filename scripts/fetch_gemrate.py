#!/usr/bin/env python3
"""
Scrape gemrate.com for Venezuelan athletes' graded-card stats.
Queries PSA, Beckett (bgs), and SGC for each athlete found in data/athletes.json.
Outputs data/gemrate.json with per-athlete, per-grader totals.
"""

import json, os, re, time, sys
import requests

GEMRATE_URL = "https://www.gemrate.com/player"
GRADERS = ["psa", "bgs", "sgc"]  # bgs = Beckett on gemrate
GRADER_LABELS = {"psa": "PSA", "bgs": "Beckett", "sgc": "SGC"}

HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; VzlaCardBot/1.0)",
    "Content-Type": "application/x-www-form-urlencoded",
    "Accept": "text/html",
}

# Rate-limit: polite 2s between requests
DELAY = 2


def parse_summary(html: str):
    """Extract # of Cards, Total Gems, Total Grades, Gem Rate from the HTML."""
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


def fetch_gemrate(player: str, grader: str, category: str = ""):
    """POST to gemrate.com and return parsed stats or None."""
    data = {"player": player, "grader": grader, "category": category, "submit": "Submit"}
    try:
        resp = requests.post(GEMRATE_URL, data=data, headers=HEADERS, timeout=30)
        if resp.status_code != 200:
            return None
        return parse_summary(resp.text)
    except Exception as e:
        print(f"  ⚠ Error fetching {player}/{grader}: {e}", file=sys.stderr)
        return None


def main():
    athletes_path = os.path.join(os.path.dirname(__file__), "..", "data", "athletes.json")
    output_path = os.path.join(os.path.dirname(__file__), "..", "data", "gemrate.json")
    public_path = os.path.join(os.path.dirname(__file__), "..", "public", "data", "gemrate.json")

    with open(athletes_path, "r", encoding="utf-8") as f:
        athletes = json.load(f)

    # Dedupe by name
    seen = set()
    unique = []
    for a in athletes:
        name = a.get("name", "").strip()
        if name and name not in seen:
            seen.add(name)
            unique.append(a)

    print(f"📊 Fetching Gemrate data for {len(unique)} athletes across {len(GRADERS)} graders...")

    results = {}
    total_requests = len(unique) * len(GRADERS)
    done = 0

    for a in unique:
        name = a["name"]
        sport = a.get("sport", "")
        # Map sport to gemrate category
        cat_map = {
            "Baseball": "baseball-cards",
            "Soccer": "soccer-cards",
            "Basketball": "basketball-cards",
            "Football": "football-cards",
            "Boxing": "boxing-wrestling-cards-mma",
            "Tennis": "",
            "Golf": "golf-cards",
        }
        category = cat_map.get(sport, "")

        athlete_data = {"name": name, "sport": sport, "graders": {}}
        has_data = False

        for grader in GRADERS:
            done += 1
            print(f"  [{done}/{total_requests}] {name} / {GRADER_LABELS[grader]}...", end=" ")
            stats = fetch_gemrate(name, grader, category)
            if stats and stats["grades"] > 0:
                athlete_data["graders"][GRADER_LABELS[grader]] = stats
                has_data = True
                print(f"✅ {stats['grades']} grades")
            else:
                print("—")
            time.sleep(DELAY)

        if has_data:
            # Compute totals across all graders
            total_cards = sum(g["cards"] for g in athlete_data["graders"].values())
            total_gems = sum(g["gems"] for g in athlete_data["graders"].values())
            total_grades = sum(g["grades"] for g in athlete_data["graders"].values())
            avg_gem_rate = round(total_gems / total_grades * 100, 1) if total_grades > 0 else 0

            athlete_data["totals"] = {
                "cards": total_cards,
                "gems": total_gems,
                "grades": total_grades,
                "gemRate": avg_gem_rate,
            }
            results[name] = athlete_data

    # Add metadata
    from datetime import datetime, timezone
    output = {
        "_meta": {
            "updatedAt": datetime.now(timezone.utc).isoformat(),
            "athleteCount": len(results),
            "graders": list(GRADER_LABELS.values()),
        },
        "athletes": results,
    }

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    os.makedirs(os.path.dirname(public_path), exist_ok=True)

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    with open(public_path, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(f"\n✅ Done! {len(results)} athletes with grading data saved.")


if __name__ == "__main__":
    main()
