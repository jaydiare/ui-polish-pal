# VZLA Sports Elite — Data Pipeline Audit & Reference

> **Created:** March 6, 2026  
> **Purpose:** Complete technical reference for all eBay data collection workflows, statistical formulas, filtering rules, name normalization, and consistency audit results.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Workflow Summary](#2-workflow-summary)
3. [Script-by-Script Reference](#3-script-by-script-reference)
4. [Statistical Formulas](#4-statistical-formulas)
5. [Filtering Rules](#5-filtering-rules)
6. [Name Normalization & Accent Handling](#6-name-normalization--accent-handling)
7. [Consistency Audit](#7-consistency-audit)
8. [Bugs Found & Fixed](#8-bugs-found--fixed)

---

## 1. Architecture Overview

The platform collects market pricing data across **5 dimensions**:

| Dimension | Data Type | Source | Script |
|-----------|-----------|--------|--------|
| **Raw Listed** | Active Buy It Now listings (ungraded, NM/EX condition) | eBay Browse API | `update-ebay-avg.js` |
| **Graded Listed** | Active Buy It Now listings (PSA/BGS/SGC graded) | eBay Browse API | `graded-update-ebay-avg.js` |
| **Raw Sold** | Completed/sold listings (ungraded) | HTML scraping | `sold-update-ebay-avg.js` |
| **Graded Sold** | Completed/sold listings (graded) | HTML scraping | `graded-sold-update-ebay-avg.js` |
| **SCP Prices** | Current market prices (raw + PSA graded) | SportsCardsPro API | `fetch-scp-prices.js` |

### Data Flow

```
athletes.json (550+ athletes)
    │
    ├── Browse API scripts ──► ebay-avg.json / ebay-graded-avg.json
    │   (EBAY_CLIENT_ID + SECRET)
    │
    ├── HTML scraper scripts ──► ebay-sold-avg.json / ebay-graded-sold-avg.json
    │   (no API key needed)
    │
    ├── SCP API script ──► scp-prices.json
    │   (SPORTSCARDSPRO token)
    │
    └── All JSON files ──► GitHub raw URLs ──► Frontend fetches live
```

### Data Preservation Strategy

All listing scripts (Browse API) now load existing data from the output file before processing. If a run produces no new results (API quota, transient errors), previously collected athlete records are preserved via merge. This prevents data loss from empty runs (see Bug 8.7).

### Graded Data Fallback Chain

When graded listed data (`ebay-graded-avg.json`) is empty or sparse, the frontend builds a `mergedGradedData` object:

1. **Graded Sold** (`ebay-graded-sold-avg.json`) — `taguchiSold` mapped to `avgListing`
2. **Graded Listed** (`ebay-graded-avg.json`) — overwrites sold data where available (higher priority)

This ensures the UI always displays graded prices when any graded data source is available.

### API vs Scraping

| Method | Scripts | Quota Impact | Rate Limiting |
|--------|---------|-------------|---------------|
| **eBay Browse API** | `update-ebay-avg.js`, `graded-update-ebay-avg.js` | Shares daily production quota | Per-athlete cooldowns |
| **HTML Scraping** | `sold-update-ebay-avg.js`, `graded-sold-update-ebay-avg.js` | None (no API quota) | Staggered batches, exponential backoff, rotating User-Agents |

---

## 2. Workflow Summary

### GitHub Actions Workflows

| Workflow File | Script | Schedule | Batch Size | Description |
|--------------|--------|----------|------------|-------------|
| `ebay.yml` | `update-ebay-avg.js` | Daily 1 PM UTC | All athletes | Raw active listing averages |
| `ebay-graded.yml` | `graded-update-ebay-avg.js` | Daily | All athletes | Graded active listing averages |
| `ebay-sold.yml` | `sold-update-ebay-avg.js` | Every 3 hours | 10 athletes/batch | Raw sold averages |
| `ebay-graded-sold.yml` | `graded-sold-update-ebay-avg.js` | Every 3 hours (staggered) | 10 athletes/batch | Graded sold averages (PSA only, gemrate-gated) |
| `gemrate.yml` | `fetch_gemrate.py` | Every 2 hours | 10 athletes/batch | PSA population counts |
| `snapshot-history.yml` | `snapshot-athlete-history.js` | Daily | All athletes | Per-athlete time-series archive |
| `scp-prices.yml` | `fetch-scp-prices.js` | Monthly (1st) | All athletes | SportsCardsPro current prices |
| `market-data-snapshot.yml` | `snapshot-market-data.js` | Weekly (Sun 12 UTC) | All athletes | Unified market data snapshot |

### Concurrency & Safety

- Each workflow uses `concurrency` groups (`cancel-in-progress: true`) to prevent overlapping runs.
- Sold scrapers track progress in `*-progress.json` files to resume from the last batch.
- All workflows use rebase-safe commit strategies (`git rebase --autostash origin/main`).
- Manual single-athlete runs supported via `workflow_dispatch` input (`EBAY_ONLY` env var).

---

## 3. Script-by-Script Reference

### 3.1 `update-ebay-avg.js` — Raw Active Listings

**Output:** `data/ebay-avg.json`

**Query construction:**
```
q = "{name} {sport} card"
aspect_filter = Player/Athlete or Sport aspect (NO Condition Type filter)
filter = "buyingOptions:{FIXED_PRICE}"
category_ids = "261328" (Trading Card Singles)
```

**Filtering pipeline:**
1. **Post-fetch graded detection:** Skip if `isGradedListing()` returns true (tight regex, see §5.1)
2. **Ungraded condition policy:** Must match Near Mint/Excellent conditions; word-boundary blocklist rejects damaged/poor
3. **Price normalization:** Convert to USD via CBSA Exchange Rates API

> **Note:** `Condition Type:{Ungraded}` aspect filter was **intentionally removed** (Bug 8.12) because many valid raw eBay listings lack this metadata tag, causing 0 results. Instead, graded listings are excluded post-fetch via `isGradedListing()`.

**Matching strategy:**
1. Try `Player/Athlete:{name}` aspect match (with name variations: accent-stripped, no dots, no Jr.)
2. If no player match, try `Sport:{sport}` aspect match
3. If neither matches → skip athlete (prevents data contamination)

**Marketplaces:** `EBAY_US` (primary), with `EBAY_CA` fallback

**Output fields per athlete:**
- `taguchiListing` — Taguchi winsorized mean price (USD)
- `avgListing` — Same as taguchiListing
- `marketStabilityCV` — Coefficient of Variation on winsorized sample
- `avgDaysOnMarket` — Average listing age in days
- `nListing` — Number of listings included in calculation

---

### 3.2 `graded-update-ebay-avg.js` — Graded Active Listings

**Output:** `data/ebay-graded-avg.json`

**Query construction:**
```
q = "{name} {sport} card"
aspect_filter = "Graded:{Yes},Professional Grader:{Professional Sports Authenticator (PSA)}" + Player/Athlete or Sport aspect
filter = "buyingOptions:{FIXED_PRICE}"
category_ids = "261328"
```

**Filtering pipeline:**
1. **API-level:** `Graded:{Yes}` + `Professional Grader:{PSA}` aspect filters restrict to PSA-graded cards
2. **Post-fetch PSA detection:** Skip if `isGradedListing()` returns false (PSA-only regex — requires "PSA" in title)
3. **Price normalization:** Convert to USD via CBSA Exchange Rates API

**Matching strategy:** Same as raw script (Player/Athlete → Sport → skip)

**Output fields:** Same as raw script (`taguchiListing`, `marketStabilityCV`, `avgDaysOnMarket`, etc.)

---

### 3.3 `sold-update-ebay-avg.js` — Raw Sold Listings

**Output:** `data/ebay-sold-avg.json`

**Search URL construction:**
```
https://www.ebay.com/sch/i.html?
  _nkw={name} {sport}
  _sacat=261328
  LH_Sold=1
  LH_Complete=1
  Condition%20Type=Ungraded    ← restricts to ungraded at search level
  League={sport-specific}       ← e.g., "Major League (MLB)"
```

**Filtering pipeline:**
1. **URL-level:** `Condition%20Type=Ungraded` + `League` aspect filter
2. **Brand filter:** Removed — all brands accepted (`hasAllowedBrand()` always returns true)
3. **Junk title filter:** Blocks bulk lots, digital cards, set breaks, etc.
4. **Name relevance:** All name parts (first + last) must appear in title
5. **Graded detection:** Skip if `isGradedTitle()` returns true (robust regex — only raw cards)
6. **Ungraded condition policy:** Blocklist rejects damaged/poor condition keywords
7. **Price normalization:** Convert to USD via CBSA; includes shipping cost when parseable

**Output fields per athlete:**
- `taguchiSold` — Taguchi winsorized mean sold price (USD)
- `avg` — Same as taguchiSold
- `medianSold` — Median sold price
- `marketStabilityCV` — CV on winsorized sample
- `nSoldUsed` — Number of sold listings included

---

### 3.4 `graded-sold-update-ebay-avg.js` — Graded Sold Listings

**Output:** `data/ebay-graded-sold-avg.json`  
**Progress:** `data/ebay-graded-sold-progress.json`  
**Gemrate gated:** Yes — only processes athletes with `gemrate: "yes"` in `athletes.json`

**Search URL construction:**
```
https://www.ebay.com/sch/i.html?
  _nkw={name} {sport} PSA        ← "PSA" keyword appended to search
  _sacat=261328
  LH_Sold=1
  LH_Complete=1
  League={sport-specific}
```

**Filtering pipeline:**
1. **URL-level:** "PSA" keyword in search + `League` aspect filter
2. **Brand filter:** Removed — all brands accepted
3. **Junk title filter:** Same as raw sold
4. **Name relevance:** All name parts must appear in title
5. **PSA detection:** Skip if `isGradedTitle()` returns false (PSA-only regex — requires "PSA" + grade in title)
6. **Price normalization:** Same as raw sold

**Output fields:** Same as raw sold (`taguchiSold`, `medianSold`, `marketStabilityCV`, etc.)

---

## 4. Statistical Formulas

### 4.1 Taguchi Winsorized Mean

All 4 scripts use **identical** Taguchi formula:

```javascript
TAGUCHI_TRIM_PCT = 0.4   // 40% winsorization

function taguchiTrimmedMean(values, trimPercent = 0.4) {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const k = Math.floor(n * trimPercent);

  // Fallback to median for small samples or zero trim
  if (n < 3 || k === 0) return median(sorted);
  if (n <= 2 * k) return median(sorted);

  // Winsorize: clamp extremes to boundary values
  const lowCap = sorted[k];
  const highCap = sorted[n - 1 - k];
  const winsorized = sorted.map(v =>
    v < lowCap ? lowCap : v > highCap ? highCap : v
  );

  return avg(winsorized);
}
```

**How it works:**
- Sort all prices ascending
- Calculate `k = floor(n * 0.4)` — number of values to winsorize on each tail
- Replace the bottom `k` values with the value at position `k` (low cap)
- Replace the top `k` values with the value at position `n-1-k` (high cap)
- Return the mean of the winsorized array
- For samples < 3 or where trim would eliminate all variance → return median instead

### 4.2 Winsorized Sample (for CV calculation)

```javascript
function taguchiWinsorizedSample(values, trimPercent = 0.4) {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const k = Math.floor(n * trimPercent);

  if (n < 3 || k === 0 || n <= 2 * k) return sorted; // no winsorization possible

  const lowCap = sorted[k];
  const highCap = sorted[n - 1 - k];
  return sorted.map(v => v < lowCap ? lowCap : v > highCap ? highCap : v);
}
```

### 4.3 Coefficient of Variation (CV)

```javascript
function taguchiCV(values, trimPercent = 0.4) {
  if (!values || values.length < 3) return null;

  const wins = taguchiWinsorizedSample(values, trimPercent);
  if (!wins || wins.length < 3) return null;

  const m = avg(wins);     // mean of winsorized sample
  const sd = stdev(wins);  // standard deviation of winsorized sample

  if (m <= 0 || sd == null) return null;
  return sd / m;            // CV = σ / μ
}
```

**CV interpretation (used in UI):**

| CV Range | Label | UI Color |
|----------|-------|----------|
| < 0.10 | Stable | Green |
| 0.10–0.20 | Active | Yellow |
| 0.20–0.35 | Volatile | Orange |
| ≥ 0.35 | Unstable | Red |

### 4.4 Minimum Sample Size

All scripts: `MIN_SAMPLE_SIZE = 4`

If fewer than 4 valid prices remain after filtering, the result is `null` (no price displayed). The `basePrices` fallback in `_meta` preserves the last known good price for UI display.

### 4.5 Price Fallback Chain

When displaying prices, the frontend tries (in order):
```
taguchiListing → avgListing → trimmedListing → avg → average → basePrices[name]
```

---

## 5. Filtering Rules

### 5.1 Graded Detection

**Two different detectors are used depending on purpose:**

#### Raw scripts (to EXCLUDE graded cards) — All graders detected

Used by `update-ebay-avg.js` and `sold-update-ebay-avg.js`:

```javascript
// Detects ALL grading companies to exclude from raw data
const graderWithGrade = /\b(psa|sgc|bgs|cgc|hga|isa|csa|beckett|bcg)\b[^\n]{0,14}\b(10|9\.5|9|8\.5|8|gem mint|mint|pristine|black label|gold label)\b/i;
const slabOnly = /\b(gem mint|pristine|black label|gold label)\b/i;
```

#### Graded scripts (to INCLUDE only PSA cards) — PSA-only

Used by `graded-update-ebay-avg.js` and `graded-sold-update-ebay-avg.js`:

```javascript
// Only includes PSA-graded cards
const psaWithGrade = /\bpsa\b[^\n]{0,14}\b(10|9\.5|9|8\.5|8|gem mint|mint|pristine|black label|gold label)\b/i;
```

**Key design decisions:**
- **Raw scripts** detect ALL graders (PSA, BGS, SGC, CGC, HGA, etc.) to exclude them from raw averages
- **Graded scripts** only detect PSA — BGS, SGC, and other graders are ignored
- Requires **grading company + grade context** — prevents false positives from card #10 or "lot of 10"
- The graded listing API also uses `Professional Grader:{Professional Sports Authenticator (PSA)}` aspect filter
- The graded sold search uses "PSA" as the keyword instead of generic "graded"

### 5.2 Raw Card Condition Policy

**API-level (Browse API scripts only):**
- `Condition Type:{Ungraded}` aspect filter
- Card Condition URL param: `Near Mint or Better|Excellent`

**Post-fetch (all raw scripts):**
- **Allowed conditions:** `near mint or better`, `near-mint or better`, `near mint`, `nm`, `nm-mt`, `nmt`, `excellent`, `ex`
- **Blocklist:** `damaged`, `poor`, `fair`, `digital`, `very good`, `vg`, `good`, `gd`, `creases`, `wrinkle`, `corner wear`, `surface wear`, `paper loss`, `stain`, `water damage`, `tape`, `writing`, `marked`, `pin hole`, `torn`, `tear`, `scratches`

**Fallback behavior:**
- Listed scripts: Accept if no explicit condition info is found (most eBay listings lack descriptors)
- Sold scripts: Permissive — only reject if blocklist keyword found in title

### 5.3 Junk Title Exclusion

All scripts share the same junk phrases list:

```
you pick, digitalcard, digital, you choose, pick your, choose your,
your choice, complete your set, complete set, set builder, set break,
base singles, insert singles, singles you pick, lot, team lot,
player lot, break, case break, random, bulk, u-pick, u pick,
lote, base cards from, group
```

**Note:** Graded sold script additionally includes `auto` and `signed` in junk phrases to exclude autograph cards from graded sold averages (these inflate graded prices disproportionately).

### 5.4 Brand Filter

**Status: REMOVED (as of March 6, 2026)**

All 4 scripts accept all brands. The manufacturer allowlist (Topps, Panini, Upper Deck, etc.) was removed to increase data coverage for athletes whose cards are from non-major manufacturers (common for Venezuelan league cards).

`hasAllowedBrand()` always returns `true` in all scripts.

### 5.5 Name Relevance Check

All name parts (first and last) must appear in the listing title:

```javascript
function titleLooksRelevantToPlayer(title, playerName) {
  const t = norm(title);
  const parts = norm(playerName).split(/\s+/).filter(Boolean);
  return parts.every(part => t.includes(part));
}
```

This prevents cross-contamination (e.g., "Altuve" matching "Jose Altuve" but not "Roberto Altuve" when searching for "Jose Altuve").

### 5.6 Sport-Specific League Filters

Sold scripts use eBay League aspect filters:

| Sport | League Filter |
|-------|--------------|
| Baseball | Major League (MLB) |
| Soccer | Major League Soccer (MLS) |
| Basketball | National Basketball Assoc. (NBA) |
| Football | National Football League (NFL) |
| Hockey | National Hockey League (NHL) |

---

## 6. Name Normalization & Accent Handling

### 6.1 The Problem

Venezuelan athletes frequently have accented names (e.g., "Ronald Acuña Jr.", "Salomón Rondón", "José Altuve"). eBay listings are inconsistent — some include accents, others don't. Data files use various formats.

### 6.2 Normalization Functions

**Backend scripts (Node.js):**
```javascript
// Strip diacritics (accents) — used for comparisons and matching
function stripDiacritics(s) {
  return String(s || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");
}

// Full normalization — lowercase, strip accents, collapse whitespace
function norm(s) {
  return String(s || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}
```

**Frontend (TypeScript):**
```typescript
// Same logic — used in useAthleteData.ts and vzla-helpers.ts
function normalizeKey(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.\-']/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}
```

### 6.3 Name Variant Generation (Browse API scripts)

For eBay aspect matching, multiple name variants are generated:

```javascript
function candidateAspectValuesForName(rawName) {
  const raw = normSpaces(rawName);                    // "Ronald Acuña Jr."
  const ascii = stripDiacritics(raw);                 // "Ronald Acuna Jr."
  const noDotsRaw = raw.replace(/\./g, "");          // "Ronald Acuña Jr"
  const noDotsAscii = ascii.replace(/\./g, "");      // "Ronald Acuna Jr"
  const noJrRaw = raw.replace(/\s+Jr\.?$/i, "");    // "Ronald Acuña"
  const noJrAscii = ascii.replace(/\s+Jr\.?$/i, ""); // "Ronald Acuna"

  return new Set([raw, ascii, noDotsRaw, noDotsAscii, noJrRaw, noJrAscii]);
}
```

This tries 6 variants per athlete to maximize API aspect matches.

### 6.4 Data Key Format

- **`athletes.json`** stores names in their original accented form: `"Ronald Acuña Jr."`
- **`ebay-avg.json`** and all output files use the **original name** as the key (preserving accents)
- **Frontend matching** normalizes both sides before comparison: `normalizeKey("Ronald Acuña Jr.") === normalizeKey("Ronald Acuna Jr.")`

### 6.5 Common Edge Cases

| Name | Issue | How It's Handled |
|------|-------|-----------------|
| `Ronald Acuña Jr.` | Accent + suffix | 6 variants generated; norm strips `ñ→n`, `Jr.→Jr→removed` |
| `Salomón Rondón` | Double accent | NFD decomposition strips both `ó→o` |
| `Andrés Giménez` | Accent + accent | Both stripped in normalization |
| `Luis Robert Jr.` | Suffix only | `Jr.` removal variant |
| `José Altuve` | Single accent | Standard NFD handling |

---

## 7. Consistency Audit

### 7.1 Parameters Comparison (All 4 Scripts)

| Parameter | Raw Listed | Graded Listed | Raw Sold | Graded Sold |
|-----------|-----------|---------------|----------|-------------|
| **Taguchi trim %** | 0.4 | 0.4 | 0.4 | 0.4 |
| **Min sample size** | 4 | 4 | 4 | 4 |
| **CV formula** | sd/mean (winsorized) | ✅ same | ✅ same | ✅ same |
| **Median calculation** | ✅ standard | ✅ same | ✅ same | ✅ same |
| **Stdev calculation** | ✅ population SD | ✅ same | ✅ same | ✅ same |
| **FX normalization** | CBSA → USD | ✅ same | ✅ same | ✅ same |
| **Brand filter** | None (removed) | ✅ same | ✅ same | ✅ same |
| **Junk title filter** | ✅ standard list | ✅ same | ✅ same | ✅ same + auto/signed |
| **Name matching** | All parts required | ✅ same | ✅ same | ✅ same |
| **Graded detection** | Robust regex | ✅ same | ✅ same | ✅ same |
| **Category ID** | 261328 | 261328 | 261328 | 261328 |
| **Page size** | 60 | 60 | 60 | 60 |

### 7.2 Filtering Differences (By Design)

| Filter | Raw Listed | Graded Listed | Raw Sold | Graded Sold |
|--------|-----------|---------------|----------|-------------|
| **API Condition Type** | `Ungraded` | `Graded:{Yes}` | N/A (HTML) | N/A (HTML) |
| **URL Condition Type** | N/A | N/A | `Ungraded` | N/A (uses "graded" keyword) |
| **Condition policy** | NM/EX only | Skip ungraded | Blocklist only | N/A |
| **Graded detection** | Skip graded | Skip ungraded | Skip graded | Skip ungraded |
| **League filter** | Via Sport aspect | Via Sport aspect | URL param | URL param |

---

## 8. Bugs Found & Fixed

### 8.1 (March 6, 2026) Graded Listed Script Including Ungraded Cards

**Problem:** `graded-update-ebay-avg.js` was letting ungraded cards through if they passed the Near Mint/Excellent condition policy. This meant raw card prices ($1-5 range) were mixed into graded averages, dragging them down significantly.

**Root cause:** Lines 611-617 had:
```javascript
if (!graded) {
  const okUngraded = ungradedPassesConditionPolicy(it);
  if (!okUngraded) continue;
  // ← If condition passes, ungraded card was INCLUDED in graded data!
}
```

**Fix:** Changed to `if (!graded) continue;` — skip ALL non-graded cards.

### 8.2 (March 6, 2026) Missing `Graded:{Yes}` API Filter

**Problem:** The graded listing script's `buildAspectFilter()` did not include `Graded:{Yes}`, so the Browse API returned a mix of raw and graded listings.

**Fix:** Added `parts.push('Graded:{Yes}')` to always restrict API queries to graded cards.

### 8.3 (March 6, 2026) Missing `Condition Type:{Ungraded}` API Filter

**Problem:** The raw listing script did not restrict to ungraded at the API level, relying only on post-fetch filtering.

**Fix:** Added `parts.push('Condition Type:{Ungraded}')` to `buildAspectFilter()` in `update-ebay-avg.js` and `Condition%20Type=Ungraded` URL param to `sold-update-ebay-avg.js`.

### 8.4 (March 6, 2026) Loose Graded Detection (False Positives)

**Problem:** Three scripts used a simple string hint list including bare `"10"`, which matched card numbers (#10), lot counts ("lot of 10"), and other non-grading references. This caused:
- Raw sold to incorrectly **exclude** valid raw cards
- Graded sold to incorrectly **include** non-graded cards

**Fix:** Replaced simple hint list with robust regex requiring grading-company context (e.g., `PSA 10`, `BGS 9.5`). Now consistent across all 4 scripts.

### 8.5 (March 6, 2026) Graded Script Blocklist Included "Excellent" and "Ex"

**Problem:** The graded listing script's `UNGRADED_BLOCKLIST` included `"excellent"` and `"ex"`, which would have rejected high-condition cards. Also included `"auto"` and `"signed"`, which would reject autographed graded cards.

**Impact:** Minimal after fix 8.1 (since ungraded cards are now skipped entirely), but the blocklist is now dead code in the graded script.

### 8.6 (March 6, 2026) Manufacturer Brand Filter Removed

**Change:** Removed the manufacturer/brand allowlist (Topps, Panini, Upper Deck, etc.) from all 4 scripts to increase data coverage. Venezuelan league cards from smaller manufacturers (Artesania Sport, Ovenca, Sport Grafico, etc.) were being excluded.

**Mitigation:** Junk title filter and Taguchi winsorization (40% trim) protect against noise from low-quality or novelty cards.

### 8.7 (March 7, 2026) Graded Listed Data Overwritten with Empty File

**Problem:** `graded-update-ebay-avg.js` overwrote `data/ebay-graded-avg.json` with only `_meta` metadata and zero athlete records. The `indexHistory` for 2026-03-07 confirmed `Baseball: 0, All: 0`. This caused the "Graded" filter on both the Home page grid and Market Intel to show no data.

**Root cause:** The script initialized an empty `out` object on each run. If the eBay Browse API returned no results (quota exhaustion, transient errors, or no matches), the file was saved with only the `_meta` block — discarding all previously collected athlete price records.

**Fix (script):** `graded-update-ebay-avg.js` now loads existing data from the output file at the start of the run and merges `prevRecords` into the new `out` object. This ensures previously collected athlete records are preserved even when a specific run returns no new data.

```javascript
// Load previous records as fallback
const prevData = fs.existsSync(OUT_PATH) ? JSON.parse(fs.readFileSync(OUT_PATH, "utf-8")) : {};
const prevRecords = {};
for (const [k, v] of Object.entries(prevData)) {
  if (k !== "_meta") prevRecords[k] = v;
}
// ... after processing, merge previous into output
for (const [k, v] of Object.entries(prevRecords)) {
  if (!(k in out)) out[k] = v;
}
```

**Fix (frontend):** `useAthleteData.ts` now builds a `mergedGradedData` object that uses graded sold data (`ebay-graded-sold-avg.json`) as a fallback when graded listed data (`ebay-graded-avg.json`) is empty. Sold prices (`taguchiSold`) are mapped to `avgListing` fields so the existing price display logic works seamlessly. Listed data takes priority when available.

### 8.8 (March 7, 2026) Graded Script File Header Mismatch

**Problem:** `scripts/graded-update-ebay-avg.js` contains a misleading file header comment: `// scripts/update-ebay-avg.js` (line 1) — referencing the raw script name instead of the graded script. The output path comment on line 12 is correct (`data/ebay-graded-avg.json`).

**Status:** Cosmetic only. No functional impact.

### 8.9 (March 8, 2026) Graded Sold Script Wrong Output Paths

**Problem:** `graded-sold-update-ebay-avg.js` was writing to `data/ebay-sold-avg.json` and reading progress from `data/ebay-sold-progress.json` — the **raw sold** files — instead of its own `data/ebay-graded-sold-avg.json` and `data/ebay-graded-sold-progress.json`.

**Impact:** The graded-sold script was overwriting raw sold data, and reading the raw sold progress tracker. Since raw sold progress was at index 450 (≥ 449 athletes), the graded-sold workflow would instantly log "All athletes processed. Resetting progress for next cycle." and do nothing on every run.

**Fix:** Corrected `OUT_PATH` and `PROGRESS_PATH` to their correct graded-sold files.

### 8.10 (March 8, 2026) Graded Sold Script Missing "PSA" Keyword in Search

**Problem:** `graded-sold-update-ebay-avg.js` searched eBay with `{name} {sport}` as the keyword — identical to the raw sold script — without adding "PSA". This returned mostly raw/ungraded sold listings, which were then discarded by the post-fetch `isGradedTitle()` regex. Result: very low `nSoldUsed` counts and wasted scraping pages.

**Fix:** Changed `buildKeyword()` to append `" PSA"` to the search keyword: `{name} {sport} PSA`. This focuses the search on PSA-graded sold listings, increasing valid sample sizes.

### 8.11 (March 8, 2026) Graded Sold Script File Header Comment Wrong

**Problem:** Line 1 of `graded-sold-update-ebay-avg.js` said `// scripts/sold-update-ebay-avg.js` — referencing the raw sold script name.

**Fix:** Corrected to `// scripts/graded-sold-update-ebay-avg.js`.

---

## 9. SportsCardsPro (SCP) Pipeline

### 9.1 `fetch-scp-prices.js` — Monthly SCP Price Fetch

**Output:** `data/scp-prices.json` + `public/data/scp-prices.json`  
**Workflow:** `scp-prices.yml` — 1st of every month at 10:00 UTC  
**API Token:** `SPORTSCARDSPRO` GitHub Secret

**How it works:**

1. Iterates through all athletes in `data/athletes.json`
2. For each athlete, queries the SportsCardsPro `/api/products` endpoint twice:
   - **Raw query:** `"{name} Raw"` — fetches `loose-price` from all matching products
   - **Graded query:** `"{name} PSA"` — fetches `new-price` or `cib-price` from all matching products
3. Applies **Taguchi Winsorized Trimmed Mean** (20% trim) across all matching product prices
4. Rate limiting: 500ms between requests, 3s pause every 50 athletes

**Taguchi formula (SCP variant):**

```javascript
// 20% trim (vs 40% in eBay scripts) — fewer products per query
trimCount = Math.max(1, Math.floor(n * 0.2));

// Winsorize: clamp all values to [lo, hi] boundaries, then average
lo = sorted[trimCount];
hi = sorted[n - 1 - trimCount];
sum = sorted.map(v => Math.min(Math.max(v, lo), hi)).reduce((a, b) => a + b);
mean = sum / n;
```

**Key differences from eBay Taguchi:**
- Uses **20% trim** (not 40%) because SCP returns fewer products per query
- Falls back to **median** when sample size ≤ 2× trim count
- SCP prices are in **cents** — converted to dollars (`/ 100`) before computation

**Output fields per athlete:**
- `scpRawPrice` — Taguchi mean of raw card prices (USD)
- `scpGradedPrice` — Taguchi mean of graded card prices (USD)
- `scpRawProduct` — First matching product name (raw query)
- `scpGradedProduct` — First matching product name (graded query)
- `scpRawId` / `scpGradedId` — SCP product IDs

### 9.2 `snapshot-market-data.js` — Weekly Unified Snapshot

**Output:** `data/vzla-athlete-market-data.json` + `public/data/vzla-athlete-market-data.json`  
**Workflow:** `market-data-snapshot.yml` — Every Sunday at 12:00 UTC

Aggregates all data sources into a single file per athlete:
- eBay raw/graded listed prices
- eBay raw/graded sold prices
- Stability CV and Signal S/N
- PSA population counts (from gemrate)
- Days on market
- Index level
- **SCP raw and graded prices** (from `scp-prices.json`)

### 9.3 Output File Schema — scp-prices.json

```json
{
  "_meta": {
    "updatedAt": "ISO timestamp",
    "athleteCount": 550,
    "rawHits": 312,
    "gradedHits": 245,
    "description": "SportsCardsPro price lookup for Venezuelan athlete cards"
  },
  "athletes": [
    {
      "name": "José Altuve",
      "sport": "Baseball",
      "scpRawPrice": 2.45,
      "scpGradedPrice": 18.50,
      "scpRawProduct": "2014 Topps José Altuve",
      "scpGradedProduct": "2014 Topps José Altuve PSA 10",
      "scpRawId": "123456",
      "scpGradedId": "789012"
    }
  ]
}
```

---

## Appendix: Output File Schemas

### ebay-avg.json / ebay-graded-avg.json (Active Listings)

```json
{
  "_meta": {
    "updatedAt": "ISO timestamp",
    "minSampleSize": 4,
    "marketplaces": ["EBAY_US"],
    "categoryId": "261328",
    "fx": { "source": "CBSA", "asOf": "...", "ratesToUSD": {...} },
    "basePrices": { "Athlete Name": 2.45, ... },
    "listingStat": { "method": "taguchi_winsorized_mean", "trimPercent": 0.4 },
    "stabilityStat": { "method": "cv", "formula": "sd/mean", "sample": "winsorized", "trimPercent": 0.4 }
  },
  "Athlete Name": {
    "taguchiListing": 12.50,
    "avgListing": 12.50,
    "marketStabilityCV": 0.15,
    "avgDaysOnMarket": 45.2,
    "nListing": 28,
    "currency": "USD",
    "sport": "Baseball"
  }
}
```

### ebay-sold-avg.json / ebay-graded-sold-avg.json (Sold Listings)

```json
{
  "_meta": {
    "updatedAt": "ISO timestamp",
    "source": "eBay public sold listings (HTML scrape, LH_Sold=1)",
    "minSampleSize": 4,
    "listingStat": { "method": "taguchi_winsorized_mean", "trimPercent": 0.4 },
    "stabilityStat": { "method": "cv", "formula": "sd/mean", "sample": "winsorized", "trimPercent": 0.4 }
  },
  "Athlete Name": {
    "taguchiSold": 15.25,
    "avg": 15.25,
    "medianSold": 14.00,
    "marketStabilityCV": 0.12,
    "nSoldUsed": 18,
    "currency": "USD"
  }
}
```
