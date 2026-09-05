# Mobile-Friendly Sort Bar

## Goal
Make the athlete-grid sort controls usable on narrow screens by collapsing them into a compact toggle, matching the existing filters pattern.

## Current state
`src/components/VzlaAthleteGrid.tsx` renders all seven sort options as a horizontal row of buttons. On mobile this row overflows and does not fit the viewport.

`src/components/VzlaSearchFilters.tsx` already uses `useIsMobile()` + a "Filters" toggle that expands into a panel. We will mirror that interaction for sorting.

## Changes

### 1. `src/components/VzlaAthleteGrid.tsx`
- Import `useIsMobile` from `@/hooks/use-mobile` and `ChevronDown` from `lucide-react`.
- Add local state `sortExpanded`.
- Desktop (>768px): keep the existing horizontal button row.
- Mobile (<=768px): replace the row with:
  - A compact button showing the active sort label, a down chevron, and an `aria-expanded` attribute.
  - When expanded, show the sort options in a 2-column grid below the button, with the active option highlighted.
- Preserve existing `role="toolbar"`, `aria-label="Sort controls"`, and keyboard focus styles.

### 2. `src/i18n/translations.ts`
- Add `sort.choose` key (EN: "Sort", ES: "Ordenar") for the mobile toggle label if needed; otherwise reuse `sort.by`.

## Verification
- Build passes (`/tmp/observability/build-errors.log`).
- Playwright check on `/` at mobile viewport: sort toggle is visible, expanding it reveals all options, selecting a new option reorders the grid and collapses the panel.
