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

The platform collects eBay pricing data across **4 dimensions**:

| Dimension | Data Type | Source | Script |
|-----------|-----------|--------|--------|
| **Raw Listed** | Active Buy It Now listings (ungraded, NM/EX condition) | eBay Browse API | `update-ebay-avg.js` |
| **Graded Listed** | Active Buy It Now listings (PSA/BGS/SGC graded) | eBay Browse API | `graded-update-ebay-avg.js` |
| **Raw Sold** | Completed/sold listings (ungraded) | HTML scraping | `sold-update-ebay-avg.js` |
| **Graded Sold** | Completed/sold listings (graded) | HTML scraping | `graded-sold-update-ebay-avg.js` |

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
    └── All JSON files ──► GitHub raw URLs ──► Frontend fetches live
```

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
| `ebay-graded-sold.yml` | `graded-sold-update-ebay-avg.js` | Every 2 hours | 10 athletes/batch | Graded sold averages |
| `gemrate.yml` | `fetch_gemrate.py` | Every 2 hours | 10 athletes/batch | PSA population counts |
| `snapshot-history.yml` | `snapshot-athlete-history.js` | Daily | All athletes | Per-athlete time-series archive |

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
aspect_filter = "Condition Type:{Ungraded}" + Player/Athlete or Sport aspect
filter = "buyingOptions:{FIXED_PRICE}"
category_ids = "261328" (Trading Card Singles)
```

**Filtering pipeline:**
1. **API-level:** `Condition Type:{Ungraded}` aspect filter restricts to ungraded cards
2. **Post-fetch graded detection:** Skip if `isGradedListing()` returns true (robust regex)
3. **Ungraded condition policy:** Must match Near Mint/Excellent conditions; blocklist rejects damaged/poor
4. **Price normalization:** Convert to USD via CBSA Exchange Rates API

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
aspect_filter = "Graded:{Yes}" + Player/Athlete or Sport aspect
filter = "buyingOptions:{FIXED_PRICE}"
category_ids = "261328"
```

**Filtering pipeline:**
1. **API-level:** `Graded:{Yes}` aspect filter restricts to graded cards
2. **Post-fetch graded detection:** Skip if `isGradedListing()` returns false (only include graded)
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

**Search URL construction:**
```
https://www.ebay.com/sch/i.html?
  _nkw={name} {sport} graded    ← "graded" keyword added
  _sacat=261328
  LH_Sold=1
  LH_Complete=1
  League={sport-specific}
```

**Filtering pipeline:**
1. **URL-level:** "graded" keyword in search + `League` aspect filter
2. **Brand filter:** Removed — all brands accepted
3. **Junk title filter:** Same as raw sold (includes "auto" and "signed" in junk list)
4. **Name relevance:** All name parts must appear in title
5. **Graded detection:** Skip if `isGradedTitle()` returns false (only include graded — robust regex)
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

### 5.1 Graded Detection (Consistent Across All Scripts)

All 4 scripts now use the **same robust regex**:

```javascript
// For Browse API scripts (item object with condition field):
function isGradedListing(item) {
  const cond = normText(item?.condition || "");
  const title = normText(item?.title || "");

  if (cond.includes("graded")) return true;

  const graderWithGrade = /\b(psa|sgc|bgs|cgc|hga|isa|csa|beckett|bcg)\b[^\n]{0,14}\b(10|9\.5|9|8\.5|8|gem mint|mint|pristine|black label|gold label)\b/i;
  const slabOnly = /\b(gem mint|pristine|black label|gold label)\b/i;

  return graderWithGrade.test(title) || slabOnly.test(title);
}

// For HTML scraper scripts (title string only):
function isGradedTitle(title) {
  const t = norm(title);
  // Same regex as above
  const graderWithGrade = /\b(psa|sgc|bgs|cgc|hga|isa|csa|beckett|bcg)\b[^\n]{0,14}\b(10|9\.5|9|8\.5|8|gem mint|mint|pristine|black label|gold label)\b/i;
  const slabOnly = /\b(gem mint|pristine|black label|gold label)\b/i;
  return graderWithGrade.test(t) || slabOnly.test(t);
}
```

**Key design decisions:**
- Requires **grading company context** (e.g., "PSA 10") — prevents false positives from card #10 or "lot of 10"
- Supports all major graders: PSA, SGC, BGS, CGC, HGA, ISA, CSA, Beckett, BCG
- Allows up to 14 characters between grader name and grade number
- Slab-only keywords (gem mint, pristine, black label, gold label) pass without grader prefix

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
