# Play 4: Anatomy of a Pipeline — Your First GitHub Action

---

> *"Automate repetitive tasks. Make deployments boring. The best pipeline is the one nobody thinks about."*

---

## The Monthly Roster Sync

Every platform needs a heartbeat — a pipeline so fundamental that everything else depends on it. For VZLA Sports Elite, that pipeline is the monthly athlete roster sync.

The roster is the foundation. Every eBay price query, every grading population lookup, every historical snapshot begins with the same question: *who are we tracking?* The answer lives in `data/athletes.json`, a JSON file containing 550+ Venezuelan athletes with their names, sports, leagues, and teams.

Once a month, an automated workflow fetches the latest athlete data from multiple sports APIs, deduplicates the results, and commits the updated roster to the repository. No human intervention required.

Let's walk through every line.

---

## The Workflow File

```yaml
name: Automated Athlete Sync

on:
  workflow_dispatch:
  schedule:
   - cron: '0 0 1 * *'
```

Three lines, three concepts:

**`name:`** — Human-readable identifier. This appears in the GitHub Actions UI and in notification emails. Name your workflows clearly — when you have 15 of them, "CI" and "Deploy" won't cut it.

**`workflow_dispatch:`** — Manual trigger. This single line adds a "Run workflow" button to the GitHub Actions UI. Every workflow should have this. Automated schedules are great, but you'll always need the ability to trigger manually — for testing, for recovery, for "something broke and I need fresh data now."

**`schedule: cron:`** — `0 0 1 * *` means "at midnight UTC on the 1st of every month." This is standard cron syntax:

```
┌─── minute (0)
│ ┌── hour (0)
│ │ ┌─ day of month (1)
│ │ │ ┌ month (*)
│ │ │ │ ┌ day of week (*)
0 0 1 * *
```

Monthly is appropriate for roster updates because athlete rosters change slowly. A new player might debut, a veteran might retire, but it happens on a timeline of weeks, not hours. Match your schedule to your data's rate of change.

---

## Concurrency Control

```yaml
concurrency:
  group: athlete-sync-main
  cancel-in-progress: true
```

This prevents duplicate runs. If a manual trigger fires while a scheduled run is in progress, the in-progress run is cancelled. Without this, you risk two instances of the same script modifying the same files simultaneously — a recipe for corrupted data and merge conflicts.

The `group` name should be unique per workflow. Use descriptive names like `athlete-sync-main` rather than generic `build` or `deploy`.

---

## Environment and Permissions

```yaml
env:
  FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: write
```

**`permissions: contents: write`** — This is critical. By default, the `GITHUB_TOKEN` provided to workflows has read-only access. Since this workflow needs to commit and push changes back to the repository, it needs write permission.

This is deliberately more secure than the alternative: creating a Personal Access Token (PAT) with broad repository access. The `GITHUB_TOKEN` is scoped to the current repository, expires after the workflow run, and its permissions are explicitly declared in the workflow file itself. Anyone reading the YAML can see exactly what this workflow is allowed to do.

---

## The Step Sequence

### Step 1: Checkout

```yaml
- name: Checkout code
  uses: actions/checkout@v4
  with:
    fetch-depth: 0
```

`fetch-depth: 0` clones the full Git history. Most workflows can use `fetch-depth: 1` (shallow clone) for speed, but this workflow needs full history for the rebase step later. If your workflow commits and pushes, always use `fetch-depth: 0`.

### Step 2: Language Setup

```yaml
- name: Set up Python
  uses: actions/setup-python@v5
  with:
    python-version: '3.10'

- name: Install dependencies
  run: pip install requests
```

Explicit version pinning. Don't use `python-version: '3'` — that's a moving target. Pin to a specific minor version so your workflow produces identical results whether it runs today or six months from now.

### Step 3: Execute the Script

```yaml
- name: Run Fetch Script
  env:
    NBA_API_KEY: ${{ secrets.NBA_API_KEY }}
    SPORTSDB_KEY: ${{ secrets.SPORTSDB_KEY }}
  run: python scripts/fetch_all_vzla.py
```

Secrets are injected via `${{ secrets.* }}` — they're stored in the repository's Settings → Secrets and never appear in logs. The script itself reads them from environment variables, keeping the code repository free of credentials.

### Step 4: Post-Processing

```yaml
- name: Auto-dedupe athletes.json (keep oldest by name)
  run: |
    python scripts/dedupe_athletes.py \
      --input data/athletes.json \
      --output data/athletes.json \
      --report data/athletes_dedupe_report.json
```

After fetching, a separate deduplication script runs. This is the **single-responsibility principle** applied to pipelines: one script fetches, another deduplicates. They can be tested independently, reused independently, and debugged independently.

The `--report` flag generates an audit trail (`athletes_dedupe_report.json`) documenting exactly what was deduplicated. This is observability — if something looks wrong downstream, you can trace it back to the deduplication step.

### Step 5: Copy to Public

```yaml
- name: Copy to public
  run: |
    mkdir -p public/data
    cp data/athletes.json public/data/athletes.json
```

The platform maintains two copies of key data files: `data/` (source of truth, consumed by backend scripts) and `public/data/` (served by the frontend as a local fallback). This dual-copy pattern is explained in Play 2 — the frontend can work even if GitHub raw URLs are unavailable.

### Step 6: Commit and Push

```yaml
- name: Commit and Push changes
  run: |
    set -e

    git config --global user.name "GitHub Actions"
    git config --global user.email "actions@github.com"

    git add data/athletes.json data/tsdb_cache.json \
            data/athletes_dedupe_report.json \
            public/data/athletes.json || true

    if git diff --cached --quiet; then
      echo "No changes to commit"
      exit 0
    fi

    git commit -m "Automated sync: Updated Venezuelan athletes"

    git fetch origin main
    git rebase origin/main || \
      (git rebase --abort && git pull --rebase origin main)

    git push origin HEAD:main
```

This commit block contains several important patterns:

1. **`set -e`** — Exit immediately if any command fails. Without this, a failed `git commit` would be silently ignored and the script would continue.

2. **`|| true`** on `git add` — If some files don't exist (first run, or nothing changed), `git add` would fail. The `|| true` prevents this from triggering `set -e`.

3. **Empty change detection** — `git diff --cached --quiet` checks if there's actually anything to commit. If the fetched data is identical to what's already in the repo, we skip the commit entirely. This prevents noise commits.

4. **Rebase before push** — Other workflows may have pushed to `main` since this workflow started. `git fetch origin main` + `git rebase` integrates those changes before pushing. If the rebase fails (merge conflict), it falls back to `git pull --rebase` which handles simple conflicts automatically.

---

## The Complete Mental Model

```
Schedule/Manual Trigger
    │
    ▼
┌──────────┐    ┌──────────┐    ┌──────────┐
│ Checkout │───▶│  Setup   │───▶│ Execute  │
│ (clone)  │    │ (Python) │    │ (fetch)  │
└──────────┘    └──────────┘    └──────────┘
                                     │
                                     ▼
                               ┌──────────┐    ┌──────────┐
                               │  Post-   │───▶│  Commit  │
                               │ Process  │    │ & Push   │
                               └──────────┘    └──────────┘
```

Every pipeline follows this pattern. The specifics change — different languages, different scripts, different data files — but the structure remains: Trigger → Setup → Execute → Post-Process → Commit.

---

## Key Takeaways

1. **Start with one workflow** — Understand every line before scaling to 15
2. **Always include `workflow_dispatch`** — Manual triggers are essential for debugging and recovery
3. **Use `GITHUB_TOKEN` with explicit permissions** — Not PAT tokens with broad access
4. **Detect empty changes** — Don't commit when nothing changed
5. **Rebase before push** — Other workflows may have modified `main` concurrently
6. **Single-responsibility scripts** — One script per concern, composable via workflow steps
7. **Audit trails** — Generate reports alongside data changes for observability
