# Play 2: Version Control as the Single Source of Truth

---

> *"Our database doesn't have an admin panel, doesn't accept SQL queries, and has never had a minute of downtime. It's a Git repository."*

---

## The Principle

Version control isn't just for code. In a DevOps culture, *everything* lives in version control — infrastructure definitions, configuration, documentation, and yes, even data. The repository is the single source of truth. If it's not in Git, it doesn't exist.

VZLA Sports Elite takes this principle to its logical extreme: the Git repository is not just where the code lives. It's the database, the configuration store, the audit trail, the progress tracker, and the backup coordination point for the entire platform.

This chapter explains why that decision was made, how it works in practice, and when it stops working.

---

## The Data Architecture

Open the `data/` directory of the VZLA Sports Elite repository and you'll find 20+ JSON files:

```
data/
├── athletes.json                  # Master roster: 553 athletes
├── ebay-avg.json                  # Raw active listing prices
├── ebay-graded-avg.json           # Graded active listing prices
├── ebay-sold-avg.json             # Raw sold prices
├── ebay-graded-sold-avg.json      # Graded sold prices
├── gemrate.json                   # PSA grading population
├── gemrate_beckett.json           # Beckett grading population
├── scp-raw.json                   # SportsCardsPro prices
├── athlete-history.json           # 90-day rolling time-series
├── athlete-first-seen.json        # First-observation timestamps
├── index-history.json             # Permanent sport index archive
├── scp-history.json               # 5-year SCP price backfill
├── vzla-athlete-market-data.json  # Unified weekly snapshot
├── analysis-latest.json           # AI market analysis report
├── ebay-sold-progress.json        # Batch processing cursor
├── gemrate-progress.json          # Batch processing cursor
├── gemrate-cooldown.json          # Scraping cooldown timer
├── ebay-base-prices.json          # First-observed prices (index base)
├── ebay-match-cache.json          # API query result cache
└── card-tracker.json              # eBay store inventory tracker
```

This is not a prototype hack. This is a production data platform serving real users with daily-updated market intelligence. Every one of these files is read by automated pipelines, written by automated pipelines, served to the frontend, and backed up weekly to a PostgreSQL database.

The total size of the `data/` directory is roughly 7-8 MB. That's less than a single high-resolution photograph.

---

## The Master Roster: `athletes.json`

At the heart of the system is a single file: `data/athletes.json`. It's an array of 553 objects:

```json
[
  {
    "name": "Ronald Acuña Jr.",
    "sport": "Baseball",
    "league": "MLB",
    "team": "Atlanta Braves",
    "gemrate": "yes"
  },
  {
    "name": "José Altuve",
    "sport": "Baseball",
    "league": "MLB",
    "team": "Houston Astros",
    "gemrate": "yes"
  }
]
```

This file is the roster — the canonical list of every athlete tracked by the platform. Every pipeline in the system reads it:

- **eBay scrapers** iterate through it to know which athletes to query
- **Gemrate scrapers** use it to know which athletes need grading data
- **Snapshot scripts** use it to cross-reference data sources
- **The frontend** uses it as the definitive athlete list

There is no athletes table in a database. There is no API endpoint that returns the roster. There is `data/athletes.json`, committed to Git, and that's it.

### Why This Works

1. **Atomic updates.** When the monthly roster sync adds new athletes, the entire file is rewritten and committed in a single atomic operation. There's no partial state — you either have the old roster or the new one.

2. **Full audit trail.** Every addition, removal, or modification to the roster is visible in `git log data/athletes.json`. You can answer "When was this athlete added?" with a single command: `git log --diff-filter=A -p -- data/athletes.json | grep "athlete name"`.

3. **Zero coordination.** Every pipeline reads the same file from the same commit. There's no race condition between "writing a new athlete to the database" and "reading the roster for scraping." The roster is immutable within a single pipeline run — it changes only between commits.

4. **Portable.** Clone the repo and you have the entire platform's data. No database credentials, no connection strings, no migrations. `git clone` and you're done.

### The Deduplication Guard

Because multiple data sources contribute athletes (TheSportsDB, NBA API, manual additions), duplicates can creep in. An automated deduplication script runs as part of the monthly sync:

```yaml
# From update.yml
- name: Auto-dedupe athletes.json (keep oldest by name)
  run: |
    python scripts/dedupe_athletes.py \
      --input data/athletes.json \
      --output data/athletes.json \
      --report data/athletes_dedupe_report.json
```

The deduplication report is itself a committed JSON file — an audit trail of what was merged:

```json
{
  "duplicatesFound": 3,
  "merged": [
    { "name": "Jose Altuve", "keptIndex": 12, "removedIndex": 487 }
  ],
  "timestamp": "2026-03-01T00:00:15.234Z"
}
```

This is version-controlled observability: you can trace exactly when duplicates were detected and how they were resolved, across the entire history of the project.

---

## Data Ownership: One Pipeline, One File

A critical architectural rule in VZLA Sports Elite is that **each data file is owned by exactly one pipeline**:

| File | Written By | Never Written By |
|------|-----------|-----------------|
| `ebay-avg.json` | `ebay.yml` | Any other workflow |
| `ebay-sold-avg.json` | `ebay-sold.yml` | Any other workflow |
| `gemrate.json` | `gemrate.yml` | Any other workflow |
| `athlete-history.json` | `snapshot-history.yml` | Any other workflow |
| `vzla-athlete-market-data.json` | `market-data-snapshot.yml` | Any other workflow |

This rule exists because of Git's merge model. If two workflows write to the same file in overlapping time windows, the rebase-safe commit pattern (Play 6) can handle it — but only if the changes don't conflict at the line level. Two workflows updating different keys in the same JSON file will produce a merge conflict that requires manual intervention.

By giving each file a single owner, conflicts become structurally impossible. The rebase-safe commit pattern only needs to handle the case where different workflows modify *different* files in the same commit window — which Git resolves automatically.

### The Exception: Read-Many, Write-Once

Some files are *read* by many pipelines but *written* by only one:

```
athletes.json ──→ read by ebay.yml, ebay-sold.yml, gemrate.yml, snapshot-history.yml
                  written by update.yml (monthly)

ebay-avg.json ──→ read by snapshot-history.yml, market-data-snapshot.yml
                  written by ebay.yml (every ~5 days)
```

This is the "read-many, write-once" pattern. It works because Git commits are atomic: a reader always sees a complete, consistent state of the file. There's no possibility of reading a half-written file — that failure mode only exists with file-level I/O, and by the time a reader sees the file, it's been committed and pushed as a complete unit.

---

## The Three-Tier Data Freshness Strategy

Here's where "Git as database" meets "web application." The frontend needs to display current market data. But it's a static React application — it can't query a database at runtime. So how does fresh data reach the user?

The answer is a three-tier fallback chain:

### Tier 1: GitHub Raw URLs (Primary)

```typescript
// From useAthleteData.ts — fetching live data on every page load
const [fetchedEbay, fetchedSold, fetchedGemrate, ...rest] = await Promise.all([
  fetchJson("https://raw.githubusercontent.com/jaydiare/ui-polish-pal/main/data/ebay-avg.json"),
  fetchJson("https://raw.githubusercontent.com/jaydiare/ui-polish-pal/main/data/ebay-sold-avg.json"),
  fetchJson("https://raw.githubusercontent.com/jaydiare/ui-polish-pal/main/data/gemrate.json"),
  // ... 9 more parallel fetches
]);
```

The frontend fetches data directly from GitHub's raw content URLs. When a pipeline commits new data to `main`, the raw URL serves the updated content immediately — no deployment, no build, no cache invalidation required.

The `fetchJson` helper enforces cache-busting:

```typescript
async function fetchJson(path: string) {
  try {
    const res = await fetch(path, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
```

`cache: "no-store"` tells the browser: "Never use a cached version of this response. Always fetch from the network." This ensures users see the latest data, even if they visited the page five minutes ago and the pipeline has since updated.

**Why this matters:** The eBay sold listing scraper runs every 3 hours. Without `cache: "no-store"`, a user who loaded the page at 9:00 AM might see stale data until their browser cache expired — potentially hours or days later. With it, they always see the latest available data.

### Tier 2: Local `public/data/` Copies (Fallback)

If GitHub's raw content service is down (it happens — rarely, but it happens), the application falls back to local copies:

```
public/data/
├── athletes.json
├── ebay-avg.json
├── ebay-sold-avg.json
├── gemrate.json
└── ...
```

These files are committed to the repository and deployed with the application. They're only as fresh as the last deployment, but they ensure the application never shows a completely blank page.

Every data pipeline copies its output to both locations:

```yaml
# From ebay-sold.yml
- name: Copy to public
  run: |
    mkdir -p public/data
    cp data/ebay-sold-avg.json public/data/ebay-sold-avg.json 2>/dev/null || true
```

The `2>/dev/null || true` is a defensive pattern: if the source file doesn't exist (because the pipeline had no data to write), the copy silently fails rather than crashing the workflow.

### Tier 3: Render PostgreSQL Snapshots (Disaster Recovery)

If both GitHub raw URLs and local copies fail — or if the entire repository needs to be rebuilt from scratch — there's a third tier: weekly snapshots in a managed PostgreSQL database.

```javascript
// From backup-to-render.js — dynamic file discovery
const FILES = fs.readdirSync(DATA_DIR)
  .filter((f) => f.endsWith(".json"))
  .map((f) => path.join("data", f));
```

The backup script doesn't maintain a hardcoded list of files. It dynamically discovers every JSON file in the `data/` directory at runtime. When a new pipeline is added and starts producing a new JSON file, the backup automatically includes it — zero configuration required.

Each file is stored as a JSONB row:

```sql
CREATE TABLE IF NOT EXISTS snapshots (
  id            SERIAL PRIMARY KEY,
  file_name     TEXT NOT NULL,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  size_bytes    INTEGER,
  data          JSONB NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (file_name, snapshot_date)
);
```

The `UNIQUE (file_name, snapshot_date)` constraint enables idempotent upserts:

```sql
INSERT INTO snapshots (file_name, size_bytes, data)
VALUES ($1, $2, $3)
ON CONFLICT (file_name, snapshot_date)
DO UPDATE SET data = $3, size_bytes = $2, created_at = NOW()
```

Run the backup twice on the same day? The second run overwrites the first — no duplicates, no errors.

Recovery is a single SQL query:

```sql
-- Restore a specific file from the latest snapshot
SELECT data FROM snapshots
WHERE file_name = 'athletes.json'
ORDER BY snapshot_date DESC LIMIT 1;

-- Restore the entire platform from a specific date
SELECT file_name, data FROM snapshots
WHERE snapshot_date = '2026-03-15';
```

### Why Three Tiers?

Each tier trades freshness for reliability:

| Tier | Freshness | Availability | Recovery Speed |
|------|-----------|-------------|---------------|
| GitHub Raw | Real-time (minutes) | 99.9%+ | Automatic |
| Local `public/` | Deploy-time (days) | 100% (bundled) | Automatic |
| PostgreSQL | Weekly (7 days max) | 99.5% (Render SLA) | Manual (SQL query) |

In practice, Tier 1 handles 99%+ of requests. Tier 2 has been triggered maybe twice in the project's history. Tier 3 has never been needed for production recovery — but knowing it's there means the difference between "annoying outage" and "catastrophic data loss."

---

## Time-Series: Rolling Windows and Permanent Archives

Not all data has the same lifecycle. VZLA Sports Elite uses two distinct patterns for historical data:

### Rolling Windows (90-Day Cap)

`athlete-history.json` stores daily snapshots per athlete, capped at 90 days:

```javascript
// From snapshot-athlete-history.js
const MAX_DAYS = 90;

// Trim to MAX_DAYS
if (history[name].length > MAX_DAYS) {
  history[name] = history[name].slice(-MAX_DAYS);
}
```

Each entry captures a point-in-time snapshot:

```json
{
  "Ronald Acuña Jr.": [
    {
      "date": "2026-03-18",
      "raw": { "price": 4.23, "cv": 0.18, "n": 12, "idx": 94.2, "obsDays": 45 },
      "graded": { "price": 28.50, "cv": 0.22, "n": 6, "idx": 102.1 },
      "sold": 3.87,
      "sport": "Baseball"
    }
  ]
}
```

The 90-day cap serves two purposes:

1. **File size control.** 553 athletes × 90 days × ~200 bytes per entry = ~10 MB. Without the cap, the file would grow without bound — adding ~3.5 MB per month — and eventually slow down both Git operations and frontend loading.

2. **Relevance.** For a sports card market intelligence platform, 90 days of price history captures meaningful trends (seasonal patterns, post-injury dips, championship effects) without drowning in noise from six months ago when the market was fundamentally different.

The `firstSeen` tracker implements a clever reset mechanism:

```javascript
// Raw firstSeen
if (rawHasListings) {
  if (!firstSeen[name].raw) firstSeen[name].raw = date;
} else {
  // Listings gone — reset so counter restarts when they reappear
  delete firstSeen[name].raw;
}
```

When an athlete's listings disappear (delisted, sold out, or removed), their `firstSeen` date resets. When new listings appear, the clock starts again. This gives the "days on market" metric its meaning: it measures the current listing age, not the time since the athlete was first ever tracked.

### Permanent Archives (No Cap)

`index-history.json` stores sport-level index snapshots permanently:

```json
[
  { "date": "2026-01-15", "sport": "Baseball", "index": 94.7, "count": 312 },
  { "date": "2026-01-15", "sport": "Soccer", "index": 88.3, "count": 145 },
  { "date": "2026-01-20", "sport": "Baseball", "index": 93.1, "count": 312 }
]
```

This file has no cap because its growth rate is minimal (one entry per sport per data update ≈ 200 bytes every 5 days) and because long-term index trends are the most valuable macro-level signal the platform produces. Losing them would be like losing the S&P 500's price history.

### The Design Decision

The split between rolling and permanent isn't arbitrary:

- **Per-athlete data** (high volume, used for sparklines and short-term signals): Rolling 90-day window
- **Aggregate data** (low volume, used for long-term market trends): Permanent

This pattern applies beyond sports cards. Any time-series system needs to ask: "How much history do we need, and who needs it?" Per-entity detail can almost always be capped. Aggregate metrics should be permanent. The boundary is a function of storage cost, query patterns, and analytical value.

---

## The Unified Snapshot: Consolidation Day

Every Sunday at 12:00 UTC, a consolidation script merges all data sources into a single file:

```javascript
// From snapshot-market-data.js
const athletes = loadJson(join(DATA_DIR, "athletes.json")) || [];
const ebayAvg = loadJson(join(DATA_DIR, "ebay-avg.json")) || {};
const ebayGradedAvg = loadJson(join(DATA_DIR, "ebay-graded-avg.json")) || {};
const ebaySoldAvg = loadJson(join(DATA_DIR, "ebay-sold-avg.json")) || {};
const ebayGradedSoldAvg = loadJson(join(DATA_DIR, "ebay-graded-sold-avg.json")) || {};
const athleteHistory = loadJson(join(DATA_DIR, "athlete-history.json")) || {};
const gemrate = loadJson(join(DATA_DIR, "gemrate.json"));
const gemrateBeckett = loadJson(join(DATA_DIR, "gemrate_beckett.json"));
const scpPricesData = loadJson(join(DATA_DIR, "scp-prices.json"));
```

The output — `vzla-athlete-market-data.json` — contains every metric for every athlete at a single point in time. It serves two purposes:

1. **Consistency.** During the week, different data sources update at different frequencies. Raw prices update every 5 days, sold prices every 3 hours, gemrate every 4 hours. The weekly snapshot freezes everything at one moment, ensuring that comparisons between athletes use data from the same time window.

2. **Backup coordination.** The Sunday backup (13:30 UTC) runs *after* the consolidation (12:00 UTC). This means the PostgreSQL backup always contains the freshest unified snapshot. If you need to restore the platform, one file — `vzla-athlete-market-data.json` — gives you a complete picture of the market as of the most recent Sunday.

---

## When Git Isn't Enough

It would be dishonest to pretend this architecture has no limits. Here's where Git-as-database breaks down, and what VZLA Sports Elite does about it:

### Problem 1: File Size

Git stores the complete history of every file. A 7 MB JSON file that changes daily accumulates 7 MB × 365 days = 2.5 GB of history per year. Git handles this, but `git clone` gets progressively slower.

**Mitigation:** The 90-day rolling window on `athlete-history.json` caps the file at ~10 MB. Older history is preserved in the PostgreSQL backup, not in Git. For files that grow without bound, this is the escape hatch — Git for the working set, a database for the archive.

### Problem 2: No Query Engine

You can't `SELECT * FROM athletes WHERE sport = 'Baseball' AND cv < 0.2`. You can load the entire file into memory and filter — which is exactly what the frontend does — but for complex analytical queries, this is clumsy.

**Mitigation:** The weekly snapshot (`vzla-athlete-market-data.json`) is structured specifically for the Blog Data Table, which is the primary analytical view. The file is pre-joined and pre-computed — no runtime joins needed. For ad-hoc analysis, the bi-weekly analysis script loads the raw files and computes whatever it needs in memory.

### Problem 3: No Concurrent Writes

Git is not designed for concurrent writes to the same file. The rebase-safe commit pattern (Play 6) handles concurrent writes to *different* files, but same-file concurrency requires application-level coordination.

**Mitigation:** The "one pipeline, one file" rule eliminates this by design. If a new data source needs to be added, it gets its own file, its own pipeline, and its own workflow. The consolidation script merges at read time, never at write time.

### Problem 4: No Real-Time Updates

A Git commit takes 5-30 seconds to push. There's no way to stream real-time data updates to the frontend. The platform's data is always at least a few minutes behind the latest eBay listings.

**Mitigation:** Sports card pricing doesn't need real-time updates. A card's price doesn't change meaningfully in five minutes. The data freshness window (minutes for Tier 1, hours for most pipelines) is more than adequate for investment decisions that play out over days and weeks.

---

## The Name Normalization Problem

When your database is a collection of JSON files keyed by athlete name, name consistency becomes your most important data integrity challenge.

Consider: is "Jose Altuve" the same athlete as "José Altuve"? What about "Jose Altuve Jr." versus "Jose Altuve"?

Every script that reads athlete data implements the same normalization function:

```javascript
// Strip diacritics, collapse whitespace, remove punctuation, drop suffixes
function normalizeNameForCompare(s) {
  return normSpaces(
    stripDiacritics(s)
      .toLowerCase()
      .replace(/[.''"]/g, "")
      .replace(/\b(jr|jr\.|sr|sr\.)\b/g, "")
  );
}
```

The snapshot consolidation uses a similar normalizer for cross-source lookups:

```javascript
const normKey = (s) =>
  String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[.\-']/g, "").replace(/\s+/g, " ").toLowerCase().trim();

function findRecord(name, sport, data) {
  if (data[name]) return data[name];             // Exact match
  const keyed = `${name} | ${sport}`;
  if (data[keyed]) return data[keyed];            // "Name | Sport" key
  const norm = normKey(name);
  for (const k of Object.keys(data)) {            // Normalized search
    if (normKey(k) === norm) return data[k];
  }
  return null;
}
```

Three levels of matching: exact, compound key, and normalized. This cascade handles the reality that different data sources store names differently:

- eBay API: `"Ronald Acuna Jr."`
- Gemrate: `"Ronald Acuña Jr."`
- SportsCardsPro: `"Ronald Acuña"`
- Wikipedia: `"Ronald Acuña Jr."`

In a relational database, you'd use a foreign key. In a Git-based data architecture, you use aggressive normalization and fuzzy matching. It's less elegant, but it works — and it requires zero schema migrations.

---

## The Lesson

The decision to use Git as the primary data store was not an ideological choice. It was a practical one: for a platform with moderate data volume (< 10 MB), infrequent writes (hourly at most), and simple query patterns (filter and display), a Git repository provides version control, backup, deployment, and data storage in a single system with zero infrastructure cost.

The three-tier freshness strategy — GitHub raw URLs for real-time access, local copies for availability, PostgreSQL for disaster recovery — gives the architecture the same robustness as a traditional database deployment, without any of the operational overhead.

If VZLA Sports Elite tracked 50,000 athletes instead of 553, or needed sub-second query latency, or required concurrent multi-writer transactions, this architecture would break. A database would be necessary.

But the platform doesn't need those things. And the simplest architecture that meets your actual requirements — not your imagined future requirements — is always the right one.

That's the version control play: Git isn't just where you store code. It's where you store *truth*. And when your truth fits in 7 MB of JSON, Git is the best database you'll never have to administer.

---

## Try It Yourself

1. Create a `data/` directory in a fresh Git repository
2. Write a JSON file with 10 entries
3. Create a GitHub Actions workflow that modifies one entry and commits
4. Run it five times
5. Use `git log -p data/your-file.json` to see the full history of every change

You now have an audited, versioned, zero-cost database. The question isn't whether this scales to your needs — it's whether you actually need anything more.
