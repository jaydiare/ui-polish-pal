# Play 3: Documentation-Driven Development

---

> *"If it's not documented, it doesn't exist. And if your co-developer has no memory between sessions, undocumented decisions don't just disappear — they were never made."*

---

## The Forgetting Problem

Every software project accumulates decisions. Why was this field named `taguchiListing` instead of `averagePrice`? Why does the eBay scraper use a 3-character gap in its graded-card regex? Why does the condition filter live in post-fetch logic rather than in the API query?

In traditional teams, these decisions live in people's heads. Senior engineers carry institutional knowledge. When they leave, the knowledge leaves with them. Teams compensate with code comments, wikis, and onboarding docs — but these decay. Within six months, the wiki is out of date. Within a year, it's actively misleading.

Now imagine a development partner who has *zero* persistent memory between sessions. Every conversation starts from scratch. Every architectural decision, every bug fix, every "we tried that and it didn't work" moment vanishes the instant the session ends.

This is the reality of AI-assisted development in 2026. And it makes documentation not just important — it makes it load-bearing infrastructure.

---

## The Three Documents That Run the Platform

VZLA Sports Elite is governed by three living documents, each serving a distinct purpose in the development lifecycle:

### 1. The Platform Guide (420+ Lines)

`docs/PLATFORM-GUIDE.md` is the central nervous system. It documents every data file, every pipeline, every statistical formula, every frontend component, and every design token. When a new development session begins, this document provides the AI with complete operational context.

```
## 2. Data Sources & Pipelines

### 2.1 Data Files

| File                          | Description                              |
|-------------------------------|------------------------------------------|
| data/athletes.json            | Master athlete roster                    |
| data/ebay-avg.json            | Raw active listing averages              |
| data/ebay-graded-avg.json     | Graded active listing averages           |
| data/ebay-sold-avg.json       | Raw sold listing averages                |
| data/athlete-history.json     | Per-athlete daily snapshots (90-day)     |
| data/index-history.json       | Daily sport-level index snapshots        |
| data/gemrate.json             | PSA grading population counts            |
```

This isn't documentation for humans to read occasionally. It's a system prompt. Every session begins with the AI reading this document and understanding what the platform does, how data flows, and where the boundaries are.

### 2. The Data Pipeline Audit (890+ Lines)

`docs/DATA-PIPELINE-AUDIT.md` is the forensic record. It documents not just how things work, but *why* they work that way — including every bug that was found and fixed:

```
## 8. Bugs Found & Fixed

### 8.12 — eBay API silently ignores aspect filters without categoryId prefix
  - IMPACT: Queries returned all cards, not just condition-filtered ones
  - ROOT CAUSE: eBay Browse API requires categoryId: prefix before aspect filters
  - FIX: All queries now use "categoryId:261328,Graded:{Yes}" format
  - REGRESSION RISK: High — removing the prefix produces valid-looking but wrong results
```

This is a bug registry. Traditional teams track bugs in Jira or Linear. Here, bugs are documented in the same repository as the code they affect, with explicit regression risk assessments. When the AI works on eBay-related code in a future session, it reads this audit and knows which mistakes have already been made and fixed.

### 3. The Disaster Recovery Specification (650+ Lines)

`docs/DISASTER-RECOVERY.md` is the rebuild blueprint. It contains every architectural decision, every design token, every component hierarchy, and every deployment configuration needed to recreate the platform from scratch:

```
## 1. Project Identity

- Name: VZLA Sports Elite
- Domain: vzlasportselite.com
- Tagline: "Venezuelan Athletes Sports Cards – Daily eBay Price Index"
- Purpose: Sports-card market intelligence platform tracking 550+ Venezuelan athletes
```

This document functions as a system prompt for environment restoration. If the codebase were lost, this single document — combined with the data backup in Render PostgreSQL — would be sufficient to rebuild the entire platform.

---

## Documentation as AI Memory

The critical insight is that these documents don't just describe the system — they *are* the system's memory. Each serves a specific memory function:

| Document | Memory Function | When It's Read |
|----------|----------------|----------------|
| PLATFORM-GUIDE.md | "What does this system do?" | Start of every session |
| DATA-PIPELINE-AUDIT.md | "What mistakes have we made?" | Before modifying pipeline code |
| DISASTER-RECOVERY.md | "How do we rebuild?" | Recovery scenarios, architecture reviews |

This is fundamentally different from how documentation works in traditional teams. In a human team, documentation supplements knowledge that lives in people's heads. In an AI-assisted workflow, documentation *is* the knowledge. There is no other source.

---

## The Header Block Pattern

Every script in the platform begins with a standardized documentation header:

```javascript
// =============================================================================
// scripts/update-ebay-avg.js — RAW ACTIVE LISTING PRICE COLLECTOR
// =============================================================================
//
// PURPOSE:
//   Collects active (Buy It Now) listing prices for RAW (ungraded) sports cards
//   from the eBay Browse API and computes robust statistical averages.
//
// WORKFLOW: ebay.yml (every ~5 days at 1 PM UTC)
// ENV VARS: EBAY_CLIENT_ID, EBAY_CLIENT_SECRET, EBAY_ONLY (optional)
// INPUT:    data/athletes.json (master roster)
// OUTPUT:   data/ebay-avg.json (active listing averages per athlete)
//
// KEY DESIGN DECISIONS:
//   - No Condition Type:{Ungraded} API filter (many raw listings lack this tag)
//   - isGradedListing() uses tight 3-char gap regex to avoid card-number FPs
//   - Base prices stored in dedicated file to prevent graded contamination
//
// SEE ALSO: docs/DATA-PIPELINE-AUDIT.md §3.1, §5.1, §5.2
// =============================================================================
```

This header is not for human developers scanning the file. It's a context injection point. When the AI opens this file, it immediately knows:

1. **What** the script does (purpose)
2. **When** it runs (workflow and schedule)
3. **What** it needs (env vars, inputs)
4. **What** it produces (outputs)
5. **Why** certain decisions were made (design decisions)
6. **Where** to find more context (cross-references)

The `SEE ALSO` line is particularly powerful. It creates a hyperlink between the code and the audit document, ensuring that when the AI modifies this script, it also reads the relevant audit sections — including the bug registry that prevents regressions.

---

## Memory Annotations

Beyond formal documentation, the platform uses inline memory annotations — structured comments that capture decisions at the point where they matter:

```javascript
// ✅ FIXED: isGradedTitle() regex gap tightened to {0,3} to match update-ebay-avg.js
// ✅ FIXED: isJunkTitle() uses word-boundary regex to prevent false positives
```

These annotations serve as guardrails. An AI reading this code knows that the regex was previously looser and was tightened for a specific reason. It won't "optimize" the regex back to its broken state.

The pattern extends to configuration decisions:

```python
BATCH_SIZE = 20  # athletes per run
COOLDOWN_DAYS = 30
```

Every magic number has a comment. Every non-obvious default has a rationale. This isn't about code readability for humans — it's about preventing an AI from changing a carefully tuned parameter because it "looks arbitrary."

---

## The Living Document Workflow

Documentation in this project follows a strict lifecycle:

1. **Decision is made** during a development conversation
2. **Code is implemented** with inline annotations
3. **Platform Guide is updated** to reflect the new capability
4. **Audit document is updated** if the change affects data pipelines
5. **Disaster Recovery is updated** if the change affects architecture

This workflow is enforced by convention, not by tooling. When a new pipeline is added, the AI is instructed to update all three documents. When a bug is fixed, the audit's bug registry gets a new entry. When a design token changes, the disaster recovery spec is updated.

The result is documentation that stays current because it's part of the development process, not an afterthought.

---

## What Documentation-Driven Development Changes

| Traditional Approach | Documentation-Driven (AI) |
|---------------------|--------------------------|
| Docs describe what was built | Docs enable what will be built |
| Knowledge lives in people | Knowledge lives in files |
| Docs decay over time | Docs are maintained every session |
| Bug trackers are separate systems | Bug registry lives with the code |
| Onboarding takes weeks | Onboarding takes one document read |
| Architecture decisions are verbal | Architecture decisions are versioned |

The most counterintuitive lesson: documentation-driven development is *faster* with an AI partner, not slower. Every minute spent documenting a decision saves ten minutes in the next session, because the AI doesn't have to rediscover what was already decided.

---

## Key Takeaways

1. **Documentation is load-bearing infrastructure** — not a nice-to-have, but a requirement for AI collaboration
2. **Three documents, three purposes** — operational context, forensic history, and rebuild specification
3. **Header blocks are context injection** — every script announces what it does, why, and what to read next
4. **Memory annotations prevent regressions** — inline comments capture decisions at the point of action
5. **Living documentation stays current** — because it's part of the workflow, not separate from it
6. **The repo IS the knowledge base** — no external wikis, no separate systems, everything in Git
