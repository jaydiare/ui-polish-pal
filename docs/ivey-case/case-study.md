# VZLA Sports Elite: DevOps with an AI Partner

---

**Case Type:** General Experience  
**Decision-Point Date:** January 2026  
**Location:** Toronto, Ontario, Canada  
**Recommended Length:** Approximately 8 pages (body), plus exhibits  

---

## Introduction

In January 2026, Juan Rodriguez, a Professional Engineer and Technical Program Manager at TELUS Health in Toronto, reviewed the commit history of a project that should not have existed.¹ Over the previous months, he had built a production-grade data platform — fifteen automated pipelines, six external API integrations, statistical pricing algorithms, and a responsive React frontend — without writing a single line of code himself. His engineering partner was Lovable, a conversational AI development tool that generated code, configured infrastructure, and authored documentation through natural-language dialogue.²

The platform, VZLA Sports Elite, tracked over 550 Venezuelan athletes across professional sports, aggregating market pricing data from eBay, grading population statistics from PSA and Beckett, and historical trends from SportsCardsPro.³ It was, by any objective measure, a real piece of infrastructure: workflows executed on schedules, data flowed through fallback chains, and pricing algorithms applied industrial statistical methods to filter marketplace noise.

But Rodriguez had built it using a development methodology that challenged conventional DevOps assumptions. His AI partner retained no memory between sessions.⁴ Every conversation started from zero — no recollection of what had been built, what had failed, or what architectural decisions had been made. The entire system's continuity depended not on an engineering team's institutional knowledge but on documentation, version control, and the DevOps principles Rodriguez applied to compensate for his partner's amnesia.

Rodriguez now faced a question that extended beyond his personal project: could DevOps principles — automation, version control, resilience, observability, and continuous improvement — serve as a sufficient framework for human-AI software collaboration? Or did this model introduce structural risks that traditional DevOps was not designed to address?

---

## Background

### Rodriguez's Approach to Engineering

Rodriguez brought a cross-disciplinary background to the project. He held a Professional Engineer (P.Eng.) designation, a Master's degree with a concentration in Product Innovation, and a UX Design Certificate from George Brown College in Toronto.⁵ He had spent over eighteen years in the telecommunications industry and lectured at York University on engineering and technology topics. His professional role at TELUS Health involved managing cross-functional technical programs.

Rather than treating the card platform as a casual project, Rodriguez applied the engineering rigour he practised professionally. He framed every infrastructure choice as a DevOps decision: How would this pipeline recover from failure? Where did this architectural knowledge live? What happened when the system's only developer — the AI — forgot everything?

### The AI as Development Partner

Lovable operated through natural-language conversation.⁶ Rodriguez described requirements in plain English; the AI generated React components, JavaScript and Python scripts, GitHub Actions workflows, and technical documentation in response. The tool produced a full-stack application using React, Vite, TypeScript, and Tailwind CSS, deployed with continuous integration.

The AI's technical output was substantial. It wrote every script in the repository, designed every automated workflow, implemented statistical formulas adapted from industrial quality engineering, and authored four comprehensive documentation files totalling over two thousand lines.⁷ It debugged eBay API edge cases, designed database backup schemas, and applied accessibility standards to the frontend interface.

However, the AI operated under a fundamental constraint: it had no persistent memory.⁸ Each conversation session was independent. The AI could not recall previous sessions, prior architectural decisions, bugs that had been discovered, or conventions the codebase followed. Every session began as though the project did not exist.

This constraint became the defining challenge of the collaboration — and the lens through which Rodriguez applied DevOps principles.

---

## DevOps Principles as Collaboration Infrastructure

Rodriguez did not set out to test DevOps theory. The principles emerged organically as solutions to the practical problems of building software with a stateless partner. In retrospect, he identified six principles that had made the collaboration viable.

### Principle 1: Version Control as the Single Source of Truth

Every artifact — code, data, documentation, workflow configuration — lived in a single Git repository.⁹ There were no external wikis, no shared drives, no chat messages containing critical decisions. Git was not merely a code repository; it was the project's institutional memory.

This was a direct response to the AI's amnesia. When the AI had no memory, the repository had to contain everything needed to reconstruct context. Rodriguez adopted a "Git-as-Database" pattern: market data was stored as JSON files committed directly to the repository, and pipeline outputs were versioned alongside the code that produced them.¹⁰ Every data change was a code change, subject to the same version control discipline.

The approach had trade-offs. Git was not designed for query operations, and repository size grew with each commit. But it eliminated an entire category of risk: there was no database server to fail, no credentials to expire, no external state to synchronize. The repository was the system.

### Principle 2: Documentation as Infrastructure

In traditional engineering teams, institutional knowledge lived in engineers' heads, supplemented by documentation. When the "engineer" forgot everything between sessions, documentation became the sole carrier of architectural context.¹¹

Rodriguez maintained four living technical documents: a Platform Guide (422 lines), a Disaster Recovery Plan (656 lines), a Data Pipeline Audit (894 lines), and a Headshot Fixes reference (68 lines).¹² Combined, this was over two thousand lines of documentation for roughly fifteen thousand lines of code — a 1:7 ratio that was unusually high for any project, let alone a personal one.

These documents were not written for human readers. They were written for the AI. Traditional documentation explained *what* a system did. Rodriguez's documentation explained *what, why, and what not to do*:

> The sold listing scraper uses HTML scraping (NOT the Browse API) because eBay's Browse API does not reliably return sold listings. **DO NOT** add API authentication to the sold scripts — they work without it.¹³

Every "DO NOT" in the documentation represented a mistake that had been made and corrected. The documentation was a registry of lessons learned, encoded in a format the AI could consume at the start of each session.

The Disaster Recovery document was the most revealing. Its opening line read: "A complete system prompt–style specification to rebuild this website from scratch."¹⁴ It included exact CSS token values, component hierarchies, data flow diagrams, and ten known gotchas. It was simultaneously disaster recovery for the codebase and context recovery for the AI.

### Principle 3: Automation Over Manual Intervention

No data collection, processing, or deployment step required manual execution.¹⁵ Fifteen GitHub Actions workflows ran on cron schedules, covering data collection, statistical processing, snapshot generation, and disaster recovery backups (see Exhibit 1). The only manual interventions were debugging sessions triggered by failure notifications or anomalous data.

Automation was not just an efficiency choice — it was a reliability requirement. Because Rodriguez could not pair-program with the AI continuously, every pipeline had to operate independently. Each workflow fetched its own dependencies, validated its own inputs, and committed its own outputs. Rodriguez adopted a "stateless architecture" principle: no pipeline assumed that any previous pipeline had run successfully.¹⁶

### Principle 4: Resilience Through Layered Redundancy

The platform implemented a three-layer data availability model (see Exhibit 2).¹⁷ The primary layer served data from GitHub's raw content URLs. If that failed, the frontend fell back to local copies bundled at build time. If those were corrupted, a weekly PostgreSQL backup on Render provided disaster recovery.

Within individual data fields, a price fallback chain provided graceful degradation: `taguchiListing → avgListing → trimmedListing → avg → average` (see Exhibit 3). Each level used a less robust but more available pricing method, ensuring that no athlete profile displayed empty data.¹⁸

This redundancy pattern emerged from a specific failure. Early in the project, an eBay API quota exhaustion caused a pipeline to overwrite valid data with an empty object. The AI fixed the immediate bug, but Rodriguez documented the failure pattern and required all subsequent pipelines to implement merge-before-write logic. The documentation ensured the AI applied the same protection to every future pipeline without re-learning the lesson.¹⁹

### Principle 5: Observability Through Data Quality

Rather than traditional application performance monitoring, the platform monitored data quality.²⁰ Were prices within expected ranges? Were grading population counts increasing monotonically? Were pipeline commit timestamps on schedule?

The pricing engine applied a Taguchi winsorized mean — a method from industrial quality engineering — to eBay's inherently noisy marketplace data.²¹ By trimming the outer 40% of price observations and replacing them with boundary values, the algorithm produced pricing signals resistant to outliers.²² A coefficient of variation (CV) for each athlete's data served as a stability score: below 15% indicated reliable pricing; above 40% signalled high volatility.²³

Data anomalies were the primary alert mechanism. When Ronald Acuña Jr.'s price appeared unexpectedly low, Rodriguez investigated and discovered that the graded-card filter was matching "PSA ready" listings (ungraded cards marketed as submission candidates) as graded cards. The AI fixed the regex, and Rodriguez documented the edge case for future sessions.²⁴

### Principle 6: Iterative Development with Session Boundaries

The platform was built in ten incremental capability layers, each adding one functional area before moving to the next (see Exhibit 4).²⁵ At no point was the system in a half-migrated state. Each iteration produced committed, working code.

This was the natural rhythm of AI-assisted development. Each conversation session had a clear lifecycle: context loading (the AI read documentation and relevant code), implementation (the AI wrote and tested code), and documentation update (the session's decisions were captured for future sessions).²⁶ The documentation update was not optional — it was the mechanism by which the current session's knowledge transferred to the next.

Rodriguez estimated that documentation updates cost roughly thirty minutes per session, totalling fifteen to twenty hours over the project's life. Each hour of documentation saved five to ten hours of re-explanation in future sessions — a roughly 10:1 return on investment.²⁷

---

## The Human-AI Division of Labour

The collaboration was not "human thinks, AI types." The AI proposed architectures, identified edge cases, and suggested patterns from its training data that Rodriguez had never encountered. The interaction was genuinely bidirectional (see Exhibit 5).²⁸

But there was an asymmetry. Rodriguez accumulated context across sessions; the AI did not. Rodriguez knew *why* the Beckett grading pipeline was offset by two hours from the PSA pipeline (to prevent concurrent load on the Gemrate server), *why* SGC grading was excluded (insufficient market share to justify the API calls), and *why* Best Offer listings were filtered from sold data (the displayed price was the asking price, not the accepted offer).²⁹

Without Rodriguez providing this narrative context — the *why behind the why* — the AI might add SGC support because it seemed like a logical extension, or schedule both grading pipelines at the same time because no documentation said otherwise. The human's role was not primarily technical. It was curatorial: maintaining the narrative of the project so that each session's AI partner could execute within the correct constraints.³⁰

Rodriguez described his role as shifting from **producer** to **curator**:

- **Curator of context** — deciding what documentation to write and maintain
- **Curator of quality** — reviewing AI-generated code for correctness
- **Curator of direction** — choosing what to build next
- **Curator of constraints** — encoding lessons learned to prevent future mistakes

---

## The Decision

By January 2026, the DevOps principles had proven sufficient to build the platform. But Rodriguez questioned whether they were sufficient to sustain it. Several challenges remained:

**Testing gap.** The platform had no automated test suite.³¹ Data quality was monitored through statistical methods and pipeline outputs, but there were no unit tests, integration tests, or end-to-end tests. Rodriguez relied on the robustness of the Taguchi methods and manual verification to catch errors.

**Bus factor.** Despite over two thousand lines of documentation, Rodriguez was the only person who understood the system holistically.³² The AI could reconstruct understanding from documentation, but only if the documentation was comprehensive and current. Any gap in documentation was a gap in recoverability.

**Scalability.** eBay's Browse API had rate limits.³³ Adding athletes or increasing collection frequency required architectural changes that Rodriguez had not designed — batching strategies, queue management, or API tier upgrades.

**Infrastructure costs.** The platform ran on free tiers: GitHub Actions (2,000 minutes per month) and Render PostgreSQL (1 GB).³⁴ Growth in data volume or pipeline complexity could exceed these limits.

Rodriguez considered three paths:

1. **Maintain the status quo** — continue operating the platform with incremental improvements, accepting the risks of no testing and single-operator dependency.
2. **Formalize the infrastructure** — invest in automated testing, staging environments, and operational runbooks to bring the platform to professional-grade reliability.
3. **Scale the methodology** — use the platform as a case study to demonstrate that human-AI DevOps collaboration could be applied to larger systems, developing educational or consulting offerings around the approach.

Each path had different implications for time investment, technical risk, and Rodriguez's original goal: creating a technical legacy for his children that demonstrated what one person and an AI could build using sound engineering principles.³⁵

---

## Footnotes

1. Juan D. Rodriguez, personal project records, VZLA Sports Elite repository, GitHub, January 2026.
2. Lovable, "Lovable Documentation — AI-Powered Web Application Development," accessed March 2026, https://docs.lovable.dev/.
3. Professional Sports Authenticator, "PSA Population Report," accessed March 2026, https://www.psacard.com/pop; Beckett Grading Services, "Beckett Grading — Card Authentication & Grading," accessed March 2026, https://www.beckett.com/grading.
4. Shraddha Barke, Michael B. James, and Nadia Polikarpova, "Grounded Copilot: How Programmers Interact with Code-Generating Models," *Proceedings of the ACM on Programming Languages (OOPSLA)* 7 (2023), https://doi.org/10.1145/3586030.
5. Juan D. Rodriguez, LinkedIn profile, accessed March 2026.
6. Lovable, "Lovable Documentation."
7. Rodriguez, personal project records.
8. Barke, James, and Polikarpova, "Grounded Copilot."
9. Thomas A. Limoncelli, "GitOps: A Path to More Self-Service IT," *Communications of the ACM* 61, no. 9 (2018): 38, https://doi.org/10.1145/3233241.
10. Scott Chacon and Ben Straub, *Pro Git*, 2nd ed. (New York: Apress, 2014), https://git-scm.com/book/en/v2.
11. Daniele Procida, "Diátaxis: A Systematic Approach to Technical Documentation," accessed March 2026, https://diataxis.fr/.
12. Rodriguez, personal project records.
13. Rodriguez, personal project records, `docs/DATA-PIPELINE-AUDIT.md`.
14. Rodriguez, personal project records, `docs/DISASTER-RECOVERY.md`.
15. GitHub, "GitHub Actions Documentation," accessed March 2026, https://docs.github.com/en/actions.
16. Adam Wiggins, "The Twelve-Factor App," 2017, https://12factor.net/.
17. Michael L. Nygard, *Release It! Design and Deploy Production-Ready Software*, 2nd ed. (Raleigh, NC: Pragmatic Bookshelf, 2018), 75.
18. Genichi Taguchi, *Introduction to Quality Engineering: Designing Quality into Products and Processes* (Tokyo: Asian Productivity Organization, 1986), 22.
19. Rodriguez, personal project records, `docs/DATA-PIPELINE-AUDIT.md`, Bug 8.7: Empty-Run Data Wipe.
20. Betsy Beyer et al., *Site Reliability Engineering: How Google Runs Production Systems* (Sebastopol, CA: O'Reilly Media, 2016), 63, https://sre.google/sre-book/table-of-contents/.
21. Taguchi, *Introduction to Quality Engineering*, 22.
22. Donald J. Wheeler, *Understanding Industrial Experimentation*, 2nd ed. (Knoxville, TN: SPC Press, 1990), 88.
23. Hervé Abdi, "Coefficient of Variation," in *Encyclopedia of Research Design*, ed. Neil J. Salkind (Thousand Oaks, CA: Sage Publications, 2010), https://doi.org/10.4135/9781412961288.n56.
24. Rodriguez, personal project records, `docs/DATA-PIPELINE-AUDIT.md`, Bug 8.17.
25. Eric Ries, *The Lean Startup: How Today's Entrepreneurs Use Continuous Innovation to Create Radically Successful Businesses* (New York: Crown Business, 2011), 77.
26. Rodriguez, personal project records.
27. Rodriguez, personal project records.
28. Barke, James, and Polikarpova, "Grounded Copilot."
29. Rodriguez, personal project records, `docs/PLATFORM-GUIDE.md`.
30. Rodriguez, personal project records.
31. Rodriguez, personal project records.
32. Rodriguez, personal project records, `docs/DISASTER-RECOVERY.md`.
33. eBay, "Browse API — eBay Developers Program," accessed March 2026, https://developer.ebay.com/api-docs/buy/browse/overview.html.
34. Render, "Render Documentation — PostgreSQL," accessed March 2026, https://docs.render.com/databases.
35. Rodriguez, personal project records.

---

## Exhibits

### Exhibit 1: Automated Pipeline Schedule (January 2026)

| Pipeline | Schedule (UTC) | Data Source | DevOps Principle |
|----------|---------------|-------------|-----------------|
| eBay Browse API | Every 5 days | eBay | Automation |
| eBay Graded | Every 5 days | eBay | Automation |
| eBay Sold Scraper | Every 5 days | eBay | Automation |
| eBay Graded Sold | Every 5 days | eBay | Automation |
| SCP Prices | Daily | SportsCardsPro | Automation |
| SCP History | Weekly (Sun) | SportsCardsPro | Version control |
| Gemrate PSA | Every 4 hours | Gemrate.com | Orchestration |
| Gemrate Beckett | Every 4 hours (offset 2h) | Gemrate.com | Orchestration |
| Market Data Snapshot | Every 5 days | Internal | Data quality |
| Card Tracker | Daily | Internal | Automation |
| Athlete History | Daily | Internal | Observability |
| Bi-Weekly Analysis | 1st & 15th | Gemini AI | AI collaboration |
| Backup to Render | Weekly (Sun) | Internal | Resilience |
| Sync Gemrate Flags | Weekly (Sun) | Internal | Automation |
| EPN Data | Daily | eBay Partner Network | Observability |

*Source: Created by the author using pipeline configuration data from the VZLA Sports Elite GitHub repository.*

---

### Exhibit 2: Three-Layer Data Availability Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    USER REQUEST                          │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│  LAYER 1: GitHub Raw URLs (Primary)                     │
│  • Latest committed data, no redeploy needed            │
│  • Availability: ~99.9% (GitHub SLA)                    │
└──────────────────────┬──────────────────────────────────┘
                       │ fetch fails?
                       ▼
┌─────────────────────────────────────────────────────────┐
│  LAYER 2: Local Build Copies (Fallback)                 │
│  • Bundled at build time, potentially stale             │
│  • Availability: 100% (served with application)         │
└──────────────────────┬──────────────────────────────────┘
                       │ build corrupted?
                       ▼
┌─────────────────────────────────────────────────────────┐
│  LAYER 3: PostgreSQL Backup (Disaster Recovery)         │
│  • Weekly JSONB snapshots of all data files              │
│  • Idempotent upserts with conflict resolution          │
│  • Recovery: single SQL query per file                  │
└─────────────────────────────────────────────────────────┘
```

*Source: Created by the author based on the VZLA Sports Elite data architecture.*

---

### Exhibit 3: Price Fallback Chain

| Priority | Field | Method | Robustness |
|----------|-------|--------|------------|
| 1 | `taguchiListing` | Taguchi winsorized mean (40% trim) | Highest — resistant to outliers |
| 2 | `avgListing` | Arithmetic mean of active listings | Moderate — affected by outliers |
| 3 | `trimmedListing` | Trimmed mean (20% trim) | Moderate-high |
| 4 | `avg` | Legacy average field | Low — simple average |
| 5 | `average` | Fallback average | Lowest — last resort |

*Source: Created by the author using pricing algorithm documentation from the VZLA Sports Elite codebase.*

---

### Exhibit 4: Iterative Development Layers

| Layer | Capability Added | DevOps Principle Applied |
|-------|-----------------|------------------------|
| 1 | Static athlete roster with manual data | Version control as source of truth |
| 2 | eBay Browse API integration | Automation over manual intervention |
| 3 | Scheduled pipeline execution | Automation over manual intervention |
| 4 | Sold-listing price scraping | Resilience through redundancy |
| 5 | Taguchi statistical pricing | Observability through data quality |
| 6 | Grading population tracking | Automation; pipeline orchestration |
| 7 | PostgreSQL backup layer | Resilience; disaster recovery |
| 8 | AI-generated market analysis | AI collaboration as DevOps pattern |
| 9 | Time-series history and sparklines | Observability; progress tracking |
| 10 | Budget optimizer and investment signals | Iterative development |

*Source: Created by the author using development history from the VZLA Sports Elite Git log.*

---

### Exhibit 5: Human-AI Responsibility Matrix

| Activity | Human (Rodriguez) | AI (Lovable) |
|----------|-------------------|--------------|
| Define what to build | ✓ | |
| Propose architecture | Selects approach | Proposes options |
| Provide domain expertise | ✓ | |
| Write code | | ✓ |
| Configure pipelines | | ✓ |
| Debug issues | Identifies symptoms | Diagnoses and fixes |
| Author documentation | Reviews and directs | Writes content |
| Test in production | ✓ | |
| Maintain session continuity | ✓ (via documentation) | No memory |
| Apply statistical methods | Selects methodology | Implements formulas |
| Sequence work across sessions | ✓ | |

*Source: Created by the author based on development session records.*
