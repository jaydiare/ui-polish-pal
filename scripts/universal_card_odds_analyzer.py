#!/usr/bin/env python3
"""Universal sports card checklist analyzer.

Features
- Works with many checklist/odds PDFs or TXT files, not just Bowman.
- Finds all entries for a requested athlete.
- Scores cards by desirability/rareness using generic rules.
- Parses serial numbering like /99 or 1/1.
- Optionally parses odds text and matches likely odds lines by keywords.
- Supports manual odds overrides.

Example:
    python universal_card_odds_analyzer.py \
      --checklist checklist.pdf \
      --odds odds.pdf \
      --athlete "Ronald Acuna Jr" \
      --format hobby
"""
from __future__ import annotations

import argparse
import csv
import json
import math
import re
import sys
from dataclasses import dataclass, asdict, field
from difflib import SequenceMatcher
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Tuple

try:
    import PyPDF2
except Exception:  # pragma: no cover
    PyPDF2 = None

SECTION_HINTS = [
    "base", "insert", "autograph", "auto", "relic", "memorabilia", "variation",
    "parallel", "prizm", "refractor", "signatures", "prospects", "rookie",
    "image variation", "short print", "ssp", "case hit", "downtown", "kaboom",
]

CARD_TYPE_KEYWORDS = {
    "autograph": ["autograph", "autographs", "auto", "signature", "signatures", "signed"],
    "relic": ["relic", "memorabilia", "memorablia", "patch", "jersey", "material"],
    "variation": ["variation", "image variation", "photo variation", "sp", "ssp", "super short print"],
    "parallel": [
        "parallel", "refractor", "prizm", "mojo", "x-fractor", "wave", "shimmer",
        "gold", "orange", "red", "blue", "green", "black", "purple", "pink", "sepia",
        "silver", "teal", "aqua", "gold vinyl", "superfractor", "finite", "nebula",
    ],
    "insert": [
        "insert", "downtown", "kaboom", "color blast", "bomb squad", "net marvels",
        "my house", "stained glass", "planetary pursuit", "adios", "spotlight", "ascension",
    ],
    "base": ["base", "base cards"],
}

ELITE_KEYWORDS = [
    "1/1", "superfractor", "gold vinyl", "black finite", "finite", "nebula",
    "shield", "laundry tag", "logoman",
]
PREMIUM_KEYWORDS = [
    "autograph", "signature", "patch auto", "rpa", "booklet", "downtown", "kaboom",
    "color blast", "stained glass", "ssp", "super short print", "case hit",
]
STRONG_COLOR_KEYWORDS = ["gold", "orange", "red", "black", "green", "blue", "purple"]

HEADER_CLEAN_RE = re.compile(r"[^A-Za-z0-9#/\- ]+")
CARD_CODE_RE = re.compile(r"^(#?[A-Z]{1,6}[\- ]?[A-Z0-9]{0,5}|\d{1,4}[A-Z]?)$")
SERIAL_RE = re.compile(r"(?:^|\s)(1/1|/\d{1,4}|#\d{1,4}|numbered to \d{1,4}|limited to \d{1,4})(?:\b|$)", re.I)
ODDS_RE = re.compile(
    r"(?P<name>.+?)\s+(?:(?P<label>odds|pack odds|hobby odds|retail odds|jumbo odds|blaster odds)\s*)?"
    r"(?P<ratio>1\s*:\s*[\d,]+|one\s*in\s*[\d,]+)\s*(?P<unit>packs?|boxes?|cases?)?",
    re.I,
)


@dataclass
class ChecklistEntry:
    section: str
    card_code: Optional[str]
    athlete: str
    team: Optional[str]
    raw_text: str
    card_types: List[str] = field(default_factory=list)
    serial_number: Optional[int] = None
    rarity_tier: str = "standard"
    score: int = 0
    matched_odds: Optional[dict] = None
    estimated_pack_odds: Optional[float] = None


@dataclass
class OddsEntry:
    name: str
    ratio_value: float
    unit: str
    format_name: Optional[str] = None
    raw_text: str = ""


def extract_text(path: str) -> str:
    p = Path(path)
    suffix = p.suffix.lower()
    if suffix == ".txt":
        return p.read_text(encoding="utf-8", errors="ignore")
    if suffix == ".csv":
        return p.read_text(encoding="utf-8", errors="ignore")
    if suffix == ".pdf":
        if PyPDF2 is None:
            raise RuntimeError("PyPDF2 is required to read PDF files.")
        text_parts: List[str] = []
        with p.open("rb") as f:
            reader = PyPDF2.PdfReader(f)
            for page in reader.pages:
                text_parts.append(page.extract_text() or "")
        return "\n".join(text_parts)
    raise ValueError(f"Unsupported file type: {suffix}")


def normalize_spaces(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def normalize_name(text: str) -> str:
    text = text.lower()
    text = text.replace("á", "a").replace("é", "e").replace("í", "i").replace("ó", "o").replace("ú", "u").replace("ñ", "n")
    text = re.sub(r"[^a-z0-9 ]+", " ", text)
    return normalize_spaces(text)


def similarity(a: str, b: str) -> float:
    return SequenceMatcher(None, normalize_name(a), normalize_name(b)).ratio()


def looks_like_header(line: str) -> bool:
    s = normalize_spaces(line)
    if len(s) < 3 or len(s) > 80:
        return False
    letters = re.sub(r"[^A-Za-z]", "", s)
    if not letters:
        return False
    upper_ratio = sum(1 for c in s if c.isupper()) / max(1, sum(1 for c in s if c.isalpha()))
    hint = any(h in s.lower() for h in SECTION_HINTS)
    return upper_ratio > 0.6 or hint


def tokenize(line: str) -> List[str]:
    line = normalize_spaces(line)
    return line.split(" ")


def detect_card_types(text: str, section: str) -> List[str]:
    hay = f"{section} {text}".lower()
    found: List[str] = []
    for ctype, keywords in CARD_TYPE_KEYWORDS.items():
        if any(k in hay for k in keywords):
            found.append(ctype)
    if not found:
        found.append("unknown")
    # collapse if auto relic
    if "autograph" in found and "relic" in found:
        found = ["autograph", "relic"] + [x for x in found if x not in {"autograph", "relic"}]
    return found


def parse_serial_number(text: str) -> Optional[int]:
    lower = text.lower()
    if "1/1" in lower:
        return 1
    m = re.search(r"/(\d{1,4})\b", lower)
    if m:
        return int(m.group(1))
    m = re.search(r"(?:numbered|limited) to (\d{1,4})\b", lower)
    if m:
        return int(m.group(1))
    return None


def rarity_from_text(text: str, serial: Optional[int], card_types: List[str]) -> Tuple[str, int]:
    lower = text.lower()
    score = 0
    tier = "standard"

    if any(k in lower for k in ELITE_KEYWORDS) or serial == 1:
        return "elite", 100

    if any(k in lower for k in PREMIUM_KEYWORDS):
        score += 45
        tier = "premium"

    if "autograph" in card_types:
        score += 30
        tier = max_tier(tier, "premium")
    if "relic" in card_types:
        score += 20
        tier = max_tier(tier, "premium")
    if "variation" in card_types:
        score += 15
        tier = max_tier(tier, "notable")

    if serial is not None:
        if serial <= 5:
            return "elite", max(score, 95)
        if serial <= 10:
            return "elite", max(score, 90)
        if serial <= 25:
            return "premium", max(score, 80)
        if serial <= 50:
            return "premium", max(score, 72)
        if serial <= 99:
            return "notable", max(score, 62)
        if serial <= 199:
            return "notable", max(score, 55)

    if any(color in lower for color in STRONG_COLOR_KEYWORDS):
        score += 10
        tier = max_tier(tier, "notable")

    if "insert" in card_types:
        score += 6
    if "parallel" in card_types:
        score += 8

    score = max(score, 35 if tier == "premium" else 20 if tier == "notable" else 10)
    return tier, score


def max_tier(a: str, b: str) -> str:
    order = {"standard": 0, "notable": 1, "premium": 2, "elite": 3}
    return a if order[a] >= order[b] else b


def parse_checklist(text: str) -> List[ChecklistEntry]:
    lines = [normalize_spaces(x) for x in text.splitlines()]
    lines = [x for x in lines if x]
    current_section = "Uncategorized"
    entries: List[ChecklistEntry] = []

    for line in lines:
        if looks_like_header(line):
            current_section = HEADER_CLEAN_RE.sub("", line).strip() or current_section
            continue

        tokens = tokenize(line)
        if len(tokens) < 2:
            continue

        card_code = None
        start_idx = 0
        if CARD_CODE_RE.match(tokens[0]):
            card_code = tokens[0]
            start_idx = 1

        remaining = tokens[start_idx:]
        if len(remaining) < 2:
            continue

        athlete, team = split_athlete_team(remaining)
        if not athlete:
            continue

        raw_text = line
        card_types = detect_card_types(raw_text, current_section)
        serial = parse_serial_number(raw_text + " " + current_section)
        tier, score = rarity_from_text(raw_text + " " + current_section, serial, card_types)
        entries.append(
            ChecklistEntry(
                section=current_section,
                card_code=card_code,
                athlete=athlete,
                team=team,
                raw_text=raw_text,
                card_types=card_types,
                serial_number=serial,
                rarity_tier=tier,
                score=score,
            )
        )
    return dedupe_entries(entries)


def split_athlete_team(tokens: List[str]) -> Tuple[Optional[str], Optional[str]]:
    # Heuristic: last 1-4 tokens often team, especially when they include symbols or common team words.
    joined = " ".join(tokens)
    for tail in range(4, 0, -1):
        if len(tokens) <= tail:
            continue
        athlete = " ".join(tokens[:-tail])
        team = " ".join(tokens[-tail:])
        if plausible_person_name(athlete):
            return athlete, team
    athlete = " ".join(tokens)
    if plausible_person_name(athlete):
        return athlete, None
    return None, None


def plausible_person_name(text: str) -> bool:
    parts = text.split()
    if len(parts) < 2 or len(parts) > 6:
        return False
    alpha_words = [p for p in parts if re.search(r"[A-Za-z]", p)]
    if len(alpha_words) < 2:
        return False
    return True


def dedupe_entries(entries: List[ChecklistEntry]) -> List[ChecklistEntry]:
    seen = set()
    out = []
    for e in entries:
        key = (normalize_name(e.section), normalize_name(e.athlete), normalize_name(e.raw_text))
        if key in seen:
            continue
        seen.add(key)
        out.append(e)
    return out


def parse_odds(text: str) -> List[OddsEntry]:
    entries: List[OddsEntry] = []
    for raw in text.splitlines():
        line = normalize_spaces(raw)
        if not line:
            continue
        m = ODDS_RE.search(line)
        if not m:
            continue
        ratio = m.group("ratio").lower().replace(" ", "")
        if ratio.startswith("onein"):
            value = float(ratio.replace("onein", "").replace(",", ""))
        else:
            try:
                value = float(ratio.split(":")[1].replace(",", ""))
            except Exception:
                continue
        name = normalize_spaces(m.group("name"))
        unit = (m.group("unit") or "packs").lower()
        fmt = None
        line_lower = line.lower()
        for candidate in ["hobby", "jumbo", "retail", "blaster", "mega", "choice", "fat pack", "hanger", "fotl"]:
            if candidate in line_lower:
                fmt = candidate
                break
        entries.append(OddsEntry(name=name, ratio_value=value, unit=unit, format_name=fmt, raw_text=line))
    return entries


def to_pack_equivalent(odds: OddsEntry, packs_per_box: Optional[int], boxes_per_case: Optional[int]) -> float:
    unit = odds.unit.rstrip("s")
    if unit == "pack":
        return odds.ratio_value
    if unit == "box":
        if packs_per_box:
            return odds.ratio_value * packs_per_box
        return odds.ratio_value
    if unit == "case":
        if packs_per_box and boxes_per_case:
            return odds.ratio_value * packs_per_box * boxes_per_case
        if packs_per_box:
            return odds.ratio_value * packs_per_box * 12
        return odds.ratio_value
    return odds.ratio_value


def match_odds(entry: ChecklistEntry, odds_entries: List[OddsEntry], fmt: Optional[str], packs_per_box: Optional[int], boxes_per_case: Optional[int]) -> Optional[Tuple[OddsEntry, float]]:
    if not odds_entries:
        return None
    candidates = []
    hay = normalize_name(entry.section + " " + entry.raw_text + " " + " ".join(entry.card_types))
    for oe in odds_entries:
        if fmt and oe.format_name and fmt.lower() not in oe.format_name.lower():
            continue
        name_score = similarity(hay, oe.name)
        kw_bonus = 0.0
        oe_norm = normalize_name(oe.name)
        for word in set(hay.split()):
            if len(word) > 3 and word in oe_norm:
                kw_bonus += 0.02
        total = name_score + kw_bonus
        candidates.append((total, oe))
    if not candidates:
        return None
    candidates.sort(key=lambda x: x[0], reverse=True)
    best_score, best = candidates[0]
    if best_score < 0.28:
        return None
    return best, to_pack_equivalent(best, packs_per_box, boxes_per_case)


def estimate_specific_card_odds(section_pack_odds: float, section_match_count: int) -> float:
    return section_pack_odds * max(1, section_match_count)


def find_matches(entries: List[ChecklistEntry], athlete: str, threshold: float = 0.88) -> List[ChecklistEntry]:
    athlete_norm = normalize_name(athlete)
    out: List[ChecklistEntry] = []
    for e in entries:
        name_norm = normalize_name(e.athlete)
        if athlete_norm in name_norm or name_norm in athlete_norm or similarity(athlete_norm, name_norm) >= threshold:
            out.append(e)
    return out


def apply_manual_odds(entries: List[ChecklistEntry], manual_odds: Dict[str, float], packs_per_box: Optional[int], boxes_per_case: Optional[int]) -> None:
    for e in entries:
        best_key = None
        best_score = 0.0
        target = normalize_name(e.section + " " + e.raw_text)
        for label, pack_odds in manual_odds.items():
            score = similarity(target, label)
            if label in target:
                score += 0.2
            if score > best_score:
                best_score = score
                best_key = label
        if best_key and best_score >= 0.35:
            e.matched_odds = {"name": best_key, "raw_text": f"manual: {best_key}", "unit": "packs"}
            e.estimated_pack_odds = float(manual_odds[best_key])


def parse_manual_odds(items: List[str]) -> Dict[str, float]:
    result: Dict[str, float] = {}
    for item in items:
        if "=" not in item:
            continue
        label, value = item.split("=", 1)
        label = normalize_name(label)
        value = value.strip().lower().replace(",", "")
        m = re.match(r"1:(\d+(?:\.\d+)?)", value)
        if m:
            result[label] = float(m.group(1))
            continue
        m = re.match(r"(\d+(?:\.\d+)?)\s*packs?", value)
        if m:
            result[label] = float(m.group(1))
            continue
    return result


def summarize(entries: List[ChecklistEntry]) -> dict:
    by_tier: Dict[str, int] = {}
    by_type: Dict[str, int] = {}
    for e in entries:
        by_tier[e.rarity_tier] = by_tier.get(e.rarity_tier, 0) + 1
        for t in e.card_types:
            by_type[t] = by_type.get(t, 0) + 1
    return {"count": len(entries), "by_tier": by_tier, "by_type": by_type}


def export_csv(entries: List[ChecklistEntry], path: str) -> None:
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=[
                "section", "card_code", "athlete", "team", "raw_text", "card_types",
                "serial_number", "rarity_tier", "score", "matched_odds_name",
                "estimated_pack_odds",
            ],
        )
        writer.writeheader()
        for e in entries:
            writer.writerow({
                "section": e.section,
                "card_code": e.card_code,
                "athlete": e.athlete,
                "team": e.team,
                "raw_text": e.raw_text,
                "card_types": ", ".join(e.card_types),
                "serial_number": e.serial_number,
                "rarity_tier": e.rarity_tier,
                "score": e.score,
                "matched_odds_name": (e.matched_odds or {}).get("name") if e.matched_odds else None,
                "estimated_pack_odds": e.estimated_pack_odds,
            })


def pretty_odds(value: Optional[float]) -> str:
    if value is None:
        return "unknown"
    return f"1 in {int(round(value)):,} packs"


def main() -> int:
    parser = argparse.ArgumentParser(description="Universal sports card checklist analyzer")
    parser.add_argument("--checklist", required=True, help="Path to checklist PDF/TXT/CSV")
    parser.add_argument("--odds", help="Optional odds PDF/TXT/CSV")
    parser.add_argument("--athlete", required=True, help="Athlete name to search")
    parser.add_argument("--format", dest="format_name", default=None, help="Optional format filter: hobby, jumbo, retail, blaster, etc.")
    parser.add_argument("--packs-per-box", type=int, default=None)
    parser.add_argument("--boxes-per-case", type=int, default=12)
    parser.add_argument("--manual-odds", action="append", default=[], help='Manual odds override like "gold=1:480" or "downtown=240 packs"')
    parser.add_argument("--csv-out", help="Optional CSV export path")
    parser.add_argument("--json-out", help="Optional JSON export path")
    args = parser.parse_args()

    checklist_text = extract_text(args.checklist)
    entries = parse_checklist(checklist_text)
    matches = find_matches(entries, args.athlete)
    matches.sort(key=lambda e: (e.score, -(e.serial_number or 999999)), reverse=True)

    odds_entries: List[OddsEntry] = []
    if args.odds:
        try:
            odds_entries = parse_odds(extract_text(args.odds))
        except Exception as exc:
            print(f"Warning: could not parse odds file: {exc}", file=sys.stderr)

    section_counts: Dict[str, int] = {}
    for m in matches:
        section_counts[m.section] = section_counts.get(m.section, 0) + 1

    for m in matches:
        matched = match_odds(m, odds_entries, args.format_name, args.packs_per_box, args.boxes_per_case)
        if matched:
            oe, pack_equiv = matched
            m.matched_odds = asdict(oe)
            m.estimated_pack_odds = estimate_specific_card_odds(pack_equiv, section_counts[m.section])

    manual_odds = parse_manual_odds(args.manual_odds)
    if manual_odds:
        apply_manual_odds(matches, manual_odds, args.packs_per_box, args.boxes_per_case)

    payload = {
        "athlete": args.athlete,
        "summary": summarize(matches),
        "results": [
            {
                **asdict(m),
                "display_odds": pretty_odds(m.estimated_pack_odds),
            }
            for m in matches
        ],
    }

    if args.json_out:
        Path(args.json_out).write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    if args.csv_out:
        export_csv(matches, args.csv_out)

    print(json.dumps(payload, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
