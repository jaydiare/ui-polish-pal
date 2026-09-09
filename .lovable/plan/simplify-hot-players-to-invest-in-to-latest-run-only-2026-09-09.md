# Simplify "Hot Players to Invest In" to Latest Run Only

## Problem

The ML Deal Tracker chart on Market Intel was designed for a single scoring run. Now that the history file has multiple runs (2026-09-05 and 2026-09-07, 545 athletes each), it switches to a timeline scatter: faded dots from past runs plus current dots with name labels. With only 2 days between runs the dots overlap, names collide, and the chart is hard to read.

## What changes

- `src/components/MlDealTracker.tsx`: always render the latest run only, using the existing ranked layout (players listed top to bottom by Deal Score, dot colored by volatility group). Remove the multi-date timeline mode and the `singleDate` branching.
- Keep everything else: top 10 players, volatility colors and legend, tap-a-player card with Deal Score, upside %, group, and eBay search link, methodology note, EN/ES text.
- The history file keeps accumulating runs untouched, so a timeline or "risers/fallers" view can be added later without re-collecting data.

## Newsletter idea (future)

A paid/newsletter subscription with the full analysis would need user accounts and email delivery. That is a separate, larger feature — when you are ready, we would enable Lovable Cloud (logins, database, email). Not included in this plan.

## Out of scope

- No changes to the scoring script, workflow schedule, or history file format.
- No newsletter/subscription functionality yet.

## Technical details

- Delete the timeline branch: `olderPoints`, `xDomain`, time-based `XAxis`, `LabelList`, and the `singleDate` conditionals; always use the category Y-axis (player names) + Deal Score X-axis layout.
- `points` memo simplifies to: take `history[latestDate]`, sort by deal_score, take top 10.
- No i18n changes needed: existing `mlTracker.*` keys already cover the ranked layout; optionally drop the now-unused timeline subtitle key.
