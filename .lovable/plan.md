# Career Stats in the Price History Popup (Baseball Only)

Add a compact career stat line under the athlete's name inside the price history modal, for Baseball athletes only.

## What the user sees

- Open the price history popup for a Baseball athlete: under the name and the "Price history · Baseball · Team" line, a small strip of career totals appears.
- Hitters show: Games, Hits, Home Runs, RBI, Batting Average, OPS, Stolen Bases.
- Pitchers show: Wins, Losses, ERA, Strikeouts, WHIP, Saves, Innings Pitched.
- Players with both hitting and pitching careers show the group matching their primary position.
- While loading, a slim skeleton line is shown. If no match is found, or the athlete is not Baseball, nothing extra renders and the popup looks exactly as it does today.
- A small "Career · MLB Stats API" caption sits under the stats.
- All labels exist in both English and Spanish.

## Data source

MLB Stats API (same live source the MLB Leaders page already uses, no key required):

1. Player lookup by name: `https://statsapi.mlb.com/api/v1/people/search?names=<name>` (fallback to the season roster endpoint if search returns nothing).
2. Career stats: `https://statsapi.mlb.com/api/v1/people/<id>/stats?stats=career&group=hitting,pitching`.
3. Primary position comes from the person record and decides which group to display.

Names are matched with the project's existing accent-insensitive normalizer so "Ronald Acuña Jr." and "Luis Arráez" resolve correctly.

## Technical details

- New hook `src/hooks/useMlbCareerStats.ts`: takes `(name, sport, enabled)`, returns `{ loading, group, stats }`. It no-ops unless `sport === "Baseball"` and `enabled` is true (the dialog is only mounted when open, so requests fire only on open).
- Results cached in a module-level `Map` keyed by normalized name so reopening a card or opening several cards does not refetch. Failures are cached as null to avoid retry storms.
- New presentational component `src/components/CareerStatsStrip.tsx`: responsive grid of label/value pairs using existing dark-theme tokens (`text-muted-foreground` labels, `font-display` values), same visual language as the existing summary strip at the bottom of the dialog.
- `src/components/PriceHistoryDialog.tsx`: render the strip immediately below `DialogDescription`, inside `DialogHeader`'s sibling area.
- `src/i18n/translations.ts`: add `career.*` keys (title, each stat label, source caption) to both `en` and `es`.
- No changes to `AthleteCard`, `useAthleteData`, or the JSON pipeline.
