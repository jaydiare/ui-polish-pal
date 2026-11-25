#!/usr/bin/env python3
"""Build the compact Venezuelan MLB biography lookup used by athlete popups."""

import csv
import json
import re
import unicodedata
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "data" / "biofile0.csv"
OUTPUTS = [ROOT / "data" / "venezuelan-bios.json", ROOT / "public" / "data" / "venezuelan-bios.json"]
SUFFIXES = ("Jr", "Sr", "II", "III", "IV", "V")
VENEZUELAN_HERITAGE_IDS = {"luzaj001"}

# Preferred roster names that cannot be derived exactly from the source fields.
ROSTER_ALIASES = {
    "isaias chavez": "chavn101",
    "ray monzant": "monzr101",
    "kennedy corona": "corok001",
}


def normalize(value: str) -> str:
    value = unicodedata.normalize("NFKD", value or "")
    value = "".join(char for char in value if not unicodedata.combining(char))
    return re.sub(r"[^a-z0-9]+", " ", value.lower()).strip()


def source_aliases(row: dict[str, str]) -> set[str]:
    usename = row["usename"].strip()
    lastname = row["lastname"].strip()
    fullname = row["fullname"].strip()
    base = f"{usename} {lastname}".strip()

    clean_full = re.sub(r"\([^)]*\)", " ", fullname)
    full_parts = clean_full.split()
    suffix = ""
    if full_parts and full_parts[-1].rstrip(".") in SUFFIXES:
        suffix = full_parts[-1].rstrip(".")
        full_parts = full_parts[:-1]

    names = {base, fullname}
    if suffix:
        names.add(f"{base} {suffix}")
    if len(full_parts) >= 2:
        first_and_last = f"{full_parts[0]} {full_parts[-1]}"
        names.add(first_and_last)
        if suffix:
            names.add(f"{first_and_last} {suffix}")
    return {normalize(name) for name in names if normalize(name)}


def integer_or_none(value: str) -> int | None:
    return int(value) if value and value.isdigit() else None


def main() -> None:
    players: dict[str, dict[str, object]] = {}
    alias_candidates: dict[str, set[str]] = defaultdict(set)

    with SOURCE.open(encoding="utf-8-sig", newline="") as source_file:
        for row in csv.DictReader(source_file):
            if row.get("birthcountry") != "Venezuela" and row.get("id") not in VENEZUELAN_HERITAGE_IDS:
                continue

            player_id = row["id"]
            display_name = f"{row['usename'].strip()} {row['lastname'].strip()}".strip()
            players[player_id] = {
                "name": display_name,
                "bats": row.get("bats", ""),
                "throws": row.get("throws", ""),
                "height": integer_or_none(row.get("height", "")),
                "weight": integer_or_none(row.get("weight", "")),
                "hof": row.get("HOF", ""),
                "debut": row.get("debut_p", ""),
                "last": row.get("last_p", ""),
                "birthCity": row.get("birthcity", ""),
                "birthState": row.get("birthstate", ""),
            }
            for alias in source_aliases(row):
                alias_candidates[alias].add(player_id)

    aliases = {
        alias: next(iter(ids))
        for alias, ids in alias_candidates.items()
        if len(ids) == 1
    }
    for alias, player_id in ROSTER_ALIASES.items():
        if player_id in players:
            aliases[normalize(alias)] = player_id

    result = {
        "_meta": {"source": "biofile0.csv", "players": len(players)},
        "players": dict(sorted(players.items())),
        "aliases": dict(sorted(aliases.items())),
    }
    serialized = json.dumps(result, ensure_ascii=False, separators=(",", ":")) + "\n"
    for output in OUTPUTS:
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(serialized, encoding="utf-8")

    print(f"Built {len(players)} Venezuelan biographies with {len(aliases)} safe aliases")
    print(f"Compact size: {len(serialized.encode('utf-8')):,} bytes")


if __name__ == "__main__":
    main()
