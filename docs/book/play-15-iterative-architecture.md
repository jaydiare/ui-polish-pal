# Play 15: Iterative Architecture with AI

---

> *"Ship fast, refactor continuously, document everything. Each iteration adds one capability — never a big-bang rewrite."*

---

## The Evolution Timeline

VZLA Sports Elite didn't emerge fully formed. It was built incrementally over months, each iteration adding exactly one new capability, documenting it, and automating it before moving to the next.

### Iteration 1: Static Athlete Grid

The platform started as a React page displaying a grid of Venezuelan athlete names and their sports. No data pipelines, no prices, no analytics. Just a static JSON file (`athletes.json`) rendered as cards.

**What was automated:** Nothing. The data was manually curated.

**What was documented:** The athlete JSON schema — `{ name, sport, league, team }`.

### Iteration 2: eBay API Integration

The first pipeline: `update-ebay-avg.js` fetched active listing prices from the eBay Browse API and computed simple averages. Each athlete card now displayed a price.

**What was automated:** Price collection via `ebay.yml` (initially daily).

**What was documented:** API authentication flow, search query format, output file schema.

### Iteration 3: Statistical Pricing

Simple averages were misleading — a single $500 vintage card would skew a $5 average. The Taguchi Winsorized Mean replaced the arithmetic mean, and the Coefficient of Variation was added as a stability signal.

**What was automated:** Nothing new — the existing pipeline was upgraded in place.

**What was documented:** Statistical formulas, CV thresholds, the rationale for 40% trim.

### Iteration 4: Sold Listing Scrapers

Active listing prices represent what sellers *want*. Sold prices represent what buyers *actually paid*. HTML scraping of eBay's sold listings added the most valuable pricing signal — real transaction data.

**What was automated:** `ebay-sold.yml` and `ebay-graded-sold.yml` — batch scrapers running every 2-3 hours.

**What was documented:** Anti-blocking strategies, three-tier extraction, junk title filters.

### Iteration 5: Budget Optimizer

With prices for 550+ athletes, a natural question emerged: "I have $100 — which cards should I buy?" A knapsack algorithm was implemented to solve this combinatorial optimization problem.

**What was automated:** Nothing — client-side computation in the browser.

**What was documented:** Knapsack algorithm parameters, value scoring formula (stability × liquidity × S/N ratio).

### Iteration 6: PSA Grading Data

Grading population (how many cards exist in each grade) affects scarcity and value. Integration with Gemrate.com added PSA population counts to each athlete.

**What was automated:** `gemrate.yml` — batch scraper running every 4 hours.

**What was documented:** Category mapping, cooldown logic, anti-blocking measures.

### Iteration 7: Historical Snapshots and Sparklines

Point-in-time prices are useful. Price trends are actionable. Daily snapshots (`snapshot-history.yml`) began recording prices, creating a 90-day rolling time series. Sparkline charts were added to each athlete card.

**What was automated:** `snapshot-history.yml` — daily at 10:00 UTC. `market-data-snapshot.yml` — weekly consolidation.

**What was documented:** 90-day rolling window logic, firstSeen tracking, index calculation.

### Iteration 8: AI Market Analysis

Bi-weekly reports combining statistical analysis with Google Gemini's narrative generation. The platform now produces prose market commentary alongside raw data.

**What was automated:** `bi-weekly-analysis.yml` — runs on the 1st and 15th.

**What was documented:** Gemini API integration, truncated JSON recovery, statistical-only fallback.

### Iteration 9: Automated Backups

With 15+ critical data files, losing the Git repository would be catastrophic. Weekly PostgreSQL backups to Render added a second recovery layer.

**What was automated:** `backup-render.yml` — weekly on Sundays.

**What was documented:** Disaster recovery spec (650+ lines), secrets inventory, recovery decision tree.

### Iteration 10: Multi-Grader Support

PSA was the only grading company tracked initially. Adding Beckett support required a separate workflow, separate data file, and separate cooldown tracking — without disrupting the existing PSA pipeline.

**What was automated:** `gemrate-beckett.yml` — staggered 2 hours from PSA.

**What was documented:** Multi-grader detection regex, staggering rationale, flag synchronization.

---

## The Pattern: Add One Thing, Document It, Automate It

Every iteration follows the same three-step pattern:

```
1. Add the capability (code)
2. Document the capability (docs)
3. Automate the capability (pipeline)
```

This sequence is deliberate. Code without documentation becomes institutional knowledge that dies between sessions. Documentation without automation becomes a manual process that gets forgotten. Automation without documentation becomes a black box that nobody understands when it breaks.

The three steps form a stable cycle:

```
     ┌──────────┐
     │   Code   │──── New capability works
     └────┬─────┘
          │
     ┌────▼─────┐
     │   Docs   │──── AI can maintain it next session
     └────┬─────┘
          │
     ┌────▼─────┐
     │ Automate │──── Runs without human intervention
     └────┬─────┘
          │
     (next iteration)
```

---

## Why Not a Big-Bang Rewrite?

At several points, the platform's architecture could have justified a complete rewrite:

- When statistical pricing replaced simple averages, the entire data pipeline could have been redesigned.
- When sold listings were added, the eBay integration could have been unified into a single script.
- When multi-grader support was added, the grading pipeline could have been generalized.

In each case, the incremental approach was chosen instead. Why?

**1. Risk containment.** A rewrite of the eBay pipeline risks breaking the 4 workflows that depend on it. An incremental change to one workflow risks breaking that workflow only. When your only testing is production, minimize blast radius.

**2. AI collaboration favors small changes.** An AI working from documentation can reliably make small, well-defined changes. "Add Beckett support to the grading pipeline" is a clear, bounded task. "Redesign the entire data architecture" is a conversation that could go in a hundred directions.

**3. Documentation stays current.** When each iteration produces its own documentation update, the docs evolve alongside the code. A big-bang rewrite produces a burst of code changes followed by a documentation debt that never gets repaid.

**4. Rollback is trivial.** If iteration 8 (AI analysis) doesn't work out, revert the changes and everything from iterations 1-7 still functions. With a rewrite, rollback means going back to a fundamentally different architecture.

---

## The Refactoring Threshold

Incremental doesn't mean never refactoring. The platform applies refactoring at specific trigger points:

- **When a bug affects multiple scripts** — The `isGradedListing()` regex was tightened from `{0,10}` to `{0,3}` across all four eBay scripts simultaneously, because the bug was systemic.
- **When documentation reveals inconsistency** — The DATA-PIPELINE-AUDIT was created when the AI noticed that four scripts used slightly different filtering logic. The audit both documented and fixed the inconsistencies.
- **When a new capability requires structural change** — Adding multi-grader support required creating a `sync-gemrate-flags.yml` workflow that didn't fit into any existing category. This was new structure, not refactoring.

The rule: **refactor when you must, iterate when you can.**

---

## Key Takeaways

1. **One capability per iteration** — Add, document, automate, then move on
2. **Incremental beats big-bang** — Smaller blast radius, easier rollback, documentation stays current
3. **AI collaboration favors bounded tasks** — "Add X" is clearer than "redesign everything"
4. **Refactor at trigger points** — Systemic bugs, documented inconsistencies, structural requirements
5. **Each iteration is independently valuable** — The platform was useful at iteration 1; iteration 10 made it powerful
6. **The three-step cycle is the discipline** — Code → Docs → Automate prevents entropy
