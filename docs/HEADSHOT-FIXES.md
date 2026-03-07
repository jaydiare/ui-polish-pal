# Athlete Headshot System — Fixes & Architecture

## Overview

Athlete card images are resolved via a multi-source lookup chain defined in `src/hooks/useAthleteImage.ts`. The system attempts to find a headshot from several APIs, returning the first successful match.

## Lookup Chain (priority order)

1. **ESPN API** — used only for `Baseball` athletes. Queries the ESPN search endpoint for MLB player headshots.
2. **TheSportsDB API** — free tier (public key `"3"`). Searches across all sports with optional sport filtering via `SPORT_TO_TSDB` mapping.

> **Planned**: An S3 bucket (`vzla.s3.us-east-1.amazonaws.com/player-headshots/`) is available for curated/manual overrides. Paths follow the pattern `{sport}/{slugified-name}.webp` (e.g., `baseball/alex-cabrera.webp`).

## Bug: Wrong Headshot for Alex Cabrera (and similar names)

### Problem

APIs like ESPN and TheSportsDB return the **top search result**, which may not match the requested athlete. For example, searching "Alex Cabrera" returned a WWE wrestler instead of the Venezuelan baseball player because:

- ESPN's search returned the closest match by popularity, not sport accuracy.
- TheSportsDB returned multiple players named "Alex Cabrera" across different sports.

### Root Cause

No validation was performed on the **name returned by the API** against the **requested name**. The system blindly used whatever the API returned as result #1.

### Fix: Strict Name Matching

Added two helper functions to `useAthleteImage.ts`:

#### `normName(s: string): string`
Normalizes a name for comparison by:
- Stripping Unicode accents (NFD decomposition)
- Removing punctuation (`.`, `-`, `'`)
- Collapsing whitespace
- Lowercasing

#### `namesMatch(requested: string, returned: string): boolean`
Validates that every word-part of the **requested** name appears in the **returned** name. This prevents mismatches where the API returns a completely different person.

```typescript
function namesMatch(requested: string, returned: string): boolean {
  const a = normName(requested);
  const b = normName(returned);
  if (a === b) return true;
  const partsA = a.split(" ").filter(Boolean);
  return partsA.every(p => b.includes(p));
}
```

### Where validation is applied

| Source       | Field checked                              |
| ------------ | ------------------------------------------ |
| ESPN         | `item.displayName` or `item.name`          |
| TheSportsDB  | `player.strPlayer` or `strPlayerAlternate` |

If the returned name does **not** pass `namesMatch`, the result is discarded and the next source in the chain is tried.

## Lazy Loading

Headshot fetching is deferred via `IntersectionObserver` (200px root margin) so off-screen cards don't trigger API calls. An in-memory `Map` cache prevents duplicate requests for the same athlete.

## Known Limitations

- **Homonyms across sports**: If two athletes share the exact same name (e.g., "Alex Cabrera" in baseball vs. wrestling), the sport filter in TheSportsDB helps, but ESPN has no sport filter beyond the `league=mlb` parameter.
- **Missing headshots**: Athletes not indexed by ESPN or TheSportsDB will show initials instead of a photo. The S3 bucket can be used to manually upload images for these cases.
- **Rate limiting**: Both APIs are free-tier and may throttle under heavy concurrent use. The `IntersectionObserver` + cache mitigate this.
