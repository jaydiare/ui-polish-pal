# ML Deal Tracker on Market Intel

Add a new chart to the Market Intel page that tracks the top ML Deal Scores over time, with one dot per player and player names on the chart.

## What the user sees

A new section on Market Intel, placed after the existing listed-raw vs listed-graded scatter:

- **Title:** ML Deal Tracker
- **X axis:** date of each scoring run
- **Y axis:** Deal Score (0 to 100)
- One dot per player per run, colored by volatility group (stable / momentum / volatile)
- Player names shown next to the dots for the latest run so the chart reads at a glance
- Top 30 players by current Deal Score only, so names stay readable
- Same pin-then-click behaviour as the other charts: tap a dot to pin a card showing the player, date, Deal Score, predicted 7-day upside, and top drivers; the pinned card has a link to search that player on eBay
- Short methodology note under the chart explaining that scores are model estimates from historical prices, not investment advice
- On the first run the chart shows a single column of dots (one date). It fills out into trend lines as more dated snapshots accumulate every two weeks.

## Technical detail

### 1. Score history file
`scripts/ml-score-athletes.py` gains an append step: after writing `data/athlete-ml-scores.json`, it reads `data/athlete-ml-scores-history.json`, upserts an entry keyed by `scored_at` date, and writes it back.

Shape kept small on purpose (only what the chart needs):

```text
{
  "_meta": { "updated_at": "...", "dates": ["2026-09-05", ...] },
  "history": {
    "2026-09-05": {
      "Ronald Acuna Jr.": { "deal_score": 38.5, "prob": 0.41, "cluster": "momentum" },
      ...
    }
  }
}
```

Retention: keep the most recent 52 dated snapshots (two years of bi-weekly runs) and drop older ones.

### 2. Workflow
`.github/workflows/bi-weekly-analysis.yml`: copy `data/athlete-ml-scores-history.json` into `public/data/` and add both paths to `git add`, alongside the existing score file.

### 3. Data hook
Extend `src/hooks/useAthleteMlScores.ts` with a second hook, `useAthleteMlScoreHistory()`, following the same pattern (raw GitHub URL first, `/data/...` fallback, module-level cache). Returns `{ history, dates, loading, error }`.

### 4. Chart component
New `src/components/MlDealTracker.tsx`:

- Recharts `ScatterChart` with a numeric time X axis and a 0 to 100 Y axis
- Selects the top 30 players by Deal Score on the most recent date, then plots every historical point for those players
- Dot color from the volatility cluster, reusing the badge colors already used on athlete cards
- Latest-date dots carry a `LabelList` with the player name (hidden below `sm` breakpoint to avoid clutter on phones; names appear in the pinned card instead)
- Pinned tooltip modelled on `PinnedScatterTooltip` in `src/pages/Data.tsx`
- Empty state when the history file is missing or has no dates
- Respects reduced-motion (`isAnimationActive={false}`, matching the existing charts)

### 5. Page wiring
`src/pages/Data.tsx` renders `<MlDealTracker />` in a card matching the surrounding sections.

### 6. i18n
New EN/ES keys in `src/i18n/translations.ts`: section title, axis labels, cluster legend labels (reuse existing `ml.volatility*` keys), pinned-card labels, empty state, and the methodology note.

### 7. Docs
Append a short subsection to `docs/ML-DATASET.md` describing `athlete-ml-scores-history.json` and its retention rule.

## Out of scope
- No backfill of past dates: history starts with the current run, since older score snapshots were never saved.
- No change to how the scores themselves are computed.
