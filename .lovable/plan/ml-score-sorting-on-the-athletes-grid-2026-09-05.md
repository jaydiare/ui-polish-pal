# ML Score Sorting on the Athletes Grid

## Goal
Add ML-based sort options to the main athletes grid sort bar, next to the existing Default / Price ↓ / Most Stable buttons:

- **Deal Score** — highest score first
- **Upside %** — highest 7‑day upside probability first
- **Volatile first** / **Stable first** — both directions, per user choice

Athletes without an ML score always fall to the bottom of any ML sort.

## Changes

### 1. `src/lib/vzla-helpers.ts`
- Extend `SortOption` with `"deal_score_desc" | "upside_prob_desc" | "volatility_high" | "volatility_low"`.
- Add an optional `mlScores?: MlScoreMap` parameter to `sortAthletes` (import the type from `useAthleteMlScores` — move the `AthleteMlScore`/`MlScoreMap` interfaces into `vzla-helpers.ts` or a shared types file to avoid a hook→lib import cycle).
- New sort branches:
  - `deal_score_desc`: `deal_score` descending, missing scores last.
  - `upside_prob_desc`: `predicted_up_7d_prob` descending, missing scores last.
  - `volatility_high`: cluster rank `volatile(0) → momentum(1) → stable(2)`, missing last.
  - `volatility_low`: cluster rank `stable(0) → momentum(1) → volatile(2)`, missing last.

### 2. `src/hooks/useAthleteData.ts`
- Consume the existing `useAthleteMlScores()` hook and pass the score map into the `sortAthletes(filteredAthletes, sort, activeByName, activeByKey, mlScores)` memo (add map to memo deps).

### 3. `src/components/VzlaAthleteGrid.tsx`
- Add the four new options to `SORT_OPTIONS`, converting hardcoded English labels to i18n via `useLanguage()` (`t(key)`), matching the site's EN/ES requirement.

### 4. `src/i18n/translations.ts`
- Add EN/ES keys: `sort.dealScore` ("Deal Score" / "Puntaje de Oferta"), `sort.upside` ("Upside %" / "Potencial %"), `sort.volatileFirst` ("Volatile first" / "Volátiles primero"), `sort.stableFirst` ("Stable first" / "Estables primero"). Also migrate existing sort labels (Default, Price ↓, Most Stable) to keys if not already localized.

## Verification
- Build passes (`/tmp/observability/build-errors.log`).
- Playwright check on `/`: each new sort button reorders the grid, ML badges on cards corroborate ordering (top card has highest deal score), unscored athletes sink to the bottom, ES toggle shows Spanish labels.
