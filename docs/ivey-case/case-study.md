# VZLA Sports Elite: Building DevOps Infrastructure with AI

---

**Case Type:** General Experience  
**Decision-Point Date:** January 2026  
**Location:** Toronto, Ontario, Canada  
**Recommended Length:** Approximately 8 pages (body), plus exhibits  

---

## Introduction

In January 2026, Juan Rodriguez, a Professional Engineer and Technical Program Manager at TELUS Health in Toronto, sat at his home office desk staring at a growing list of automated pipelines. What had started a few months earlier as a personal side project — a simple website to track the market value of Venezuelan sports cards — had evolved into a full-scale data platform with fifteen automated workflows, six external data integrations, statistical pricing algorithms, and a React-based frontend serving hundreds of athlete profiles.¹

Rodriguez had built the entire platform without a development team. His engineering partner was an artificial intelligence — a conversational AI coding tool called Lovable that could write code, configure deployment pipelines, debug errors, and author documentation through natural-language conversation.² The platform, named VZLA Sports Elite, now tracked over 550 Venezuelan athletes across baseball, soccer, basketball, and other sports, pulling daily data from eBay's Browse API, scraping sold-listing prices, collecting grading population counts from PSA and Beckett, and computing robust statistical pricing using methods adapted from industrial quality engineering.³

Rodriguez faced a decision. The platform worked — pipelines ran on schedule, data flowed through fallback chains, and the statistical engine produced reliable pricing signals. But he had built everything iteratively, one feature at a time, in conversation with an AI that had no memory between sessions. Every architectural choice lived in documentation files and Git commit history rather than in any engineer's head. The codebase had grown to over fifteen thousand lines across fifty-plus files, with no formal testing framework, no staging environment, and no human besides Rodriguez who understood the system.⁴

The question was not whether to continue building. The question was whether the DevOps principles that had guided the platform's construction — automation, version control, resilience, observability, continuous improvement — were sufficient to sustain a system built entirely through human-AI collaboration. Could one person and an AI operate production infrastructure reliably? Or did the absence of a traditional engineering team create risks that no amount of automation could mitigate?

---

## Background

### The Sports Card Market

The global sports trading card market had experienced significant growth through the early 2020s, driven by increased collector interest, online marketplaces, and the emergence of grading services that authenticated and scored card condition.⁵ Venezuelan athletes occupied a distinctive niche within this market. Players like Ronald Acuña Jr. (MLB), José Altuve (MLB), and Yeferson Soteldo (soccer) attracted both domestic Venezuelan collectors and international investors, but pricing data for these athletes was scattered across multiple platforms with no centralized source.⁶

Rodriguez, a Venezuelan-born collector himself, recognized the gap. Collectors had to manually search eBay, cross-reference grading populations on PSA's website, and check historical prices on SportsCardsPro — a time-consuming process that yielded inconsistent results. A centralized platform that aggregated these sources and applied statistical methods to produce reliable pricing signals would serve both casual collectors and serious investors.

### Rodriguez's Professional Background

Rodriguez brought an unusual combination of credentials to the project. He held a Professional Engineer (P.Eng.) designation, a Master's degree with a concentration in Product Innovation, and a UX Design Certificate from George Brown College in Toronto.⁷ He had spent over eighteen years in the telecommunications industry and served as a lecturer at York University, where he taught engineering and technology courses. His professional role at TELUS Health involved managing cross-functional technical programs at the intersection of healthcare technology and enterprise infrastructure.

This background shaped his approach. Rather than treating the sports card platform as a casual hobby project, Rodriguez applied the same engineering rigour he used in his professional work: version-controlled infrastructure, automated testing of data quality, documented architectural decisions, and systematic resilience patterns.

### The AI Development Model

Rodriguez chose Lovable, an AI-powered web application development platform, as his primary development tool.⁸ Unlike traditional code editors, Lovable operated through natural-language conversation — Rodriguez described what he wanted to build, and the AI generated the code, configured the deployment, and iterated on the design in real time. The platform produced React applications with Vite build tooling, Tailwind CSS styling, and TypeScript throughout.

The AI's capabilities were substantial. It could write JavaScript and Python scripts, configure GitHub Actions workflows, design database schemas, apply statistical formulas, debug API integration issues, and author technical documentation. However, it had one critical limitation: it retained no memory between conversation sessions.⁹ Every time Rodriguez started a new session, the AI began with no context about the project's history, architecture, or previous decisions.

This limitation became the foundational constraint that shaped every architectural choice in the platform. If the AI could not remember, then every decision had to be written down. If every decision was written down, then the documentation became the system's institutional memory. And if documentation was institutional memory, then documentation was not a nice-to-have — it was infrastructure.

---

## The Platform Architecture

### Data Pipeline Design

By January 2026, VZLA Sports Elite operated fifteen automated pipelines on GitHub Actions, each executing on a defined schedule (see Exhibit 1).¹⁰ The pipelines fell into five functional categories:

1. **Market Data Collection** — Daily fetches from eBay's Browse API for active listings, scraping of sold listings for completed sale prices, and queries to SportsCardsPro for third-party pricing.
2. **Grading Population Tracking** — Scraping of Gemrate.com for PSA population data and Beckett grading statistics, with cooldown management to respect rate limits.
3. **Statistical Processing** — Computation of Taguchi winsorized means, coefficient of variation stability scores, signal-to-noise ratios, and momentum indicators.
4. **Data Aggregation** — Consolidation of multiple sources into unified athlete profiles with fallback chains for missing data.
5. **Backup and Recovery** — Weekly snapshots of all data files to a managed PostgreSQL database on Render.

Each pipeline was configured as a standalone GitHub Actions workflow with explicit scheduling, concurrency controls, and error-handling patterns. Rodriguez had adopted a "stateless architecture" principle: no pipeline assumed that any previous pipeline had run successfully.¹¹ Each workflow fetched its own dependencies, validated its own inputs, and committed its own outputs to the Git repository.

### The Git-as-Database Pattern

One of the platform's most distinctive architectural decisions was using Git as the primary data store.¹² Rather than deploying a traditional database for the main data layer, all market data was stored as JSON files committed directly to the GitHub repository. Pipeline outputs were committed to the `data/` directory, and the frontend fetched data from GitHub's raw content URLs.

This approach offered several advantages: automatic versioning of every data change, full audit history through Git log, zero database hosting costs for the primary data layer, and atomic updates through Git's commit model. It also created a natural alignment with DevOps principles — every data change was a code change, subject to the same version control discipline.

The disadvantage was performance. Git was not designed as a database, and large JSON files created repository bloat over time. Rodriguez mitigated this by keeping individual files focused (one concern per file) and using the PostgreSQL backup as the true archival layer.

### Statistical Pricing Engine

The platform's pricing engine applied methods from industrial quality engineering — specifically, Genichi Taguchi's robust design methodology — to the problem of noisy eBay market data.¹³ Raw eBay prices were inherently noisy: a single outlier listing (a mispriced card, a lot sale, a damaged item listed without disclosure) could dramatically skew a simple average.

The Taguchi winsorized mean addressed this by trimming the outer 40% of price observations and replacing them with boundary values before computing the mean.¹⁴ This produced a pricing signal that was resistant to outliers while still reflecting genuine market movement. The platform also computed a coefficient of variation (CV) for each athlete's pricing data, expressed as a "stability score" — a CV below 15% indicated stable, reliable pricing, while a CV above 40% signalled high volatility and risk.¹⁵

### Frontend Design

The frontend was a single-page React application displaying athlete cards with pricing data, investment signals, and interactive sparkline charts showing 90-day price trends.¹⁶ Rodriguez applied user-centred design principles from his George Brown College training: clear visual hierarchy, colour-coded investment signals (green for buy, yellow for hold, red for caution), and responsive layouts optimized for both desktop and mobile viewing.

---

## The DevOps Principles in Practice

Rodriguez identified six core DevOps principles that had emerged organically through the platform's development:

### Principle 1: Version Control as Source of Truth

Every artifact in the system — code, data, documentation, workflow configurations — lived in a single Git repository.¹⁷ There were no external wikis, no shared drives, no Slack messages containing critical decisions. If it was not in the repository, it did not exist.

### Principle 2: Automation Over Manual Intervention

No data collection, processing, or deployment step required manual execution. Every pipeline ran on a cron schedule, and the only manual interventions were debugging sessions triggered by failure notifications.¹⁸

### Principle 3: Resilience Through Redundancy

The three-layer data availability model (GitHub raw URLs → local build copies → PostgreSQL backup) ensured that no single point of failure could take the platform offline.¹⁹ Within individual data fields, the price fallback chain (`taguchiListing → avgListing → trimmedListing → avg → average`) provided graceful degradation.

### Principle 4: Documentation as Infrastructure

Because the AI partner had no persistent memory, documentation was not optional — it was the mechanism by which architectural decisions survived between development sessions.²⁰ Four comprehensive documents (Platform Guide, Data Pipeline Audit, Disaster Recovery Plan, and Headshot Fixes) served as the system's institutional knowledge base.

### Principle 5: Observability Through Data Quality Monitoring

Rather than traditional application performance monitoring, the platform monitored data quality: Were prices within expected ranges? Were population counts increasing monotonically? Were pipeline commit timestamps on schedule?²¹ Data anomalies served as the primary alert mechanism.

### Principle 6: Continuous Improvement Through Iteration

The platform was built in ten incremental capability layers, each adding one functional area before moving to the next.²² Rodriguez never attempted to design the full system upfront. Each iteration was a complete, working system — the next iteration simply made it better.

---

## The Decision

By January 2026, Rodriguez had proven that one person and an AI could build and operate a production data platform using DevOps principles. But several challenges remained unresolved:

**Scalability.** The platform tracked 553 athletes, but eBay's Browse API had rate limits. Adding more athletes or increasing data collection frequency would require architectural changes — batching strategies, queue management, or API tier upgrades — that Rodriguez had not yet designed.²³

**Testing.** The platform had no automated test suite. Data quality was monitored through pipeline outputs, but there were no unit tests, integration tests, or end-to-end tests. Rodriguez relied on manual verification and the robustness of the statistical methods to catch errors.

**Bus Factor.** Despite extensive documentation, Rodriguez was the only person who understood the system holistically. The AI partner could reconstruct understanding from documentation, but only if the documentation was comprehensive and current. Any gap in documentation was a gap in the system's recoverability.

**Sustainability.** The platform ran on GitHub Actions' free tier (2,000 minutes per month) and Render's free PostgreSQL tier (1 GB).²⁴ Growth in data volume or pipeline complexity could push the platform past these limits, requiring paid infrastructure.

Rodriguez considered three paths forward:

1. **Maintain the status quo** — continue operating the platform as a personal project with incremental improvements, accepting the risks of no testing and single-operator dependency.
2. **Formalize the infrastructure** — invest in automated testing, staging environments, and operational runbooks to bring the platform to professional-grade reliability, potentially open-sourcing the codebase.
3. **Scale the model** — use the platform as a case study to demonstrate that human-AI DevOps collaboration could be applied to larger, more complex systems, potentially developing consulting or educational offerings around the methodology.

Each path had different implications for time investment, technical risk, and the original goal of creating a legacy project for his children. Rodriguez needed to decide which direction would best honour both the engineering principles he had applied and the personal motivation that had started the project.

---

## Footnotes

1. Juan D. Rodriguez, personal project records, VZLA Sports Elite repository, GitHub, January 2026.
2. Lovable, "Lovable Documentation — AI-Powered Web Application Development," accessed March 2026, https://docs.lovable.dev/.
3. Professional Sports Authenticator, "PSA Population Report," accessed March 2026, https://www.psacard.com/pop; Beckett Grading Services, "Beckett Grading — Card Authentication & Grading," accessed March 2026, https://www.beckett.com/grading.
4. Rodriguez, personal project records.
5. Grand View Research, "Sports Trading Card Market Size, Share & Trends Analysis Report," 2023, https://www.grandviewresearch.com/industry-analysis/sports-trading-card-market.
6. eBay, "Browse API — eBay Developers Program," accessed March 2026, https://developer.ebay.com/api-docs/buy/browse/overview.html.
7. Juan D. Rodriguez, LinkedIn profile, accessed March 2026.
8. Lovable, "Lovable Documentation."
9. Shraddha Barke, Michael B. James, and Nadia Polikarpova, "Grounded Copilot: How Programmers Interact with Code-Generating Models," *Proceedings of the ACM on Programming Languages (OOPSLA)* 7 (2023), https://doi.org/10.1145/3586030.
10. GitHub, "GitHub Actions Documentation," accessed March 2026, https://docs.github.com/en/actions.
11. Adam Wiggins, "The Twelve-Factor App," 2017, https://12factor.net/.
12. Scott Chacon and Ben Straub, *Pro Git*, 2nd ed. (New York: Apress, 2014), https://git-scm.com/book/en/v2.
13. Genichi Taguchi, *Introduction to Quality Engineering: Designing Quality into Products and Processes* (Tokyo: Asian Productivity Organization, 1986), 22.
14. Donald J. Wheeler, *Understanding Industrial Experimentation*, 2nd ed. (Knoxville, TN: SPC Press, 1990), 88.
15. Hervé Abdi, "Coefficient of Variation," in *Encyclopedia of Research Design*, ed. Neil J. Salkind (Thousand Oaks, CA: Sage Publications, 2010), https://doi.org/10.4135/9781412961288.n56.
16. Meta, "React Documentation," accessed March 2026, https://react.dev/.
17. Thomas A. Limoncelli, "GitOps: A Path to More Self-Service IT," *Communications of the ACM* 61, no. 9 (2018): 38, https://doi.org/10.1145/3233241.
18. GitHub, "Events That Trigger Workflows — Scheduled Events," accessed March 2026, https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#schedule.
19. Michael L. Nygard, *Release It! Design and Deploy Production-Ready Software*, 2nd ed. (Raleigh, NC: Pragmatic Bookshelf, 2018), 75.
20. Daniele Procida, "Diátaxis: A Systematic Approach to Technical Documentation," accessed March 2026, https://diataxis.fr/.
21. Betsy Beyer et al., *Site Reliability Engineering: How Google Runs Production Systems* (Sebastopol, CA: O'Reilly Media, 2016), 63, https://sre.google/sre-book/table-of-contents/.
22. Eric Ries, *The Lean Startup: How Today's Entrepreneurs Use Continuous Innovation to Create Radically Successful Businesses* (New York: Crown Business, 2011), 77.
23. eBay, "Browse API."
24. Render, "Render Documentation — PostgreSQL," accessed March 2026, https://docs.render.com/databases.

---

## Exhibits

### Exhibit 1: VZLA Sports Elite — Automated Pipeline Schedule (January 2026)

| Pipeline | Schedule (UTC) | Data Source | Function |
|----------|---------------|-------------|----------|
| eBay Browse API | Daily 06:00 | eBay | Active listing prices for raw cards |
| eBay Graded | Daily 07:00 | eBay | Active listing prices for graded cards |
| eBay Sold Scraper | Daily 08:00 | eBay | Completed sale prices (raw) |
| eBay Graded Sold | Daily 09:00 | eBay | Completed sale prices (graded) |
| SCP Prices | Daily 10:00 | SportsCardsPro | Third-party pricing reference |
| SCP History | Weekly (Sun) | SportsCardsPro | Historical price trends |
| Gemrate PSA | Daily 11:00 | Gemrate.com | PSA grading population counts |
| Gemrate Beckett | Daily 12:00 | Gemrate.com | Beckett grading population counts |
| Market Data Snapshot | Daily 12:00 | Internal | Unified athlete data consolidation |
| Card Tracker | Daily 13:00 | Internal | Portfolio tracking updates |
| Athlete History | Weekly (Sun) | Internal | Time-series snapshots |
| Bi-Weekly Analysis | Bi-weekly | Gemini AI | AI-generated market narrative |
| Backup to Render | Weekly (Sun) | Internal | PostgreSQL disaster recovery |
| Sync Gemrate Flags | Daily 14:00 | Internal | New athlete detection |
| EPN Data | Daily 15:00 | eBay Partner Network | Affiliate performance tracking |

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
│  • Always reflects latest committed data                │
│  • Zero-latency updates (no redeploy needed)            │
│  • Availability: ~99.9% (GitHub SLA)                    │
└──────────────────────┬──────────────────────────────────┘
                       │ fetch fails?
                       ▼
┌─────────────────────────────────────────────────────────┐
│  LAYER 2: Local Build Copies (Fallback)                 │
│  • Bundled in frontend at build time                    │
│  • Potentially stale (from last deploy)                 │
│  • Availability: 100% (served with app)                 │
└──────────────────────┬──────────────────────────────────┘
                       │ build corrupted?
                       ▼
┌─────────────────────────────────────────────────────────┐
│  LAYER 3: Render PostgreSQL (Disaster Recovery)         │
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

### Exhibit 4: Capability Layers — Iterative Development Timeline

| Layer | Capability Added | Key DevOps Principle |
|-------|-----------------|---------------------|
| 1 | Static athlete roster with manual data | Version control |
| 2 | eBay Browse API integration | Automation |
| 3 | Scheduled pipeline execution | Scheduling strategies |
| 4 | Sold-listing price scraping | API integration patterns |
| 5 | Taguchi statistical pricing | Data quality monitoring |
| 6 | Grading population tracking | Pipeline orchestration |
| 7 | PostgreSQL backup layer | Disaster recovery |
| 8 | AI-generated market analysis | AI as DevOps partner |
| 9 | Time-series history and sparklines | Progress tracking |
| 10 | Budget optimizer and investment signals | Iterative architecture |

*Source: Created by the author using development history from the VZLA Sports Elite Git log.*

---

### Exhibit 5: Human-AI Responsibility Division

| Responsibility | Human (Rodriguez) | AI (Lovable) |
|---------------|-------------------|--------------|
| Define requirements | ✓ | |
| Architectural decisions | ✓ | Proposes options |
| Domain expertise | ✓ | |
| Code implementation | | ✓ |
| Pipeline configuration | | ✓ |
| Debugging | Identifies symptoms | Diagnoses and fixes |
| Documentation | Reviews | Authors |
| Testing in production | ✓ | |
| Session continuity | ✓ (via documentation) | No memory |
| Statistical methods | Selects approach | Implements formulas |

*Source: Created by the author based on development session records.*
