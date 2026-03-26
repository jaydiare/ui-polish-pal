from __future__ import annotations

import json
import re
import tempfile
from pathlib import Path

import streamlit as st

from universal_card_odds_analyzer_v3 import (
    ChecklistEntry,
    apply_manual_odds,
    asdict,
    estimate_specific_card_odds,
    export_csv,
    extract_text,
    find_matches,
    match_odds,
    parse_checklist,
    parse_manual_odds,
    parse_odds,
    pretty_odds,
    preview_text,
    summarize,
)

st.set_page_config(page_title="Universal Sports Card Checklist Analyzer", layout="wide")
st.title("Universal Sports Card Checklist Analyzer")
st.caption("Upload a checklist from Topps, Bowman, Panini, Upper Deck, Leaf, or other manufacturers. Add an odds sheet if you have one.")


def save_uploaded_file(uploaded) -> str:
    suffix = Path(uploaded.name).suffix or ".txt"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(uploaded.read())
        return tmp.name


with st.sidebar:
    st.header("Inputs")
    checklist_file = st.file_uploader("Checklist file", type=["pdf", "txt", "csv"])
    odds_file = st.file_uploader("Odds file (optional)", type=["pdf", "txt", "csv"])
    athlete = st.text_input("Athlete name", placeholder="Ronald Acuña Jr.")
    format_name = st.selectbox("Format", ["auto-detect", "hobby", "jumbo", "retail", "blaster", "mega", "choice", "FOTL"])
    packs_per_box = st.number_input("Packs per box (optional)", min_value=0, value=0)
    boxes_per_case = st.number_input("Boxes per case (optional)", min_value=0, value=12)
    include_standard = st.checkbox("Show standard cards too", value=True)
    show_preview = st.checkbox("Show parsed text preview", value=True)
    manual = st.text_area(
        "Manual odds overrides (optional)",
        placeholder="gold=1:480\nautograph=1:24\ndowntown=1:2400",
        height=120,
    )

run = st.button("Analyze", type="primary", use_container_width=True)

if run:
    if not checklist_file or not athlete.strip():
        st.error("Please upload a checklist and enter an athlete name.")
        st.stop()

    checklist_path = save_uploaded_file(checklist_file)
    checklist_text = extract_text(checklist_path)
    if show_preview:
        with st.expander("Parsed checklist text preview", expanded=False):
            st.text(preview_text(checklist_text))
    entries = parse_checklist(checklist_text)
    matches = find_matches(entries, athlete)

    odds_entries = []
    if odds_file:
        odds_path = save_uploaded_file(odds_file)
        try:
            odds_entries = parse_odds(extract_text(odds_path))
        except Exception as exc:
            st.warning(f"Could not parse odds file cleanly: {exc}")

    section_counts = {}
    for m in matches:
        section_counts[m.section] = section_counts.get(m.section, 0) + 1

    fmt = None if format_name == "auto-detect" else format_name.lower()
    ppb = None if packs_per_box == 0 else int(packs_per_box)
    bpc = None if boxes_per_case == 0 else int(boxes_per_case)

    for m in matches:
        matched = match_odds(m, odds_entries, fmt, ppb, bpc)
        if matched:
            oe, pack_equiv = matched
            m.matched_odds = asdict(oe)
            m.estimated_pack_odds = estimate_specific_card_odds(pack_equiv, section_counts[m.section])

    manual_lines = [line.strip() for line in manual.splitlines() if line.strip()]
    manual_odds = parse_manual_odds(manual_lines)
    if manual_odds:
        apply_manual_odds(matches, manual_odds, ppb, bpc)

    matches.sort(key=lambda e: (e.score, -(e.serial_number or 999999)), reverse=True)
    visible = matches if include_standard else [m for m in matches if m.rarity_tier != "standard"]

    st.subheader("Summary")
    st.json(summarize(matches), expanded=True)

    if not matches:
        st.warning("No matching athlete entries were found.")
        st.stop()

    st.subheader("Best card options")
    elite = [m for m in visible if m.rarity_tier == "elite"]
    premium = [m for m in visible if m.rarity_tier == "premium"]
    notable = [m for m in visible if m.rarity_tier == "notable"]

    for label, group in [("Elite", elite), ("Premium", premium), ("Notable", notable)]:
        if not group:
            continue
        with st.expander(f"{label} ({len(group)})", expanded=(label == "Elite")):
            for g in group:
                st.markdown(
                    f"**{g.athlete}**  \\n"
                    f"Section: `{g.section}`  \\n"
                    f"Line: `{g.raw_text}`  \\n"
                    f"Types: {', '.join(g.card_types)}  \\n"
                    f"Serial: {g.serial_number if g.serial_number else 'n/a'}  \\n"
                    f"Estimated odds: {pretty_odds(g.estimated_pack_odds)}"
                )

    st.subheader("All matching cards")
    records = []
    for m in visible:
        records.append({
            "section": m.section,
            "card_code": m.card_code,
            "athlete": m.athlete,
            "team": m.team,
            "line": m.raw_text,
            "types": ", ".join(m.card_types),
            "serial": m.serial_number,
            "tier": m.rarity_tier,
            "score": m.score,
            "estimated_odds": pretty_odds(m.estimated_pack_odds),
        })
    st.dataframe(records, use_container_width=True)

    payload = {
        "athlete": athlete,
        "summary": summarize(matches),
        "results": [
            {
                **asdict(m),
                "display_odds": pretty_odds(m.estimated_pack_odds),
            }
            for m in matches
        ],
    }
    st.download_button(
        "Download JSON results",
        data=json.dumps(payload, indent=2, ensure_ascii=False),
        file_name="card_analysis_results.json",
        mime="application/json",
        use_container_width=True,
    )
