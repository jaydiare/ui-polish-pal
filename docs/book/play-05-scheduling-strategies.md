# Play 5: Scheduling Strategies — Balancing Freshness vs. Cost

---

> *"Not everything needs to run every minute. The art of scheduling is knowing how stale your data can be before anyone notices — and staying one step fresher than that."*

---

## The Scheduling Problem

When you have one pipeline, scheduling is trivial. Run it daily, move on.

When you have fifteen pipelines sharing API quotas, writing to the same Git repository, and depending on each other's outputs, scheduling becomes an orchestration problem. Run too frequently and you'll exhaust API quotas, trigger rate limits, and create merge conflicts. Run too infrequently and your data goes stale, your users see yesterday's prices, and your platform loses credibility.

VZLA Sports Elite solved this with a multi-tiered scheduling architecture — five distinct frequency tiers, each matched to the underlying data's rate of change and the cost of collection.

---

## The Five Tiers

### Tier 1: High Frequency (Every 2-3 Hours)

**Workflows:** `ebay-sold.yml`, `ebay-graded-sold.yml`

```yaml
# ebay-sold.yml — every 3 hours
- cron: "0 0,3,6,9,12,15,18,21 * * *"

# ebay-graded-sold.yml — every 2 hours, offset by 90 minutes
- cron: "30 0,2,4,6,8,10,12,14,16,18,20,22 * * *"
```

Sold listings are the most time-sensitive data on the platform. When a card sells on eBay, that transaction represents a real market price — not a seller's aspirational asking price. Collectors making buy/sell decisions need this data to be fresh.

But there's a constraint: these scrapers process 10 athletes per batch (out of 550+). At 10 athletes every 3 hours, a full cycle takes approximately 5.5 days. The batch size is deliberately small to keep each workflow run short (under 10 minutes), avoid triggering eBay's anti-scraping measures, and maintain politeness toward the servers.

**Why two separate workflows?** Raw sold and graded sold use different search URLs, different filtering logic, and produce different output files. Separating them means a bug in the graded scraper doesn't block raw sold data collection. They're staggered by 90 minutes to ensure they never run simultaneously — preventing both merge conflicts and suspiciously concurrent requests to eBay.

### Tier 2: Medium Frequency (Every 4 Hours)

**Workflows:** `gemrate.yml`, `gemrate-beckett.yml`

```yaml
# gemrate.yml — every 4 hours at :00
- cron: '0 */4 * * *'

# gemrate-beckett.yml — every 4 hours at :30 (2-hour offset from PSA)
- cron: '30 2,6,10,14,18,22 * * *'
```

Grading population data (how many cards of each athlete have been graded by PSA or Beckett) changes slowly — a few new submissions per day at most. Every 4 hours provides adequate freshness.

Like the sold scrapers, grading scrapers process athletes in batches (20 per run). The two grading companies are separated into distinct workflows and staggered by 2 hours. This prevents simultaneous execution, which matters because:

1. Both workflows commit to the same repository — simultaneous pushes cause merge conflicts
2. Both scrape third-party websites — concurrent sessions from the same IP increase detection risk
3. Debugging is easier when you know exactly which grader's data was being collected at any given time

### Tier 3: Low Frequency (Every ~5 Days)

**Workflows:** `ebay.yml`, `ebay-graded.yml`

```yaml
# ebay.yml — every ~5 days at 1 PM UTC
- cron: "0 13 */5 * *"

# ebay-graded.yml — every ~5 days at 8 AM UTC
- cron: "0 8 */5 * *"
```

Active listing prices (what sellers are currently asking) change less urgently than sold prices. A card listed today will likely still be listed tomorrow at the same price. Refreshing every 5 days provides adequate freshness while staying well within eBay's Browse API production quota.

The `*/5` day-of-month pattern runs on the 1st, 6th, 11th, 16th, 21st, 26th, and 31st — approximately every 5 days. This is deliberately synced with the sold-listing batch cycle (~5.6 days for a full pass), so active listing data and sold data refresh at roughly the same rate.

**API quota management** is the primary constraint here. The eBay Browse API has production quotas that limit the number of calls per day. By running every 5 days instead of daily, the platform reduces API consumption to approximately 7 runs per month — leaving headroom for manual test runs and debugging.

### Tier 4: Weekly

**Workflows:** `market-data-snapshot.yml`, `backup-render.yml`, `sync-gemrate-flags.yml`

```yaml
# Sunday sequence — carefully ordered
market-data-snapshot.yml:  "0 12 * * 0"   # 12:00 UTC
backup-render.yml:         "30 13 * * 0"   # 13:30 UTC
sync-gemrate-flags.yml:    "0 14 * * 0"    # 14:00 UTC
```

Weekly workflows handle consolidation and maintenance tasks. The Sunday sequence is deliberately choreographed:

1. **12:00** — Market data snapshot aggregates six data sources into a single unified file (`vzla-athlete-market-data.json`). This runs first because it reads from other data files.
2. **13:30** — Backup script sends all JSON files to Render PostgreSQL. This runs after the snapshot so the backup includes the freshest consolidated data.
3. **14:00** — Gemrate flag sync reconciles athlete roster changes with grading population data. This runs last because it may modify athlete flags based on the latest data.

The 90-minute gaps between jobs aren't arbitrary. Each workflow needs time to complete its run, commit changes, and push to `main`. If the next workflow starts too quickly, it might check out stale code (before the previous commit landed).

### Tier 5: Monthly / Bi-Weekly

**Workflows:** `update.yml`, `bi-weekly-analysis.yml`

```yaml
# update.yml — monthly
- cron: '0 0 1 * *'

# bi-weekly-analysis.yml — 1st and 15th of each month
- cron: '0 6 1,15 * *'
```

The slowest tier handles structural changes and analytical reports. The athlete roster sync runs monthly because roster changes (new athletes, retirements) happen infrequently. The bi-weekly analysis uses Google Gemini to generate narrative market reports — running less often keeps within the free-tier API limits while still providing regular insights.

---

## The Scheduling Matrix

| Workflow | Cron | Freq | Batch? | Reason |
|----------|------|------|--------|--------|
| `ebay-sold.yml` | `0 */3 * * *` | 3h | 10/run | Sold = real prices, most time-sensitive |
| `ebay-graded-sold.yml` | `30 */2 * * *` | 2h | 10/run | Staggered from raw sold |
| `gemrate.yml` | `0 */4 * * *` | 4h | 20/run | Pop data changes slowly |
| `gemrate-beckett.yml` | `30 2,6,10,14,18,22` | 4h | 20/run | Staggered from PSA |
| `ebay.yml` | `0 13 */5 * *` | ~5d | All | API quota constraint |
| `ebay-graded.yml` | `0 8 */5 * *` | ~5d | All | Staggered from raw |
| `snapshot-history.yml` | `0 10 * * *` | Daily | All | After listing updates |
| `market-data-snapshot.yml` | `0 12 * * 0` | Weekly | All | Sunday consolidation |
| `backup-render.yml` | `30 13 * * 0` | Weekly | All | After snapshot |
| `sync-gemrate-flags.yml` | `0 14 * * 0` | Weekly | All | After backup |
| `bi-weekly-analysis.yml` | `0 6 1,15 * *` | 2/mo | All | Gemini free-tier limit |
| `update.yml` | `0 0 1 * *` | Monthly | All | Rosters change slowly |

---

## Staggering: The Unwritten Rule

The single most important scheduling principle is: **never run two workflows at the same time.**

Every workflow in this system commits to the same Git repository. Two concurrent commits to `main` will cause merge conflicts. Even with rebase logic, concurrent pushes create race conditions that waste CI minutes and occasionally corrupt progress files.

The staggering patterns:
- **Same-tier stagger:** Raw sold at `:00`, graded sold at `:30`. PSA grading at `:00`, Beckett at `:30`.
- **Cross-tier ordering:** Daily snapshot at 10:00, after overnight sold-listing batches complete.
- **Sunday chain:** 12:00 → 13:30 → 14:00, with gaps for commit + push.

---

## Cost Awareness

GitHub Actions provides 2,000 free minutes per month for private repositories (unlimited for public). Each workflow run in this system uses 2-8 minutes. The total monthly consumption:

```
Sold scrapers:     8 runs/day × 30 days × ~3 min = ~720 min
Grading scrapers:  12 runs/day × 30 days × ~2 min = ~720 min  
Active listings:   ~7 runs/mo × ~5 min = ~35 min
Daily snapshot:    30 runs × ~1 min = ~30 min
Weekly jobs:       4 runs × ~2 min = ~8 min
Monthly/bi-weekly: 3 runs × ~3 min = ~9 min
─────────────────────────────────────────────
Total:             ~1,522 min/month
```

Well within the free tier, with headroom for manual runs and debugging. But this budget was achieved through deliberate scheduling — if every workflow ran hourly, the platform would exceed its allocation in two weeks.

---

## Key Takeaways

1. **Match frequency to data volatility** — Sold prices need hours, rosters need months
2. **Stagger everything** — No two workflows should ever run simultaneously
3. **Budget your CI minutes** — Free tiers are generous but finite
4. **Batch for politeness** — 10 athletes per run is slow but sustainable
5. **Chain dependent jobs** — Give each workflow time to commit before the next one starts
6. **Sync related schedules** — Active listing and sold data should refresh at similar rates
7. **Always include `workflow_dispatch`** — Manual triggers are your escape hatch when schedules aren't enough
