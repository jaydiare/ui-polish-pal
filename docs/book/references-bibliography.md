# The AI DevOps Playbook — References, Bibliography & Citations

> **Last updated:** March 2026  
> A comprehensive reference guide supporting every claim, methodology, and technical pattern in the book.

---

## How to Use This Reference

Citations in the manuscript use short keys like **[Phoenix]** or **[Taguchi-1986]**. This document provides the full bibliographic entry, URL (where available), and the plays that reference each source.

---

## 1. Foundational DevOps & Software Engineering Books

### [Phoenix]
Kim, G., Behr, K., & Spafford, G. (2013). *The Phoenix Project: A Novel About IT, DevOps, and Helping Your Business Win*. IT Revolution Press.  
ISBN: 978-0988262591  
**Relevance:** The foundational DevOps narrative — introduces the Three Ways (flow, feedback, continuous learning). Plays 1, 7, 15.

### [Unicorn]
Kim, G. (2019). *The Unicorn Project: A Novel about Developers, Digital Disruption, and Thriving in the Age of Data*. IT Revolution Press.  
ISBN: 978-1942788768  
**Relevance:** The Five Ideals — locality and simplicity, focus/flow/joy, improvement of daily work, psychological safety, customer focus. Play 1.

### [DevOps-Handbook]
Kim, G., Humble, J., Debois, P., & Willis, J. (2016). *The DevOps Handbook: How to Create World-Class Agility, Reliability, & Security in Technology Organizations*. IT Revolution Press.  
ISBN: 978-1942788003  
**Relevance:** Comprehensive guide to DevOps practices — deployment pipelines, telemetry, feedback loops. Plays 4, 5, 6, 7, 11, 12.

### [Accelerate]
Forsgren, N., Humble, J., & Kim, G. (2018). *Accelerate: The Science of Lean Software and DevOps*. IT Revolution Press.  
ISBN: 978-1942788331  
**Relevance:** DORA metrics (deployment frequency, lead time, MTTR, change failure rate), statistical validation of DevOps practices. Plays 5, 7, 12.

### [Continuous-Delivery]
Humble, J. & Farley, D. (2010). *Continuous Delivery: Reliable Software Releases through Build, Test, and Deployment Automation*. Addison-Wesley.  
ISBN: 978-0321601919  
**Relevance:** Deployment pipeline design, configuration as code, infrastructure automation. Plays 4, 6, 8.

### [SRE-Book]
Beyer, B., Jones, C., Petoff, J., & Murphy, N.R. (2016). *Site Reliability Engineering: How Google Runs Production Systems*. O'Reilly Media.  
ISBN: 978-1491929124  
Available free: https://sre.google/sre-book/table-of-contents/  
**Relevance:** Error budgets, service level objectives, toil reduction, incident management. Plays 6, 11, 13.

### [SRE-Workbook]
Beyer, B., Murphy, N.R., Rensin, D.K., Kawahara, K., & Thorne, S. (2018). *The Site Reliability Workbook: Practical Ways to Implement SRE*. O'Reilly Media.  
ISBN: 978-1492029502  
Available free: https://sre.google/workbook/table-of-contents/  
**Relevance:** Practical SRE implementation patterns, on-call management, disaster recovery exercises. Play 13.

### [Release-It]
Nygard, M.L. (2018). *Release It! Design and Deploy Production-Ready Software* (2nd ed.). Pragmatic Bookshelf.  
ISBN: 978-1680502398  
**Relevance:** Stability patterns (circuit breakers, bulkheads, timeouts), resilience in production systems. Plays 6, 10.

### [Infrastructure-Code]
Morris, K. (2020). *Infrastructure as Code: Dynamic Systems for the Cloud Age* (2nd ed.). O'Reilly Media.  
ISBN: 978-1098114671  
**Relevance:** Infrastructure automation, declarative vs. imperative approaches, GitOps principles. Play 8.

### [Clean-Code]
Martin, R.C. (2008). *Clean Code: A Handbook of Agile Software Craftsmanship*. Prentice Hall.  
ISBN: 978-0132350884  
**Relevance:** Code quality principles, meaningful naming, function design. Play 15.

### [Pragmatic]
Hunt, A. & Thomas, D. (2019). *The Pragmatic Programmer: Your Journey to Mastery* (20th Anniversary ed.). Addison-Wesley.  
ISBN: 978-0135957059  
**Relevance:** DRY principle, orthogonality, tracer bullets, pragmatic automation. Plays 3, 15.

---

## 2. Statistical Methods & Quality Engineering

### [Taguchi-1986]
Taguchi, G. (1986). *Introduction to Quality Engineering: Designing Quality into Products and Processes*. Asian Productivity Organization.  
ISBN: 978-9283310846  
**Relevance:** Taguchi method for robust design, signal-to-noise ratio, loss function. Core methodology for pricing calculations (Plays 9, 11, Appendix B).

### [Taguchi-Robust]
Taguchi, G., Chowdhury, S., & Wu, Y. (2004). *Taguchi's Quality Engineering Handbook*. Wiley.  
ISBN: 978-0471413349  
**Relevance:** Comprehensive reference for S/N ratios, parameter design, and robust optimization. Appendix B.

### [Robust-Statistics]
Huber, P.J. & Ronchetti, E.M. (2009). *Robust Statistics* (2nd ed.). Wiley.  
ISBN: 978-0470129906  
**Relevance:** Theoretical foundation for trimmed means, Winsorized estimators, and outlier-resistant methods used in the Taguchi averaging pipeline. Play 9.

### [Wilcox-Robust]
Wilcox, R.R. (2012). *Introduction to Robust Estimation and Hypothesis Testing* (3rd ed.). Academic Press.  
ISBN: 978-0123869838  
**Relevance:** Winsorized trimmed mean methodology, practical robust statistical methods. Appendix B.

### [CV-Reference]
Abdi, H. (2010). "Coefficient of Variation." In N.J. Salkind (Ed.), *Encyclopedia of Research Design*. Sage Publications.  
DOI: 10.4135/9781412961288.n56  
**Relevance:** Formal definition and interpretation of CV as a normalized dispersion measure. Plays 9, 11.

### [Knapsack]
Martello, S. & Toth, P. (1990). *Knapsack Problems: Algorithms and Computer Implementations*. Wiley.  
ISBN: 978-0471924203  
**Relevance:** 0/1 knapsack algorithm theory and implementation — basis for the budget optimizer. Play 9, Appendix B.

### [CLRS]
Cormen, T.H., Leiserson, C.E., Rivest, R.L., & Stein, C. (2022). *Introduction to Algorithms* (4th ed.). MIT Press.  
ISBN: 978-0262046305  
**Relevance:** Dynamic programming (knapsack), algorithmic analysis. Appendix B.

---

## 3. CI/CD & GitHub Actions

### [GHA-Docs]
GitHub. (2026). *GitHub Actions Documentation*.  
https://docs.github.com/en/actions  
**Relevance:** Primary reference for workflow syntax, cron scheduling, concurrency groups, secrets management. Plays 4, 5, 6, 7.

### [GHA-Cron]
GitHub. (2026). *Events that trigger workflows — Scheduled events*.  
https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#schedule  
**Relevance:** POSIX cron syntax for GitHub Actions, UTC-only scheduling, minimum 5-minute interval. Play 5.

### [GHA-Concurrency]
GitHub. (2026). *Using concurrency*.  
https://docs.github.com/en/actions/using-jobs/using-concurrency  
**Relevance:** `concurrency` groups, `cancel-in-progress`, preventing duplicate workflow runs. Play 6.

### [GHA-Permissions]
GitHub. (2026). *Automatic token authentication — Permissions for the GITHUB_TOKEN*.  
https://docs.github.com/en/actions/security-guides/automatic-token-authentication  
**Relevance:** Principle of least privilege for `GITHUB_TOKEN`, `permissions: contents: write`. Play 4.

### [GHA-Limits]
GitHub. (2026). *Usage limits, billing, and administration*.  
https://docs.github.com/en/actions/learn-github-actions/usage-limits-billing-and-administration  
**Relevance:** Free tier limits (2,000 min/month), job timeout (6 hours), concurrent job limits. Play 5.

---

## 4. API & Web Scraping References

### [eBay-Browse-API]
eBay. (2026). *Browse API — eBay Developers Program*.  
https://developer.ebay.com/api-docs/buy/browse/overview.html  
**Relevance:** `search` endpoint, aspect filters, `categoryId` prefix requirement, condition filtering. Plays 4, 10, 11.

### [eBay-Sell-API]
eBay. (2026). *Sell APIs — Inventory, Negotiation, Fulfillment*.  
https://developer.ebay.com/api-docs/sell/overview.html  
**Relevance:** Best Offer automation (`sell.negotiation`), inventory management. Play 10.

### [eBay-OAuth]
eBay. (2026). *OAuth 2.0 — Getting User Tokens*.  
https://developer.ebay.com/api-docs/static/oauth-authorization-code-grant.html  
**Relevance:** Authorization code grant flow, refresh token architecture. Play 10, §7.3.

### [Cheerio]
cheeriojs. (2026). *cheerio — Fast, flexible & lean implementation of core jQuery designed specifically for the server*.  
https://github.com/cheeriojs/cheerio  
**Relevance:** HTML parsing library used for eBay sold listing scraping. Play 10.

### [Wikipedia-API]
Wikimedia Foundation. (2026). *MediaWiki API:Main page*.  
https://www.mediawiki.org/wiki/API:Main_page  
**Relevance:** Athlete image fetching, page thumbnail endpoint. Play 10.

### [SportsCardsPro-API]
SportsCardsPro. (2026). *SportsCardsPro Product Search API*.  
https://www.sportscardspro.com/  
**Relevance:** Card pricing data source, `/api/products` endpoint. Play 10.

### [Gemrate]
Gemrate. (2026). *Gemrate — PSA Population Reports*.  
https://gemrate.com/  
**Relevance:** PSA grading population data, scraping methodology. Play 10.

---

## 5. Data Architecture & Databases

### [Git-as-DB]
Chacon, S. & Straub, B. (2014). *Pro Git* (2nd ed.). Apress.  
ISBN: 978-1484200773  
Available free: https://git-scm.com/book/en/v2  
**Relevance:** Git internals, content-addressable storage, commit atomicity — theoretical foundation for "Git as Database" pattern. Play 2.

### [PostgreSQL-Docs]
PostgreSQL Global Development Group. (2026). *PostgreSQL Documentation*.  
https://www.postgresql.org/docs/  
**Relevance:** JSONB storage, `ON CONFLICT ... DO UPDATE` (upsert), query patterns. Plays 9, 13.

### [JSON-Schema]
Internet Engineering Task Force. (2024). *JSON Schema: A Media Type for Describing JSON Documents*. RFC Draft.  
https://json-schema.org/  
**Relevance:** Data validation patterns for the 15+ JSON data files. Play 9.

### [Render-Docs]
Render. (2026). *Render Documentation — PostgreSQL*.  
https://docs.render.com/databases  
**Relevance:** Managed PostgreSQL hosting, free tier specifications (1GB). Play 13.

---

## 6. Frontend & UX Standards

### [React-Docs]
Meta. (2026). *React Documentation*.  
https://react.dev/  
**Relevance:** Component architecture, hooks, state management. Play 15.

### [Vite-Docs]
Evan You et al. (2026). *Vite — Next Generation Frontend Tooling*.  
https://vitejs.dev/  
**Relevance:** Build tooling, dev server, production bundling. Play 8.

### [Tailwind-Docs]
Tailwind Labs. (2026). *Tailwind CSS Documentation*.  
https://tailwindcss.com/docs  
**Relevance:** Utility-first CSS framework, design system tokens. Play 15.

### [Recharts]
Recharts. (2026). *Recharts — A composable charting library built on React components*.  
https://recharts.org/  
**Relevance:** Chart components used in Market Intel dashboard. Play 15.

### [ISO-9241]
International Organization for Standardization. (2018). *ISO 9241-110:2020 — Ergonomics of human-system interaction — Part 110: Interaction principles*.  
https://www.iso.org/standard/75258.html  
**Relevance:** UX design principles (suitability, self-descriptiveness, controllability, error tolerance, learnability) applied throughout the platform's UI. About page, Play 15.

### [ISO-9241-11]
International Organization for Standardization. (2018). *ISO 9241-11:2018 — Ergonomics of human-system interaction — Part 11: Usability: Definitions and concepts*.  
https://www.iso.org/standard/63500.html  
**Relevance:** Formal definition of usability (effectiveness, efficiency, satisfaction) guiding the platform's filter system and card layout design.

### [WCAG]
World Wide Web Consortium. (2023). *Web Content Accessibility Guidelines (WCAG) 2.2*.  
https://www.w3.org/TR/WCAG22/  
**Relevance:** Accessibility standards for color contrast, keyboard navigation, semantic HTML. Play 15.

---

## 7. AI & Machine Learning

### [Gemini-API]
Google. (2026). *Gemini API Documentation*.  
https://ai.google.dev/docs  
**Relevance:** AI narrative generation for bi-weekly market analysis, free-tier rate limits, JSON recovery patterns. Play 14.

### [Prompt-Engineering]
OpenAI. (2026). *Prompt Engineering Guide*.  
https://platform.openai.com/docs/guides/prompt-engineering  
**Relevance:** Structured prompting techniques used for Gemini market analysis generation. Play 14.

### [AI-Pair-Programming]
Barke, S., James, M.B., & Polikarpova, N. (2023). "Grounded Copilot: How Programmers Interact with Code-Generating Models." *Proceedings of the ACM on Programming Languages (OOPSLA)*, Vol. 7.  
DOI: 10.1145/3586030  
**Relevance:** Research on human-AI collaboration patterns in software development — the "acceleration" vs. "exploration" modes. Play 1.

### [Lovable-Docs]
Lovable. (2026). *Lovable Documentation — AI-Powered Web Application Development*.  
https://docs.lovable.dev/  
**Relevance:** AI-assisted development platform used to build the entire frontend. Plays 1, 14, 15.

---

## 8. Security & Operations

### [OWASP-Top10]
OWASP Foundation. (2021). *OWASP Top 10:2021*.  
https://owasp.org/Top10/  
**Relevance:** Web application security risks — relevant to OAuth implementation and API key management. Play 10.

### [12-Factor]
Wiggins, A. (2017). *The Twelve-Factor App*.  
https://12factor.net/  
**Relevance:** Config in environment variables (Factor III), stateless processes (Factor VI), disposability (Factor IX). Plays 8, 10.

### [GitOps]
Limoncelli, T.A. (2018). "GitOps: A Path to More Self-Service IT." *Communications of the ACM*, 61(9), 38–42.  
DOI: 10.1145/3233241  
**Relevance:** Git as single source of truth for declarative infrastructure, the operational model underpinning the platform. Play 2.

### [OAuth-RFC]
Internet Engineering Task Force. (2012). *RFC 6749: The OAuth 2.0 Authorization Framework*.  
https://datatracker.ietf.org/doc/html/rfc6749  
**Relevance:** OAuth 2.0 authorization code grant flow used for eBay API authentication. Play 10.

---

## 9. Sports Card Industry References

### [PSA-Pop]
Professional Sports Authenticator. (2026). *PSA Population Report*.  
https://www.psacard.com/pop  
**Relevance:** Primary source for grading population data; Gemrate.com aggregates this data. Plays 10, 11.

### [Beckett-Grading]
Beckett Grading Services. (2026). *Beckett Grading — Card Authentication & Grading*.  
https://www.beckett.com/grading  
**Relevance:** Alternative grading service tracked via `gemrate_beckett.json`. Play 10.

### [Card-Market-Trends]
Sports Collectors Daily. (Various). *Market Reports and Analysis*.  
https://sportscollectorsdaily.com/  
**Relevance:** Industry context for sports card market trends, Venezuelan athlete demand. Play 1.

---

## 10. Methodology & Process

### [Lean-Startup]
Ries, E. (2011). *The Lean Startup: How Today's Entrepreneurs Use Continuous Innovation to Create Radically Successful Businesses*. Crown Business.  
ISBN: 978-0307887894  
**Relevance:** Build-measure-learn loop, minimum viable product — parallels to the platform's iterative development. Play 15.

### [Kaizen]
Imai, M. (1986). *Kaizen: The Key to Japan's Competitive Success*. McGraw-Hill.  
ISBN: 978-0075543329  
**Relevance:** Continuous improvement philosophy — the "each iteration adds one capability" pattern. Play 15.

### [Docs-Driven]
Procida, D. (2017). *Diátaxis: A Systematic Approach to Technical Documentation*.  
https://diataxis.fr/  
**Relevance:** Documentation framework (tutorials, how-to guides, reference, explanation) — informs the multi-document approach (PLATFORM-GUIDE, AUDIT, DISASTER-RECOVERY). Play 3.

---

## 11. Further Reading & Related Works

### Industry Reports

- **Grand View Research.** (2023). *Sports Trading Card Market Size, Share & Trends Analysis Report*. https://www.grandviewresearch.com/industry-analysis/sports-trading-card-market
- **Verified Market Research.** (2024). *Global Sports Card Market Assessment*. https://www.verifiedmarketresearch.com/

### DevOps Community Resources

- **DORA.** (2023). *State of DevOps Report*. https://dora.dev/research/
- **DevOps Institute.** (2023). *Upskilling IT Report*. https://www.devopsinstitute.com/
- **Martin Fowler.** *Continuous Integration*. https://martinfowler.com/articles/continuousIntegration.html
- **Martin Fowler.** *Microservices Resource Guide*. https://martinfowler.com/microservices/
- **ThoughtWorks.** *Technology Radar*. https://www.thoughtworks.com/radar

### AI-Assisted Development Research

- **GitHub.** (2024). *The Impact of AI on Developer Productivity: Evidence from GitHub Copilot*. https://github.blog/news-insights/research/
- **Stack Overflow.** (2024). *Developer Survey — AI Tools Section*. https://survey.stackoverflow.co/
- **Vaithilingam, P., Zhang, T., & Glassman, E.L.** (2022). "Expectation vs. Experience: Evaluating the Usability of Code Generation Tools." *CHI '22*. DOI: 10.1145/3491101.3519665

### Statistical Methods for Practitioners

- **NIST/SEMATECH.** *e-Handbook of Statistical Methods — Robust Statistics*. https://www.itl.nist.gov/div898/handbook/
- **Phadke, M.S.** (1989). *Quality Engineering Using Robust Design*. Prentice Hall. ISBN: 978-0137451678

---

## 12. Citation Index by Play

Quick lookup — which plays cite which sources:

| Play | Key References |
|------|---------------|
| **Play 1** | [Phoenix], [Unicorn], [AI-Pair-Programming], [Lovable-Docs] |
| **Play 2** | [Git-as-DB], [GitOps], [12-Factor] |
| **Play 3** | [Docs-Driven], [Pragmatic], [DevOps-Handbook] |
| **Play 4** | [GHA-Docs], [GHA-Permissions], [Continuous-Delivery] |
| **Play 5** | [GHA-Cron], [GHA-Limits], [Accelerate], [DevOps-Handbook] |
| **Play 6** | [Release-It], [SRE-Book], [GHA-Concurrency], [Continuous-Delivery] |
| **Play 7** | [Phoenix], [DevOps-Handbook], [Accelerate] |
| **Play 8** | [12-Factor], [Infrastructure-Code], [Continuous-Delivery] |
| **Play 9** | [Taguchi-1986], [Robust-Statistics], [Knapsack], [PostgreSQL-Docs], [CV-Reference] |
| **Play 10** | [eBay-Browse-API], [eBay-OAuth], [OAuth-RFC], [Release-It], [OWASP-Top10] |
| **Play 11** | [Taguchi-1986], [CV-Reference], [SRE-Book], [DevOps-Handbook] |
| **Play 12** | [Accelerate], [DevOps-Handbook] |
| **Play 13** | [SRE-Book], [SRE-Workbook], [Render-Docs] |
| **Play 14** | [Gemini-API], [AI-Pair-Programming], [Lovable-Docs], [Prompt-Engineering] |
| **Play 15** | [Lean-Startup], [Kaizen], [Clean-Code], [Pragmatic], [ISO-9241] |
| **Play 16** | [Phoenix], [Accelerate], [AI-Pair-Programming] |

---

## 13. Recommended Citation Format

When citing this book:

> Lastname, F. (2026). *The AI DevOps Playbook: From Zero to 15 Pipelines — How One Sports Card Platform Became a Masterclass in Automated Infrastructure*. [Publisher].

When citing the platform:

> VZLA Sports Elite. (2026). Sports card market intelligence platform. https://quick-shine-ui.lovable.app

When citing the source code:

> VZLA Sports Elite Repository. (2026). GitHub. https://github.com/[username]/[repo]

---

*This reference document is maintained alongside the manuscript. As new plays are written or revised, citations are added here and cross-referenced in the Citation Index (§12).*
