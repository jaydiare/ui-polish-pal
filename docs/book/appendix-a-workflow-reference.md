# Appendix A: Complete Workflow Reference

> **The AI DevOps Playbook — Appendix A**  
> A comprehensive reference for every GitHub Actions workflow in the platform.

---

## Workflow Architecture Overview

The platform operates **15+ GitHub Actions workflows** on a multi-tiered schedule. Every workflow follows a standardized skeleton that ensures consistency, debuggability, and resilience.

### Universal Workflow Skeleton

```yaml
name: [Descriptive Name]
on:
  schedule:
    - cron: "[frequency]"
  workflow_dispatch:
    inputs:
      only:
        description: "Single athlete name — leave empty for full batch"
concurrency:
  group: [unique-group-name]
  cancel-in-progress: true
permissions:
  contents: write
env:
  FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true
```

**Design principles:**
- `workflow_dispatch` on every workflow enables manual debugging
- `concurrency` groups prevent race conditions between scheduled and manual runs
- `permissions: contents: write` follows the principle of least privilege
- `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24` standardizes the Node.js runtime

---

## Complete Schedule Map

### Tier 1: High-Frequency (Every 2–4 Hours)

| Workflow | File | Cron | Script | Data Output |
|----------|------|------|--------|-------------|
| eBay Raw Sold | `ebay-sold.yml` | `0 0,3,6,9,12,15,18,21 * * *` | `sold-update-ebay-avg.js` | `ebay-sold-avg.json` |
| eBay Graded Sold | `ebay-graded-sold.yml` | `30 1,3,5,7,9,11,13,15,17,19,21,23 * * *` | `graded-sold-update-ebay-avg.js` | `ebay-graded-sold-avg.json` |
| PSA Population (Gemrate) | `gemrate.yml` | `0 */4 * * *` | `fetch_gemrate.py` | `gemrate.json` |
| Beckett Population | `gemrate-beckett.yml` | `0 2,6,10,14,18,22 * * *` | `fetch_gemrate_beckett.py` | `gemrate_beckett.json` |

**Notes:**
- Graded sold offset by 90 minutes from raw sold to avoid concurrent execution
- PSA and Beckett offset by 2 hours to prevent simultaneous scraping
- All use batch processing with progress cursors (10 athletes/batch)

### Tier 2: Every ~5 Days (API-Constrained)

| Workflow | File | Cron | Script | Data Output |
|----------|------|------|--------|-------------|
| eBay Raw Active | `ebay.yml` | `0 13 */5 * *` | `update-ebay-avg.js` | `ebay-avg.json`, `index-history.json` |
| eBay Graded Active | `ebay-graded.yml` | `0 8 */5 * *` | `graded-update-ebay-avg.js` | `ebay-graded-avg.json` |

**Notes:**
- Uses authenticated eBay Browse API (5,000 calls/day quota)
- ~1,138 calls per run — every ~5 days keeps well within limits
- Raw runs at 1 PM UTC, Graded at 8 AM UTC (5-hour offset)
- `ebay.yml` also writes sport-level index to `index-history.json`

### Tier 3: Daily

| Workflow | File | Cron | Script | Data Output |
|----------|------|------|--------|-------------|
| Athlete History Snapshot | `snapshot-history.yml` | `0 10 * * *` | `snapshot-athlete-history.js` | `athlete-history.json`, `athlete-first-seen.json` |
| Card Tracker | `card-tracker.yml` | `0 8 * * *` | `card-tracker-update.js` | `card-tracker.json` |

### Tier 4: Weekly (Sunday)

| Workflow | File | Cron | Script | Data Output |
|----------|------|------|--------|-------------|
| Market Data Snapshot | `market-data-snapshot.yml` | `0 12 * * 0` | `snapshot-market-data.js` | `vzla-athlete-market-data.json` |
| Database Backup | `backup-render.yml` | `30 13 * * 0` | `backup-to-render.js` | Render PostgreSQL `snapshots` table |
| Gemrate Flag Sync | `sync-gemrate-flags.yml` | `0 14 * * 0` | `sync-gemrate-flags.cjs` | `athletes.json` (flag updates) |

**Sunday execution order:** 12:00 → 13:30 → 14:00 (consolidate → backup → sync)

### Tier 5: Bi-Weekly / Monthly

| Workflow | File | Cron | Script | Data Output |
|----------|------|------|--------|-------------|
| AI Market Analysis | `bi-weekly-analysis.yml` | `0 14 1,15 * *` | `bi-weekly-analysis.py` | `analysis/YYYYMMDD_vzlasports.json` |
| SCP Prices | `scp-prices.yml` | `0 10 1 * *` | `fetch-scp-raw.js` | `scp-raw.json` |
| Athlete Roster Sync | `update.yml` | `0 0 1 * *` | `fetch_all_vzla.py` | `athletes.json` |

---

## Data Flow Diagram

```
              eBay Browse API                    eBay HTML Scraping
              (authenticated)                    (no API quota)
                    │                                   │
           ┌───────┴───────┐                   ┌───────┴───────┐
           │               │                   │               │
      Raw Active      Graded Active       Raw Sold        Graded Sold
     (ebay.yml)      (ebay-graded)      (ebay-sold)    (ebay-graded-sold)
           │               │                   │               │
           ▼               ▼                   ▼               ▼
     ebay-avg.json   ebay-graded-       ebay-sold-      ebay-graded-
                     avg.json           avg.json        sold-avg.json
           │               │                   │               │
           └───────┬───────┘                   └───────┬───────┘
                   │                                   │
                   ▼                                   ▼
           snapshot-history.yml              vzla-athlete-market-data.json
           (daily roll-up)                   (weekly consolidation)
                   │                                   │
                   ▼                                   ▼
           athlete-history.json              Blog Data Table + Market Intel
           (90-day rolling)

  Gemrate/Beckett ──► gemrate.json ──► Budget Optimizer + Data Table
  SportsCardsPro ──► scp-raw.json ──► Data Table (SCP Raw / SCP Graded)
  Gemini AI ──► analysis-latest.json ──► Market Analysis Reports
```

---

## Commit Pattern Reference

Every data-writing workflow uses the rebase-safe commit pattern:

```yaml
- name: Commit & push (rebase-safe)
  run: |
    set -e
    git config user.name "github-actions[bot]"
    git config user.email "github-actions[bot]@users.noreply.github.com"
    git add [specific files only]
    if git diff --cached --quiet; then
      echo "No changes to commit"
      exit 0
    fi
    git commit -m "[Descriptive message]"
    git fetch origin main
    git rebase --autostash origin/main || \
      (git rebase --abort && git pull --rebase origin main)
    git push origin HEAD:main
```

**Rules:**
1. Always `git add` specific files — never `git add .`
2. Check for actual changes before committing (`git diff --cached --quiet`)
3. Rebase before push to handle concurrent workflow commits
4. Fallback to `pull --rebase` if rebase fails

---

## Secrets Required

| Secret | Workflows | Purpose |
|--------|-----------|---------|
| `EBAY_CLIENT_ID` | `ebay.yml`, `ebay-graded.yml` | Browse API OAuth |
| `EBAY_CLIENT_SECRET` | `ebay.yml`, `ebay-graded.yml` | Browse API OAuth |
| `RENDER_DATABASE_URL` | `backup-render.yml` | PostgreSQL connection string |
| `GEMINI_API_KEY` | `bi-weekly-analysis.yml` | AI narrative generation |
| `NBA_API_KEY` | `update.yml` | Basketball roster data |
| `SPORTSDB_KEY` | `update.yml` | Multi-sport roster data |
| `SPORTSCARDSPRO` | `scp-prices.yml` | Card pricing API |

---

## Troubleshooting Quick Reference

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Workflow fails on push | Concurrent commit conflict | Re-run — rebase handles it |
| Progress stuck at same index | Runner preempted mid-write | Delete progress file, re-run |
| API returns 0 results | Token expired or quota exceeded | Refresh OAuth token |
| "No changes to commit" | Data unchanged since last run | Expected — no action needed |
| Corrupted JSON in data/ | Partial write during crash | Self-heals on next run (`catch → return {}`) |

---

*See Play 4 (Anatomy of a Pipeline), Play 5 (Scheduling Strategies), Play 6 (Resilient Pipelines), and Play 7 (Pipeline Orchestration) for the full narrative behind these workflows.*
