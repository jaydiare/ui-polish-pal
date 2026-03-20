# Play 7: Pipeline Orchestration — 15 Workflows in Harmony

---

> *"Every Sunday at 14:00 UTC, the last domino falls. Three workflows have already run, each unaware of the others, each trusting that the data it needs was committed hours earlier. It works because the schedule is the contract."*

---

## The Principle

A single automated pipeline is easy. Two pipelines sharing data is manageable. Fifteen pipelines, running at different frequencies, writing to the same repository, reading each other's outputs, all pushing to `main` — that's orchestration.

VZLA Sports Elite runs 15 GitHub Actions workflows. They share no runtime state. They pass no messages. They have no coordinator, no queue, no event bus. The only synchronization mechanism is the Git commit history and the cron schedule.

This chapter maps out how that works — and more importantly, how it doesn't break.

---

## The Complete Workflow Inventory

Here is every automated workflow in the system, organized by frequency:

### Tier 1: High-Frequency (Every 3–4 Hours)

| Workflow | Cron | File Written | Purpose |
|----------|------|-------------|---------|
| `ebay-sold.yml` | `0 0,3,6,9,12,15,18,21 * * *` | `ebay-sold-avg.json` | Raw card sold prices (batches of 10) |
| `ebay-graded-sold.yml` | `30 0,2,4,6,8,10,12,14,16,18,20,22 * * *` | `ebay-graded-sold-avg.json` | Graded card sold prices (batches of 10) |
| `gemrate.yml` | `0 */4 * * *` | `gemrate.json` | PSA grading population data |
| `gemrate-beckett.yml` | `0 2/4 * * *` | `gemrate_beckett.json` | Beckett grading population data |

### Tier 2: Daily

| Workflow | Cron | File Written | Purpose |
|----------|------|-------------|---------|
| `snapshot-history.yml` | `0 10 * * *` | `athlete-history.json` | Daily time-series snapshot |
| `epn-data.yml` | `0 6 * * *` | `epn-performance.json` | eBay Partner Network revenue |

### Tier 3: Every ~5 Days

| Workflow | Cron | File Written | Purpose |
|----------|------|-------------|---------|
| `ebay.yml` | `0 13 */5 * *` | `ebay-avg.json` | Raw active listing prices |
| `ebay-graded.yml` | `0 8 */5 * *` | `ebay-graded-avg.json` | Graded active listing prices |

### Tier 4: Weekly (Sundays)

| Workflow | Cron | File Written | Purpose |
|----------|------|-------------|---------|
| `market-data-snapshot.yml` | `0 12 * * 0` | `vzla-athlete-market-data.json` | Unified market snapshot |
| `backup-render.yml` | `30 13 * * 0` | *(PostgreSQL)* | Disaster recovery backup |
| `sync-gemrate-flags.yml` | `0 14 * * 0` | `athletes.json` | Roster gemrate flag sync |

### Tier 5: Bi-Weekly / Monthly

| Workflow | Cron | File Written | Purpose |
|----------|------|-------------|---------|
| `bi-weekly-analysis.yml` | `0 14 1,15 * *` | `analysis-latest.json` | AI market report |
| `scp-prices.yml` | `0 10 1 * *` | `scp-raw.json` | SportsCardsPro prices |
| `card-tracker.yml` | `0 10 1 * *` | `card-tracker.json` | eBay store inventory |
| `update.yml` | `0 0 1 * *` | `athletes.json` | Athlete roster sync |

That's 15 workflows producing 16+ data files, running a combined **70+ executions per day** at peak.

---

## The Scheduling Strategy

### The Core Insight: Staggered Offsets

The most dangerous scenario in a multi-pipeline system is **temporal collision** — two workflows running simultaneously, both trying to commit to the same branch. Git handles this (Play 6's rebase-safe pattern), but the fewer collisions, the fewer retries, the fewer wasted compute minutes.

VZLA Sports Elite uses three staggering techniques:

#### 1. Hour Offsets Within the Same Frequency

The sold-price scrapers both run every 3 hours, but they're offset by 90 minutes:

```yaml
# ebay-sold.yml — on the hour
- cron: "0 0,3,6,9,12,15,18,21 * * *"

# ebay-graded-sold.yml — 30 minutes past even hours
- cron: "30 0,2,4,6,8,10,12,14,16,18,20,22 * * *"
```

This creates a interleaved schedule where a raw-sold batch finishes well before a graded-sold batch starts:

```
00:00  ▓▓▓ ebay-sold (batch ~8min)
00:30          ▓▓▓ ebay-graded-sold (batch ~8min)
02:00                  (gap)
02:30                      ▓▓▓ ebay-graded-sold
03:00  ▓▓▓ ebay-sold
```

Each workflow gets a clear commit window — typically 20+ minutes of breathing room.

#### 2. Hour Offsets Between Grading Services

The PSA and Beckett gemrate scrapers use the same 4-hour frequency but are phase-shifted by 2 hours:

```yaml
# gemrate.yml (PSA)
- cron: '0 */4 * * *'     # 00:00, 04:00, 08:00, 12:00, 16:00, 20:00

# gemrate-beckett.yml (Beckett)
- cron: '0 2/4 * * *'     # 02:00, 06:00, 10:00, 14:00, 18:00, 22:00
```

This isn't just about Git collision avoidance. Both scripts scrape the same upstream service (Gemrate). If PSA and Beckett queries hit the server simultaneously, the combined request volume could trigger rate limiting or IP blocks. The 2-hour offset ensures the server sees one grader's traffic pattern at a time.

#### 3. Frequency Tiers as Natural Separators

The ~5-day eBay active listing updates run at different hours from everything else:

```yaml
# ebay.yml (raw active) — 13:00 UTC
- cron: "0 13 */5 * *"

# ebay-graded.yml (graded active) — 08:00 UTC
- cron: "0 8 */5 * *"
```

These workflows run infrequently enough that collisions with the 3-hour scrapers are rare — and when they happen, the rebase-safe pattern resolves them automatically.

---

## Data Dependencies: The Implicit DAG

Although no workflow explicitly depends on another, there's an implicit **Directed Acyclic Graph** of data dependencies:

```
┌─────────────────┐
│  athletes.json  │  ← Master roster (monthly update)
│  (update.yml)   │
└────────┬────────┘
         │ read by all eBay/gemrate scrapers
         ▼
┌────────────────────┐    ┌───────────────────┐    ┌──────────────┐
│   ebay-avg.json    │    │ ebay-sold-avg.json │    │ gemrate.json │
│   (ebay.yml)       │    │ (ebay-sold.yml)    │    │ (gemrate.yml)│
│   every ~5 days    │    │ every 3 hours      │    │ every 4 hours│
└────────┬───────────┘    └────────┬───────────┘    └──────┬───────┘
         │                         │                       │
         │ ┌───────────────────────┘                       │
         │ │                                               │
         ▼ ▼                                               │
┌────────────────────┐                                     │
│athlete-history.json│◄────────────────────────────────────┘
│(snapshot-history)  │    reads all data sources
│ daily @ 10:00      │
└────────┬───────────┘
         │
         ▼
┌──────────────────────────┐
│vzla-athlete-market-data  │  reads everything
│(market-data-snapshot.yml)│
│ Sunday @ 12:00           │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ PostgreSQL backup        │  reads all data/ files
│ (backup-render.yml)      │
│ Sunday @ 13:30           │
└──────────────────────────┘
```

### The Contract Is the Schedule

Notice: no workflow triggers another. There are no `workflow_run` triggers, no `repository_dispatch` events, no explicit chaining. Instead, the schedule encodes the dependency:

- The daily snapshot runs at **10:00 UTC** — after the overnight sold-price batches have committed fresh data
- The weekly consolidation runs at **12:00 Sunday** — after the daily snapshot has captured the latest state
- The backup runs at **13:30 Sunday** — after the consolidation has produced the unified snapshot
- The gemrate flag sync runs at **14:00 Sunday** — after the backup has preserved the pre-sync state

This is **temporal coupling** — a form of implicit coordination where ordering is guaranteed by scheduled time slots rather than explicit triggers.

#### Why Not Use `workflow_run` Triggers?

GitHub Actions supports explicit chaining via `workflow_run`:

```yaml
# Hypothetical — NOT used in VZLA Sports Elite
on:
  workflow_run:
    workflows: ["Update eBay averages"]
    types: [completed]
```

VZLA Sports Elite deliberately avoids this pattern for three reasons:

1. **Cascading failures.** If the upstream workflow fails, the downstream workflow never runs. With schedule-based coupling, the downstream workflow runs regardless — using whatever data was last committed. A stale snapshot is better than no snapshot.

2. **Coupling fragility.** Renaming a workflow breaks `workflow_run` triggers. The trigger matches on the workflow *name* string, not an ID. In a system that evolves continuously (often with AI-assisted changes), name stability is not guaranteed.

3. **Debugging opacity.** When a downstream workflow runs late, schedule-based triggers make the cause obvious: either the cron schedule is wrong or GitHub Actions had runner delays. With `workflow_run` chains, you have to trace back through the trigger cascade to find which upstream workflow is the root cause.

---

## The Sunday Choreography

Sunday is the most complex day in the pipeline calendar. Five workflows execute in a carefully sequenced cascade:

```
Sunday Timeline (UTC)
─────────────────────────────────────────────────────────

00:00  ▓▓▓ ebay-sold (batch — ongoing every 3h)
00:30      ▓▓▓ ebay-graded-sold (batch — ongoing every 3h)

06:00  ▓▓▓ epn-data (daily)

10:00  ▓▓▓▓▓ snapshot-history (daily — reads ebay-avg, graded-avg, sold-avg)
            ↓ athlete-history.json committed

12:00      ▓▓▓ market-data-snapshot (WEEKLY)
                ↓ reads athletes.json, ebay-avg.json, ebay-graded-avg.json,
                  ebay-sold-avg.json, ebay-graded-sold-avg.json,
                  athlete-history.json, gemrate.json, gemrate_beckett.json,
                  scp-prices.json
                ↓ writes vzla-athlete-market-data.json

13:30          ▓▓▓ backup-render (WEEKLY)
                    ↓ reads ALL data/*.json files
                    ↓ writes to PostgreSQL (Render)

14:00              ▓▓▓ sync-gemrate-flags (WEEKLY)
                        ↓ reads gemrate.json
                        ↓ updates athletes.json gemrate flags
```

### The 90-Minute Gaps

Each Sunday workflow has at least 90 minutes of buffer before the next one starts:

| Window | Duration | Purpose |
|--------|----------|---------|
| 10:00 → 12:00 | 120 min | Snapshot-history commits; market-data reads committed state |
| 12:00 → 13:30 | 90 min | Market-data commits; backup reads committed state |
| 13:30 → 14:00 | 30 min | Backup completes (read-only, no commit needed) |

The history snapshot takes 1–2 minutes. The market-data snapshot takes under 30 seconds. The backup takes 2–5 minutes depending on data volume. Every workflow finishes well within its allocated window.

The 30-minute gap before gemrate flag sync is shorter because the backup is read-only — it doesn't push to Git, so there's no commit conflict risk. The sync is the only workflow that modifies `athletes.json` on Sunday, and by 14:00, every other Sunday workflow has completed.

### What Happens When a Sunday Workflow Is Late?

GitHub Actions doesn't guarantee exact cron timing. Runners can be delayed by 5–15 minutes during peak load. The Sunday schedule is designed with enough buffer to absorb this:

**Scenario:** The snapshot-history workflow, scheduled for 10:00, doesn't start until 10:15 and finishes at 10:17.

**Impact:** None. The market-data-snapshot at 12:00 has 103 minutes of margin. It reads `athlete-history.json` from Git — which was committed by 10:17. Everything works.

**Scenario:** The market-data-snapshot, scheduled for 12:00, doesn't start until 12:20 and finishes at 12:21.

**Impact:** The backup at 13:30 has 69 minutes of margin. It reads all `data/` files from the checkout, including the freshly committed `vzla-athlete-market-data.json`. Everything works.

**Scenario:** The market-data-snapshot fails entirely.

**Impact:** The backup still runs. It backs up whatever version of `vzla-athlete-market-data.json` exists in the repository — the previous week's snapshot. The unified snapshot is one week stale, but no data is lost and no downstream workflow crashes.

This is the power of schedule-based coupling over event-based chaining: **every workflow is independently viable.** A failure upstream means stale data, not a cascade of skipped jobs.

---

## Concurrency Control: The Safety Net

When a workflow takes longer than expected and the next scheduled run arrives, you could end up with two instances of the same workflow running simultaneously — both reading the same progress cursor, processing the same batch, and racing to commit.

Every workflow that processes batched data uses GitHub Actions concurrency groups:

```yaml
concurrency:
  group: ebay-sold-avg-main
  cancel-in-progress: true
```

The behavior is:

1. Workflow run A starts at 00:00, begins processing athletes 40–49
2. Workflow run B is scheduled at 03:00 while A is still running (unusual, but possible)
3. GitHub Actions sees both runs in the `ebay-sold-avg-main` group
4. Run A is **cancelled immediately**
5. Run B starts fresh, reading the progress cursor from the latest commit

`cancel-in-progress: true` means the newest run always wins. This is the correct behavior for data freshness workloads: if you have to choose between completing an old batch and starting a new one, the new one has more current data.

### Concurrency Groups as Namespaces

Each workflow has a unique concurrency group name:

```yaml
# ebay.yml
group: ebay-avg-main

# ebay-sold.yml
group: ebay-sold-avg-main

# ebay-graded-sold.yml
group: ebay-graded-sold-avg-main

# gemrate.yml
group: gemrate-sync

# gemrate-beckett.yml
group: gemrate-beckett-sync

# backup-render.yml
group: backup-render

# bi-weekly-analysis.yml
group: bi-weekly-analysis
```

These are **intra-workflow** concurrency controls — they prevent two runs of the *same* workflow from overlapping. They do NOT prevent different workflows from running simultaneously, which is deliberate: the eBay sold scraper and the Gemrate scraper can (and should) run in parallel, since they write to different files and hit different APIs.

---

## Avoiding Cascading Failures

The system uses five patterns to prevent a single failure from propagating:

### Pattern 1: Graceful Degradation on Missing Data

Every script that reads another script's output handles the missing-file case:

```javascript
// snapshot-market-data.js
function loadJson(path) {
  try { return JSON.parse(readFileSync(path, "utf-8")); } catch { return null; }
}

const ebayAvg = loadJson(join(DATA_DIR, "ebay-avg.json")) || {};
const gemrate = loadJson(join(DATA_DIR, "gemrate.json"));
```

If `gemrate.json` doesn't exist (because the gemrate scraper hasn't run yet, or failed), the consolidation script continues with `null` — the athlete's gemrate fields will be `null` in the output. The rest of the 553 athletes still get their eBay data.

### Pattern 2: Independent Progress Tracking

Each batched workflow maintains its own progress file:

```
data/ebay-sold-progress.json        → ebay-sold.yml
data/ebay-graded-sold-progress.json → ebay-graded-sold.yml
data/gemrate-progress.json          → gemrate.yml
data/gemrate-progress_beckett.json  → gemrate-beckett.yml
```

If one progress tracker gets corrupted, only that pipeline is affected. The others continue cycling through their athlete roster independently.

### Pattern 3: No Shared Secrets Between Independent Workflows

Workflows only have access to the secrets they need:

| Workflow | Secrets |
|----------|---------|
| `ebay.yml` | `EBAY_CLIENT_ID`, `EBAY_CLIENT_SECRET` |
| `ebay-sold.yml` | *(none — uses HTML scraping)* |
| `gemrate.yml` | *(none — public API)* |
| `backup-render.yml` | `RENDER_DATABASE_URL` |
| `bi-weekly-analysis.yml` | `GEMINI_API_KEY` |
| `scp-prices.yml` | `SPORTSCARDSPRO` |

If an API key is revoked or expires, only the workflow that uses it stops working. The sold-price scrapers, which use HTML scraping instead of authenticated APIs, are completely immune to API key issues.

### Pattern 4: The "No Changes" Exit

Every workflow checks whether it actually produced new data before committing:

```yaml
if git diff --cached --quiet; then
  echo "No changes to commit"
  exit 0
fi
```

This prevents empty commits from cluttering the Git history and — more importantly — prevents a failed scraper from overwriting good data with empty results. If the eBay API returns zero results for a batch (network error, rate limit, temporary outage), the script writes nothing new, and the `git diff --cached --quiet` check exits cleanly.

### Pattern 5: Cooldown Timers

The gemrate scrapers use cooldown files to prevent re-scraping immediately after a complete cycle:

```json
// data/gemrate-cooldown_beckett.json
{
  "completedAt": "2026-03-19T19:01:07.116996+00:00"
}
```

When the scraper finishes a complete pass through all 568 athletes, it records the completion timestamp. On the next scheduled run, it checks the cooldown: if less than 24 hours have passed, it skips the run entirely. This prevents wasted API calls and reduces the risk of triggering rate limits on the upstream service.

```
Cycle timeline (Beckett, 568 athletes, batch of 20):

Run 1:  athletes 0-19    → commit progress (startIdx: 20)
Run 2:  athletes 20-39   → commit progress (startIdx: 40)
...
Run 29: athletes 560-567 → commit progress (startIdx: 0) + cooldown
Run 30: cooldown active  → skip (no API calls, no commit)
Run 31: cooldown active  → skip
Run 32: cooldown expires → athletes 0-19 (new cycle begins)
```

---

## The Failure Matrix

Here's what happens when each component fails — and why the system keeps running:

| Failure | Impact | Recovery |
|---------|--------|----------|
| eBay API down | Active listing prices stale | Next ~5-day run retries automatically |
| eBay HTML scraping blocked | Sold prices stale | Next 3-hour run retries; backoff handles rate limits |
| Gemrate server down | PSA/BGS pop counts stale | Cooldown timer prevents rapid retries; resumes next cycle |
| GitHub Actions runner delayed | Sunday choreography compresses | 90-minute buffers absorb 15+ minute delays |
| Git push conflict | Rebase-safe pattern retries | 3-attempt retry loop with `pull --rebase` |
| `athletes.json` corrupted | All scrapers read empty roster | Monthly sync rewrites entire file; backup has last-good copy |
| PostgreSQL (Render) down | Weekly backup fails | Next week's backup succeeds; 7 days of data in Git history |
| Gemini API quota exceeded | AI analysis report empty | Stats-only fallback renders raw metrics without narrative |
| Progress tracker corrupted | One scraper restarts from index 0 | Re-scrapes already-scraped athletes (idempotent — no harm) |
| SportsCardsPro session expired | Monthly prices stale | `SCP_ONLY` input allows targeted re-run after re-auth |

The key insight: **no single failure can make the platform unusable.** The worst case for any individual failure is that one data dimension goes stale while everything else continues operating normally.

---

## Observability: Reading the Commit Log

With no centralized monitoring dashboard, the Git commit log IS the observability layer:

```bash
$ git log --oneline --since="2 days ago"
a3f7c12 Update eBay sold averages (batch)
b8e2d45 📸 Daily athlete history snapshot 2026-03-19
c1a9f78 Automated sync: Updated Beckett grading data (batch)
d4e6b23 Update eBay graded sold averages (batch)
e7f8a91 Automated sync: Updated PSA grading data (batch)
f2c3d56 Update EPN performance data
```

Each workflow uses a distinctive commit message:

| Pattern | Workflow |
|---------|----------|
| `Update eBay sold averages (batch)` | ebay-sold.yml |
| `📸 Daily athlete history snapshot` | snapshot-history.yml |
| `Automated sync: Updated PSA grading data` | gemrate.yml |
| `📊 Weekly market data snapshot` | market-data-snapshot.yml |
| `🔄 Sync gemrate flags` | sync-gemrate-flags.yml |

If a workflow hasn't committed in its expected window, the absence is immediately visible. "No Beckett sync in 12 hours? Check the cooldown timer. No sold averages in 6 hours? Check the progress cursor."

The progress files themselves are observable — they're committed to the repository:

```json
// data/gemrate-progress.json
{
  "startIdx": 80,
  "lastBatchAt": "2026-03-20T01:45:03.520273+00:00",
  "lastBatchRange": "60-79",
  "totalAthletes": 568
}
```

At a glance: the PSA scraper last ran 4 hours ago, processed athletes 60–79, and will pick up at index 80 next run. The entire system's state is inspectable with `cat data/*progress*.json`.

---

## The Manual Override: `workflow_dispatch`

Every workflow supports manual triggering via `workflow_dispatch`:

```yaml
workflow_dispatch:
  inputs:
    only:
      description: "Single athlete name (e.g. Ronald Acuna Jr.)"
      required: false
      default: ""
```

The `only` / `EBAY_ONLY` / `SCP_ONLY` input parameters allow targeted single-athlete runs — critical for debugging:

```
# "Ronald Acuña's price looks wrong — re-scrape just his data"
→ Trigger ebay.yml with only: "Ronald Acuna Jr."
→ 30-second run instead of full roster
→ Verify fix, no impact on other athletes
```

This is the escape hatch from full automation. When something looks wrong, you don't wait for the next scheduled cycle — you trigger a targeted run, inspect the result, and decide whether the pipeline needs a code fix or whether the upstream data was simply anomalous.

---

## The Lesson

Fifteen workflows running on a single Git repository sounds like chaos. It works because of four architectural constraints:

1. **One pipeline, one file.** No two workflows write to the same output file. Merge conflicts are structurally impossible.

2. **Schedule is the contract.** Dependencies between workflows are encoded in the cron schedule, not in trigger chains. Failures cause staleness, not cascades.

3. **Concurrency groups prevent self-collision.** A delayed workflow run is cancelled in favor of the next scheduled run, preserving data freshness.

4. **Every workflow is independently viable.** Missing inputs default to null. Missing files return empty objects. A workflow that can't reach its data source commits nothing and exits cleanly.

The result is a system where adding a 16th workflow requires only three decisions: what file does it write, when does it run, and what concurrency group does it belong to? The answers to those questions, encoded in a 40-line YAML file, are sufficient to integrate a new pipeline into the orchestra.

That's the orchestration play: you don't need a conductor if every musician knows when to play and which notes are theirs.
