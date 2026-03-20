# The AI DevOps Playbook: From Zero to 15 Pipelines
## Technical Reference & Source Material

> **Generated:** March 2026
> **Source:** Production codebase with 15+ automated workflows, 550+ athlete pipeline, 6 external APIs

---

## 1. CI/CD Architecture Overview

### 1.1 Workflow Inventory

The platform runs **15+ GitHub Actions workflows** on a multi-tiered schedule. Every workflow follows a standardized pattern:

```yaml
# The universal workflow skeleton
name: [Descriptive Name]
on:
  schedule:
    - cron: "[frequency]"
  workflow_dispatch:          # Always allow manual trigger
    inputs:                   # Optional: single-athlete targeting
      only:
        description: "Single athlete name — leave empty for full batch"
concurrency:
  group: [unique-group-name]
  cancel-in-progress: true    # Prevent duplicate runs
permissions:
  contents: write             # Explicit — never rely on defaults
env:
  FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true  # Runtime standardization
```

**Key design decisions:**
- Every workflow has `workflow_dispatch` for manual debugging
- `concurrency` groups prevent race conditions between scheduled and manual runs
- `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24` ensures consistent Node.js runtime across all actions
- Permissions explicitly declared (principle of least privilege)

### 1.2 Complete Schedule Map

| Workflow | Cron | Frequency | Purpose |
|----------|------|-----------|---------|
| `ebay-sold.yml` | `0 0,3,6,9,12,15,18,21 * * *` | Every 3 hours | Raw sold listing scraping |
| `ebay-graded-sold.yml` | `30 1,3,5,7,9,11,13,15,17,19,21,23 * * *` | Every 2 hours | Graded sold listing scraping |
| `gemrate.yml` | `0 */4 * * *` | Every 4 hours | PSA population data |
| `gemrate-beckett.yml` | `0 2,6,10,14,18,22 * * *` | Every 4 hours (offset 2h) | Beckett population data |
| `snapshot-history.yml` | `0 10 * * *` | Daily at 10:00 UTC | Athlete time-series snapshots |
| `card-tracker.yml` | `0 8 * * *` | Daily at 08:00 UTC | Best offer automation |
| `ebay.yml` | `0 13 */5 * *` | Every ~5 days | Raw active listings (API) |
| `ebay-graded.yml` | `0 8 */5 * *` | Every ~5 days | Graded active listings (API) |
| `market-data-snapshot.yml` | `0 12 * * 0` | Weekly (Sun 12:00) | Unified data consolidation |
| `backup-render.yml` | `30 13 * * 0` | Weekly (Sun 13:30) | PostgreSQL backup |
| `sync-gemrate-flags.yml` | `0 14 * * 0` | Weekly (Sun 14:00) | Roster synchronization |
| `bi-weekly-analysis.yml` | `0 14 1,15 * *` | 1st & 15th | AI market analysis |
| `scp-prices.yml` | `0 10 1 * *` | Monthly (1st) | SportsCardsPro prices |
| `update.yml` | `0 0 1 * *` | Monthly (1st) | Full athlete roster sync |

**Schedule design principles:**
- Graded scraping offset by 90 minutes from raw to avoid concurrent execution
- PSA and Beckett offset by 2 hours to prevent simultaneous scraping of same data source
- Sunday workflows ordered: data consolidation (12:00) → backup (13:30) → sync (14:00)
- eBay API runs every ~5 days to stay within 5,000-call daily quota (~1,138 calls/run)

---

## 2. Resilience Patterns

### 2.1 The Rebase-Safe Commit Pattern

Every data-writing workflow uses this exact commit pattern:

```yaml
- name: Commit & push (rebase-safe)
  run: |
    set -e

    git config user.name "github-actions[bot]"
    git config user.email "github-actions[bot]@users.noreply.github.com"

    git add data/ebay-sold-avg.json data/ebay-sold-progress.json

    if git diff --cached --quiet; then
      echo "No changes to commit"
      exit 0
    fi

    git commit -m "Update eBay sold averages (batch)"

    git fetch origin main
    git rebase --autostash origin/main || \
      (git rebase --abort && git pull --rebase origin main)

    git push origin HEAD:main
```

**Why this matters:**
- Multiple workflows commit to the same branch within the same hour
- Without rebase, non-fast-forward pushes fail silently
- `--autostash` preserves uncommitted changes during rebase
- Fallback: if rebase fails (conflict), abort and try `pull --rebase` as recovery
- `set -e` ensures any failure in the sequence stops the pipeline

### 2.2 Pre-Execution Sync

Workflows that depend on progress trackers fetch the latest state before running:

```yaml
- uses: actions/checkout@v4
  with:
    fetch-depth: 0  # Full history needed for rebase
```

**Problem it solves:** If workflow A commits `progress.json` at 10:01 and workflow B started at 10:00 with a stale checkout, B would overwrite A's progress. Full history + rebase prevents this.

### 2.3 Batch Processing with Checkpoint/Resume

Long-running pipelines (550+ athletes) are split into batches with persistent cursors:

```javascript
// From sold-update-ebay-avg.js
const BATCH_SIZE = 10; // athletes per run

// Progress file tracks where we left off
const progress = readJson(PROGRESS_PATH) || { startIdx: 0 };
const startIdx = progress.startIdx || 0;
const endIdx = Math.min(startIdx + BATCH_SIZE, athletes.length);

// After processing...
if (endIdx >= athletes.length) {
  // Full cycle complete — reset
  progress.startIdx = 0;
  progress.lastBatchAt = new Date().toISOString();
} else {
  progress.startIdx = endIdx;
}
writeJson(PROGRESS_PATH, progress);
```

**Cycle math:** 550 athletes ÷ 10 per batch = 55 batches × 3 hours = ~6.8 days per full cycle. This means every athlete gets updated sold data roughly weekly.

### 2.4 Exponential Backoff with Retry

```javascript
// 4-retry loop with exponential backoff
const MAX_RETRIES = 4;
const BASE_DELAY_MS = 4000;

for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
  try {
    const response = await fetch(url, { headers });
    if (response.status === 503) {
      // eBay throttling — back off exponentially
      const delay = BASE_DELAY_MS * Math.pow(2, attempt);
      await sleep(delay);
      continue;
    }
    return response;
  } catch (err) {
    if (attempt === MAX_RETRIES - 1) throw err;
    await sleep(BASE_DELAY_MS * Math.pow(2, attempt));
  }
}
```

### 2.5 Corrupted File Auto-Repair

```javascript
function readJson(filePath) {
  try {
    if (!fs.existsSync(filePath)) return {};
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw);
  } catch {
    // Corrupted or empty file — reinitialize
    return {};
  }
}
```

**Why files corrupt:** GitHub Actions runners can be preempted mid-write. If a workflow crashes between truncating a file and writing new content, the result is an empty or partial JSON file. The `catch → return {}` pattern ensures the next run self-heals.

---

## 3. Data Pipeline Architecture

### 3.1 The Four eBay Data Streams

```
                    eBay Browse API              eBay HTML Scraping
                    (authenticated)              (no API quota)
                         │                              │
                ┌────────┴────────┐            ┌────────┴────────┐
                │                 │            │                 │
          Raw Active         Graded Active   Raw Sold        Graded Sold
         (ebay.yml)        (ebay-graded)    (ebay-sold)    (ebay-graded-sold)
                │                 │            │                 │
                ▼                 ▼            ▼                 ▼
         ebay-avg.json    ebay-graded-     ebay-sold-      ebay-graded-
                          avg.json         avg.json        sold-avg.json
```

**Design decision:** Active listings use the authenticated Browse API (richer data, better filtering). Sold listings use HTML scraping because eBay's Sold API requires different OAuth scopes and has stricter rate limits. This hybrid approach maximizes data coverage while minimizing API quota consumption.

### 3.2 3-Tier HTML Extraction

The sold listing scrapers use a fallback chain for parsing eBay's HTML:

```javascript
// Tier 1: CSS selectors (most reliable when available)
const items = $(".s-item");

// Tier 2: data-viewport attributes (eBay's responsive rendering)
const viewportItems = $("[data-viewport]");

// Tier 3: Server-side rendered script blocks (hydration data)
const scriptData = $("script").filter((i, el) => {
  return $(el).html().includes("__NEXT_DATA__");
});
```

**Why 3 tiers:** eBay frequently changes its frontend rendering. When they A/B test new layouts, one tier fails but others still work. This redundancy has prevented data outages multiple times.

### 3.3 Statistical Processing: Taguchi Winsorized Mean

Every price average uses robust statistics instead of simple arithmetic:

```
Raw prices:     [$2.50, $3.00, $3.25, $3.50, $85.00]
                                                 ↑ outlier

Simple mean:    $19.45  (distorted by $85 outlier)
Taguchi mean:   $3.08   (40% trim removes extremes)
```

**Implementation:**
1. Sort all prices ascending
2. Remove bottom 20% and top 20% (40% total trim)
3. Compute mean of remaining 60%
4. Also compute: median, CV (coefficient of variation), sample size, S/N ratio

### 3.4 Multi-Layer Filtering Pipeline

Every listing goes through a post-fetch filtering cascade:

```
Raw eBay results (80 listings)
  │
  ├─ Junk title exclusion (lots, digital, reprints)
  │    Keywords: "u-pick", "lote", "base cards from", "digital"
  │
  ├─ Name relevance check
  │    All parts of athlete name must appear in title
  │
  ├─ Graded detection (exclude if collecting raw)
  │    Regex: /\b(PSA|BGS|SGC|BVG|KSA|HGA|CSG|ISA|GMA|MNT|TAG|RCG)\s{0,3}\d/i
  │
  ├─ Condition blocklist
  │    "damaged", "poor", "fair", "creases", "water damage"...
  │
  └─ Remaining: Clean, relevant, properly-conditioned listings
       → Statistical processing (Taguchi mean, CV, S/N)
```

### 3.5 Currency Normalization

All prices are normalized to USD:

```javascript
// CBSA Exchange Rates API (Bank of Canada)
// Supports: CAD, GBP, EUR — auto-detected from listing currency
const exchangeRate = await fetchExchangeRate(currency, "USD");
const usdPrice = originalPrice * exchangeRate;
```

---

## 4. Data Architecture

### 4.1 Git as Database

The entire data layer lives in Git:

```
data/
├── athletes.json              # Master roster (550+ athletes)
├── ebay-avg.json              # Raw active prices
├── ebay-graded-avg.json       # Graded active prices
├── ebay-sold-avg.json         # Raw sold prices
├── ebay-graded-sold-avg.json  # Graded sold prices
├── gemrate.json               # PSA population counts
├── gemrate_beckett.json       # Beckett population counts
├── scp-raw.json               # SportsCardsPro prices
├── athlete-history.json       # 90-day rolling time-series
├── athlete-first-seen.json    # First-observation timestamps
├── index-history.json         # Permanent sport index archive
├── scp-history.json           # 5-year SCP backfill
├── vzla-athlete-market-data.json  # Unified weekly snapshot
├── analysis-latest.json       # AI market report
├── ebay-sold-progress.json    # Batch cursor
├── gemrate-progress.json      # Batch cursor
└── ...
```

**Why Git, not a database:**
1. **Version history** — every data point has a full audit trail via git log
2. **Zero infrastructure** — no DB server to maintain for the primary data store
3. **Atomic updates** — git commits are atomic, preventing partial writes
4. **Free hosting** — GitHub serves raw files directly to the frontend
5. **Portable** — clone the repo and you have the entire platform's data

**When Git isn't enough:** The weekly PostgreSQL backup (Render) provides relational querying and disaster recovery for scenarios where Git history isn't sufficient.

### 4.2 Three-Tier Data Freshness Strategy

```
Tier 1: GitHub Raw URLs (always fresh)
  │     fetch("https://raw.githubusercontent.com/.../data/ebay-avg.json",
  │           { cache: "no-store" })
  │
  │     ✅ Updates visible immediately after workflow commits
  │     ❌ Depends on GitHub availability
  │
  ├─ Tier 2: Local public/data/ copies (build-time fallback)
  │     import data from "/data/ebay-avg.json"
  │
  │     ✅ Works when GitHub is down
  │     ❌ Only as fresh as last deployment
  │
  └─ Tier 3: Render PostgreSQL snapshots (disaster recovery)
       SELECT data FROM snapshots
       WHERE file_name = 'ebay-avg.json'
       ORDER BY snapshot_date DESC LIMIT 1

       ✅ Full historical archive
       ❌ Requires manual intervention to restore
```

### 4.3 Time-Series Data Management

**Rolling windows (athlete-history.json):**
- 90-day cap prevents unbounded file growth
- Daily snapshots capture: price, CV, days on market, listing count, index level
- Both raw and graded data stored per entry
- Minimum 7 data points required before sparklines render

**Permanent archives (index-history.json):**
- Sport-level index snapshots stored indefinitely
- Each entry: `{ date, sportIndex, athleteCount }`
- Used for long-term trend analysis on the homepage

### 4.4 Unified Weekly Snapshot

Every Sunday at 12:00 UTC, all data sources merge into one file:

```javascript
// snapshot-market-data.js consolidates:
const sources = {
  ebayRaw:       readJson("data/ebay-avg.json"),
  ebayGraded:    readJson("data/ebay-graded-avg.json"),
  ebaySoldRaw:   readJson("data/ebay-sold-avg.json"),
  ebaySoldGraded:readJson("data/ebay-graded-sold-avg.json"),
  gemrate:       readJson("data/gemrate.json"),
  scp:           readJson("data/scp-raw.json"),
  history:       readJson("data/athlete-history.json"),
};
// → merged per-athlete record in vzla-athlete-market-data.json
```

**Purpose:** Serves as both a consolidated backup and the data source for the Blog Data Table, ensuring all metrics are consistent at a single point in time.

---

## 5. Backup & Disaster Recovery

### 5.1 Weekly PostgreSQL Backup

```javascript
// backup-to-render.js — dynamic file discovery
const FILES = fs.readdirSync(DATA_DIR)
  .filter((f) => f.endsWith(".json"))
  .map((f) => path.join("data", f));
```

**Schema:**
```sql
CREATE TABLE IF NOT EXISTS snapshots (
  id            SERIAL PRIMARY KEY,
  file_name     TEXT NOT NULL,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  size_bytes    INTEGER,
  data          JSONB NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (file_name, snapshot_date)  -- Idempotent upsert
);
```

**Idempotent upsert pattern:**
```sql
INSERT INTO snapshots (file_name, snapshot_date, size_bytes, data)
VALUES ($1, CURRENT_DATE, $2, $3)
ON CONFLICT (file_name, snapshot_date) DO UPDATE
SET data = EXCLUDED.data,
    size_bytes = EXCLUDED.size_bytes,
    created_at = NOW();
```

**Capacity planning:** ~7-8 MB per weekly snapshot × 52 weeks = ~400 MB/year. Render's 1GB free tier supports ~2.5 years before requiring cleanup.

### 5.2 Recovery Procedures

```sql
-- Restore a single file
SELECT data FROM snapshots
WHERE file_name = 'athletes.json'
ORDER BY snapshot_date DESC LIMIT 1;

-- List all snapshots for a date range
SELECT file_name, snapshot_date, size_bytes
FROM snapshots
WHERE snapshot_date BETWEEN '2026-01-01' AND '2026-03-20'
ORDER BY snapshot_date DESC;

-- Full platform restore (all latest files)
SELECT DISTINCT ON (file_name)
  file_name, data, snapshot_date
FROM snapshots
ORDER BY file_name, snapshot_date DESC;
```

---

## 6. Deployment & Hosting

### 6.1 Frontend: Lovable (Zero-Config)

- React + Vite + TypeScript + Tailwind CSS
- Automatic builds on git push
- No manual deployment steps
- Preview URLs for testing before publish

### 6.2 Backend: Render (Express OAuth Server)

- Node.js Express server at `api.vzlasportselite.com`
- Sole purpose: eBay OAuth token management
- Environment variables: `EBAY_REDIRECT_URI`, `EBAY_ENV`, `FRONTEND_URL`
- Rate-limited with `express-rate-limit`
- CORS configured for frontend domain

### 6.3 Compute: GitHub Actions (Serverless)

- All data processing runs as GitHub Actions jobs
- No persistent servers for data collection
- Runners are ephemeral — no state between runs (all state in Git)
- Free tier provides 2,000 minutes/month (more than sufficient)

---

## 7. Secret Management

### 7.1 GitHub Secrets Inventory

| Secret | Used By | Purpose |
|--------|---------|---------|
| `EBAY_CLIENT_ID` | ebay.yml, ebay-graded.yml | Browse API authentication |
| `EBAY_CLIENT_SECRET` | ebay.yml, ebay-graded.yml | Browse API authentication |
| `RENDER_DATABASE_URL` | backup-render.yml | PostgreSQL backup connection |
| `GEMINI_API_KEY` | bi-weekly-analysis.yml | AI narrative generation |
| `NBA_API_KEY` | update.yml | Basketball roster sync |
| `SPORTSDB_KEY` | update.yml | Multi-sport roster sync |
| `SPORTSCARDSPRO` | scp-prices.yml | Card price API |

### 7.2 Token Refresh Architecture

```
User → Render OAuth Server → eBay Auth
         │
         ├─ Exchanges auth code for access + refresh tokens
         ├─ Stores refresh token in Render env vars
         └─ GitHub Secrets updated manually when tokens rotate
```

---

## 8. Anti-Blocking & Rate Limiting

### 8.1 eBay HTML Scraping

```javascript
// Rotating User-Agents (sold listing scrapers)
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36...",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)...",
  // 5+ variants
];

// Randomized delays between requests
const delay = BASE_DELAY_MS + Math.random() * 2000;
await sleep(delay);

// Inter-page delay to simulate human browsing
await sleep(INTER_PAGE_DELAY_MS);
```

### 8.2 Gemrate.com Scraping

```python
# Anti-blocking: randomized delays, session persistence
session = requests.Session()
session.headers.update({"User-Agent": random.choice(USER_AGENTS)})
time.sleep(random.uniform(3, 7))  # Random delay between athletes
```

### 8.3 SportsCardsPro API

```javascript
// Rate limiting: 500ms between requests, 3s pause every 50 athletes
await sleep(500);
if (processedCount % 50 === 0) await sleep(3000);
```

### 8.4 eBay Browse API Quota

- Production quota: 5,000 calls/day
- Current usage: ~1,138 calls/run
- Mitigation: Run every ~5 days instead of daily
- Single-marketplace optimization: Graded script queries only EBAY_US

---

## 9. Monitoring & Observability

### 9.1 File-Based Dashboards

Without Datadog or CloudWatch, the platform uses committed JSON files as its observability layer:

| File | What It Monitors |
|------|-----------------|
| `ebay-sold-progress.json` | Batch cursor, last completion time, cycle duration |
| `gemrate-progress.json` | Scraping cursor, cooldown status |
| `athletes_dedupe_report.json` | Deduplication audit trail |
| `new-graded-athletes.json` | New roster additions |
| `analysis-latest.json` | AI analysis health (includes fallback flag) |

### 9.2 Data Quality Signals

| Metric | Threshold | Action |
|--------|-----------|--------|
| CV > 35% | "Unstable" label | Visual warning on athlete cards |
| CV > 100% | Anomaly flag | Included in bi-weekly analysis alerts |
| Price change > 50% | Anomaly flag | Highlighted in AI market report |
| `nListing < 4` | Below minimum | Price not displayed (insufficient data) |
| `isGradedListing()` false positive | Regex gap ≤ 3 chars | Prevents raw/graded data contamination |

### 9.3 Pipeline Health Indicators

```javascript
// Progress file doubles as health check
{
  "startIdx": 340,
  "lastBatchAt": "2026-03-19T18:00:05.123Z",
  "totalAthletes": 553,
  "cycleComplete": false
}
```

If `lastBatchAt` is more than 24 hours stale for an hourly pipeline, something is broken.

---

## 10. Documentation Strategy

### 10.1 Documentation Inventory

| Document | Purpose | Update Frequency |
|----------|---------|-----------------|
| `docs/PLATFORM-GUIDE.md` | Central reference (420+ lines) | Every feature change |
| `docs/DATA-PIPELINE-AUDIT.md` | eBay pipeline deep-dive | After bug fixes |
| `docs/DISASTER-RECOVERY.md` | Platform rebuild blueprint | After infra changes |
| `docs/HEADSHOT-FIXES.md` | Image lookup chain | After image bugs |

### 10.2 Script Header Blocks

Every data script includes a standardized documentation header:

```javascript
// =============================================================================
// scripts/sold-update-ebay-avg.js — RAW SOLD LISTING PRICE COLLECTOR
// =============================================================================
//
// PURPOSE:   [one-line description]
// WORKFLOW:  [workflow file] ([schedule])
// ENV VARS:  [required environment variables]
// INPUT:     [input files]
// OUTPUT:    [output files]
// PROGRESS:  [progress tracking file]
//
// PIPELINE (per athlete):
//   1. [Step 1]
//   2. [Step 2]
//   ...
//
// SEE ALSO: docs/DATA-PIPELINE-AUDIT.md §[section]
// =============================================================================
```

### 10.3 AI Memory Annotations

Structured memory notes enable consistent AI collaboration across sessions:

```
memory/infrastructure/workflow-scheduling
memory/tech/data-architecture
memory/tech/ebay-scraper-architecture
memory/infrastructure/data-backups
memory/docs/technical-documentation
```

These act as "persistent context" — the AI reads them at the start of each session to understand the system without re-reading every file.

---

## 11. Collaboration Patterns (Human ↔ AI)

### 11.1 Development Workflow

```
1. Human describes intent     → "Add Beckett grading data alongside PSA"
2. AI reads existing code     → Understands gemrate.py, data architecture
3. AI proposes architecture   → New script, new workflow, new data file
4. Human approves/adjusts     → "Offset the schedule by 2 hours from PSA"
5. AI implements              → Creates fetch_gemrate_beckett.py + workflow
6. AI updates documentation   → Adds to PLATFORM-GUIDE.md
7. AI updates memory          → Creates memory/infrastructure/workflow-scheduling
8. Git auto-commits           → Changes live in production within minutes
```

### 11.2 Debugging Workflow

```
1. Human reports issue        → "Sold prices seem wrong for baseball"
2. AI reads console logs      → Identifies filtering gap
3. AI traces data flow        → Finds regex allowing graded cards through
4. AI proposes fix            → Tighten regex gap from {0,5} to {0,3}
5. AI audits all scripts      → Ensures fix applied consistently everywhere
6. AI creates audit document  → DATA-PIPELINE-AUDIT.md §5.1
7. Human verifies in preview  → Confirms prices normalized
```

### 11.3 What Makes AI Collaboration Work

| Factor | Implementation |
|--------|---------------|
| **Living documentation** | PLATFORM-GUIDE.md is the AI's "onboarding doc" |
| **Structured data** | JSON files are self-describing — AI can reason about them |
| **Standardized patterns** | Every workflow follows the same skeleton |
| **Memory annotations** | Key decisions persist across AI sessions |
| **Incremental context** | Never dump 10K lines — focus on relevant files |
| **Script headers** | AI reads the header block to understand a script without reading 1000+ lines |

---

## 12. Lessons Learned

### 12.1 What Went Right

1. **Git as database** eliminated infrastructure complexity
2. **Batch processing** turned a 550-athlete pipeline into manageable chunks
3. **Rebase-safe commits** prevented data loss from concurrent workflows
4. **3-tier HTML parsing** survived multiple eBay frontend changes
5. **Robust statistics** (Taguchi) produced more reliable signals than simple averages
6. **Documentation-first** approach enabled effective AI collaboration

### 12.2 What Went Wrong (and How We Fixed It)

| Problem | Root Cause | Fix |
|---------|-----------|-----|
| Graded cards in raw dataset | Regex gap too wide ({0,5}) | Tightened to {0,3} |
| eBay API ignoring filters | Missing `categoryId:` prefix | Added to all aspect filter strings |
| Progress tracker overwritten | Stale checkout in concurrent runs | Added `fetch-depth: 0` + rebase |
| Corrupted JSON after crash | Partial writes during preemption | `catch → return {}` self-healing |
| API quota exhaustion | Daily runs × 2 marketplaces | Reduced to ~5-day cycle, single marketplace for graded |
| False positive junk detection | Substring matching ("base" in "baseball") | Switched to word-boundary regex |

### 12.3 DevOps Principles Validated

| Principle | How This Project Proves It |
|-----------|--------------------------|
| **Automate everything** | 15+ workflows, zero manual data collection |
| **Version control everything** | Code, data, docs, config — all in Git |
| **Fail fast, recover faster** | Exponential backoff, checkpoint/resume, self-healing |
| **Monitor relentlessly** | Progress files, data quality signals, anomaly detection |
| **Document for the next person** | The "next person" is an AI — and it works |
| **Infrastructure as code** | Workflows ARE the infrastructure definition |
| **Continuous improvement** | Every bug becomes an audit item and a documentation update |
