# Rename ML Deal Tracker and Show Top 10 Only

Rename the Market Intel "ML Deal Tracker" section to "Vzla Sports Elite Hot Players to Invest In" and reduce the displayed players from 30 to 10.

## What changes

- `src/components/MlDealTracker.tsx`: change `TOP_N` from `30` to `10`.
- `src/i18n/translations.ts`:
  - EN: rename `mlTracker.title` to "Vzla Sports Elite Hot Players to Invest In".
  - EN: update `mlTracker.subtitle` and `mlTracker.subtitleFirstRun` to say "10 highest Deal Scores" instead of "30 highest".
  - ES: add matching Spanish translations for the new title and updated subtitles.
- Keep all existing behavior: dot colors by volatility cluster, pin-then-click card, eBay search link, methodology note, and reduced-motion settings.

## Out of scope
- No changes to the scoring model, history file format, or workflow schedule.
- No changes to the chart type or axis layout.
