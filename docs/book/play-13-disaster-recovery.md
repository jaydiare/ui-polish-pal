# Play 13: Disaster Recovery — Planning for the Worst

---

> *"If you can't recover, you don't really have a system. You have a lucky streak."*

---

## The Recovery Question

Ask any team: "What happens if your production database is deleted right now?"

Most will say "we have backups." Follow up with "where are the backups, how old are they, and how long would it take to restore?" and watch the confidence drain.

VZLA Sports Elite answers this question with a 650-line specification document (`docs/DISASTER-RECOVERY.md`) that contains everything needed to rebuild the platform from scratch — not just the data, but the architecture, the design tokens, the deployment configuration, and the secrets inventory.

---

## Three Recovery Layers

### Layer 1: Git History (Minutes to Recover)

Every data file is committed to the Git repository with full history. If a pipeline commits corrupted data, recovery is:

```bash
# Find the last good commit for a specific file
git log --oneline data/ebay-avg.json

# Restore the file from a specific commit
git checkout abc1234 -- data/ebay-avg.json

# Commit the restoration
git commit -m "Restore ebay-avg.json from pre-corruption state"
```

**Recovery time:** Minutes. This handles the most common failure mode — a script bug that writes bad data.

### Layer 2: PostgreSQL Backup (Hours to Recover)

Every Sunday, the backup workflow sends every JSON file to a Render PostgreSQL database:

```javascript
// backup-to-render.js
await client.query(`
  CREATE TABLE IF NOT EXISTS snapshots (
    id         SERIAL PRIMARY KEY,
    file_name  TEXT NOT NULL,
    snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
    size_bytes INTEGER,
    data       JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (file_name, snapshot_date)
  )
`);
```

The `UNIQUE (file_name, snapshot_date)` constraint makes backups idempotent — running the backup twice on the same day updates the existing row instead of creating a duplicate. This means the backup script is safe to re-run at any time without worrying about double entries.

**Recovery:**

```sql
-- Retrieve the latest backup of any file
SELECT data FROM snapshots
WHERE file_name = 'athletes.json'
ORDER BY snapshot_date DESC LIMIT 1;

-- See backup history
SELECT file_name, snapshot_date, size_bytes
FROM snapshots
ORDER BY snapshot_date DESC;
```

**Recovery time:** Hours (manual process — query the database, save results as JSON, commit to repo).

**Storage budget:** Render's free PostgreSQL tier allows 1 GB. Each weekly snapshot stores approximately 15 JSON files totaling ~8 MB. At 8 MB/week, the free tier supports approximately 125 weeks (~2.4 years) of backup history before any cleanup is needed.

### Layer 3: Disaster Recovery Document (Days to Recover)

If both the Git repository and the database backup are lost, the platform can be rebuilt from `docs/DISASTER-RECOVERY.md`. This document contains:

- **Project identity** — Name, domain, tagline, URLs
- **Exact tech stack** — Framework versions, build tools, hosting configuration
- **Design tokens** — Every color (HSL values), font, spacing value, border radius
- **Component hierarchy** — Every React component with props and behavior
- **Data pipeline specifications** — Every workflow, schedule, input/output, and env var
- **API configurations** — Authentication methods, endpoint URLs, quota limits
- **Secrets inventory** — Every API key and secret needed, with descriptions of where to obtain them

This document functions as a system prompt. Feed it to an AI assistant and instruct it to rebuild the platform, and you'll get a faithful reproduction — not because the AI remembers the original, but because the specification is complete enough to reproduce it.

---

## The Backup Workflow

```yaml
name: Weekly backup to Render PostgreSQL

on:
  schedule:
    - cron: "30 13 * * 0"   # Every Sunday at 1:30 PM UTC
  workflow_dispatch:

concurrency:
  group: backup-render
  cancel-in-progress: true

permissions:
  contents: read    # Read-only — backup doesn't modify the repo
```

Key details:

- **Schedule:** 1:30 PM UTC on Sundays — 90 minutes after the market data snapshot (12:00) to ensure the snapshot is committed before the backup runs.
- **Permissions:** `contents: read` only. The backup workflow reads data files but never writes to the repository. This is the principle of least privilege — if the backup script were compromised, it couldn't modify source code.
- **Dynamic file discovery:** Rather than hardcoding which files to back up, the script scans the `data/` directory for all JSON files:

```javascript
const FILES = fs.readdirSync(DATA_DIR)
  .filter(f => f.endsWith('.json'))
  .map(f => path.join('data', f));
```

When a new data file is added to the platform, it's automatically included in backups without any configuration change.

---

## Secrets Recovery

The disaster recovery document includes a secrets inventory — the list of every API key, token, and credential the platform needs:

| Secret | Where to Obtain | Used By |
|--------|----------------|---------|
| `EBAY_CLIENT_ID` | eBay Developer Program | `ebay.yml`, `ebay-graded.yml` |
| `EBAY_CLIENT_SECRET` | eBay Developer Program | `ebay.yml`, `ebay-graded.yml` |
| `RENDER_DATABASE_URL` | Render Dashboard | `backup-render.yml` |
| `NBA_API_KEY` | RapidAPI | `update.yml` |
| `SPORTSDB_KEY` | TheSportsDB | `update.yml` |
| `GEMINI_API_KEY` | Google AI Studio | `bi-weekly-analysis.yml` |

Secrets themselves are never documented (that would be a security vulnerability). Instead, the inventory documents *where* to find them — which service to log into, which dashboard to navigate to, which button to click. Combined with access to the service accounts, any person or AI can reconstruct the secrets store.

---

## Testing Recovery

The cheapest disaster recovery is the one you've already tested. The platform's recovery has been validated through several real incidents:

1. **Corrupted progress file** — An empty `ebay-sold-progress.json` (from a failed write) caused the workflow to crash. The defensive `readProgress()` function was added to handle this case by resetting to index 0.

2. **Stale data conflict** — Two workflows ran close together, and the second one's `git push` failed because `main` had moved. The 3-attempt retry loop with `git pull --rebase -X ours` was added to handle this automatically.

3. **API format change** — eBay changed the HTML structure of sold listings pages. The three-tier extraction fallback (CSS → data attributes → script tags) caught the change and continued operating with degraded but functional parsing.

Each incident was resolved, documented in the audit, and the recovery mechanism was strengthened.

---

## The Recovery Decision Tree

```
Something went wrong. How do I recover?

Q: Is the data in Git but corrupted?
├── Yes → git checkout <last-good-commit> -- <file>
│         Recovery time: minutes
│
Q: Is the Git repo intact but data is missing?
├── Yes → Re-run the relevant pipeline manually (workflow_dispatch)
│         Recovery time: minutes to hours (depends on batch size)
│
Q: Is the repo damaged but Render DB is up?
├── Yes → Query snapshots table, restore JSON files, recommit
│         Recovery time: hours
│
Q: Is everything lost?
└── Yes → Follow DISASTER-RECOVERY.md from scratch
          Recovery time: days (but possible)
```

---

## Key Takeaways

1. **Three recovery layers** — Git history (minutes), PostgreSQL backup (hours), rebuild spec (days)
2. **Idempotent backups** — `UNIQUE (file_name, snapshot_date)` makes re-runs safe
3. **Dynamic file discovery** — New data files are automatically backed up
4. **Secrets inventory, not secrets** — Document where to find credentials, never the credentials themselves
5. **Test your recovery** — Every recovery mechanism in this system was validated by a real incident
6. **The cheapest disaster recovery is the one you already have** — Git + managed DB covers 99% of failure modes
