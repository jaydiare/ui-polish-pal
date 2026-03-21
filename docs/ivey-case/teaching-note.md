# Teaching Note

# VZLA Sports Elite: Building DevOps Infrastructure with AI

---

## Case Synopsis

In January 2026, Juan Rodriguez — a Professional Engineer, Technical Program Manager, and lecturer — faced a decision about the future of VZLA Sports Elite, a sports card market intelligence platform he had built entirely through collaboration with an AI coding partner. The platform tracked over 550 Venezuelan athletes using fifteen automated pipelines, six external data sources, and statistical pricing algorithms adapted from industrial quality engineering. Rodriguez had to decide whether to maintain the status quo, formalize the infrastructure to professional-grade standards, or scale the human-AI collaboration model into a broader methodology. The case illustrated how traditional DevOps principles applied — and were transformed — in a development environment where the engineering partner was artificial intelligence.

---

## Learning Objectives

After completing this case, students should be able to:

1. **Evaluate** how core DevOps principles (automation, version control, resilience, observability, continuous improvement) apply to non-traditional development contexts.
2. **Analyze** the trade-offs of using Git as a primary data store versus traditional database architectures.
3. **Assess** the risks and benefits of human-AI collaboration in software engineering, including the "bus factor" implications of single-operator systems.
4. **Apply** robust statistical methods (Taguchi winsorized means, coefficient of variation) to noisy real-world data and understand their relevance to data quality monitoring.
5. **Recommend** a strategic path forward that balances technical sustainability, personal goals, and resource constraints.

---

## Assignment Questions

1. Evaluate Rodriguez's decision to use Git as the primary data store rather than a traditional database. What are the strengths and weaknesses of this approach? Under what conditions would you recommend switching to a database-first architecture?

2. The platform operates with no automated test suite. Rodriguez relies on statistical methods and data quality monitoring to catch errors. Is this a viable long-term strategy? What testing approaches would you recommend, and how would you prioritize them given the single-operator constraint?

3. Rodriguez describes documentation as "infrastructure" because his AI partner has no persistent memory. How does this reframe the traditional DevOps view of documentation? What are the implications for organizations adopting AI-assisted development tools?

4. Assess the three strategic options Rodriguez is considering (maintain status quo, formalize infrastructure, scale the model). Which would you recommend, and why? Consider technical risk, time investment, sustainability, and alignment with Rodriguez's personal goals.

5. The platform uses Taguchi winsorized means to produce robust pricing from noisy eBay data. Why is a simple arithmetic mean insufficient for this use case? What other domains could benefit from applying industrial quality engineering methods to marketplace data?

---

## Analysis

### Question 1: Git as Database

**Most appropriate answer:**

Git-as-database was a pragmatic choice that aligned with the project's constraints: zero infrastructure cost, automatic versioning, full audit history, and natural integration with the CI/CD pipeline. The approach worked because the data was append-heavy (new snapshots added, rarely modified), read patterns were simple (fetch latest file), and the dataset was modest in size (hundreds of athletes, not millions of rows).

However, the approach had clear limitations. Git was not designed for query operations — filtering athletes by sport, sorting by price, or joining across datasets required loading entire JSON files into memory. Repository size grew with every commit, and large binary-like JSON diffs were inefficient. The pattern would not scale to high-frequency updates or complex relational queries.

**Anticipated student responses:**

- Some students may argue that the PostgreSQL backup layer already existed and should have been promoted to the primary data store. This was a reasonable position — the counterargument was that PostgreSQL introduced hosting costs, operational complexity, and a dependency on Render's free tier.
- Others may suggest a hybrid approach: Git for configuration and documentation, PostgreSQL for transactional data. This was in fact the direction the platform was trending toward.

**Teaching tip:** Ask students to calculate the repository size implications of committing 553-athlete JSON files daily for one year. This grounds the discussion in concrete numbers.

---

### Question 2: Testing Strategy

**Most appropriate answer:**

The absence of automated tests was the platform's most significant technical risk. While the statistical methods (Taguchi means, CV scores) provided implicit data quality checks, they did not catch logic errors in pipeline code, API response format changes, or frontend rendering bugs.

A recommended testing approach, prioritized for a single operator:

1. **Data validation tests** (highest priority) — JSON schema validation on every pipeline output before committing to Git. This caught structural errors at the point of creation.
2. **Smoke tests** — Simple API response checks at the start of each pipeline run to detect upstream service changes early.
3. **Snapshot tests** — Compare pipeline outputs against known-good baselines to detect unexpected drift.
4. **End-to-end tests** (lowest priority for a single operator) — Browser-based testing of the frontend, likely deferred until the project scaled.

**Anticipated student responses:**

- Students from traditional software engineering backgrounds may insist on unit tests as the foundation. The counterargument was that in a data pipeline system, the most valuable tests validated data quality, not function-level logic.
- Some students may argue that the AI partner could write tests. This was true, but the human still needed to define what "correct" looked like — the AI could not independently determine whether a price of $0.01 for a Ronald Acuña Jr. card was an error or a legitimate listing.

**Discussion point:** How does testing strategy change when your codebase is generated by AI? If the AI wrote the code, can it also write meaningful tests, or does that create a circular dependency?

---

### Question 3: Documentation as Infrastructure

**Most appropriate answer:**

Rodriguez's framing of documentation as infrastructure was a direct consequence of the AI's stateless nature. In traditional development, institutional knowledge lives in engineers' heads, supplemented by documentation. When the "engineer" forgets everything between sessions, documentation becomes the sole carrier of architectural context, design rationale, and operational procedures.

This had several implications for organizations:

- **Documentation debt becomes technical debt.** An undocumented decision in a human-AI workflow was a decision that could not be reconstructed.
- **Documentation-driven development** emerged naturally — writing the documentation before (or simultaneously with) the implementation ensured that the AI partner always had the context it needed.
- **The quality of AI collaboration was bounded by the quality of documentation.** Poorly documented systems produced poor AI contributions; well-documented systems enabled sophisticated AI assistance.

**Anticipated student responses:**

- Students may point out that newer AI models were developing longer context windows and memory capabilities. This was true, but the principle remained: external documentation was more reliable, searchable, and version-controlled than any AI's internal state.
- Some students may argue that this approach created excessive documentation overhead. The counterargument was that the documentation also served as the project's learning resource — it was both operational infrastructure and educational content.

**Teaching tip:** Ask students to consider their own team's "bus factor." If their most knowledgeable engineer left tomorrow, how much institutional knowledge would leave with them? How much was documented?

---

### Question 4: Strategic Path Forward

**Most appropriate answer:**

Option 2 (formalize the infrastructure) was the most balanced recommendation. It addressed the platform's most critical risks (no testing, single-operator dependency) while preserving Rodriguez's ability to pursue Options 1 or 3 later. Specific recommendations:

- Add data validation tests to every pipeline (2–3 weeks of effort)
- Create an operational runbook for common failure scenarios
- Establish a staging branch for testing pipeline changes before merging to main
- Document the recovery procedures with step-by-step verification

Option 3 (scale the model) was premature without first formalizing Option 2. Presenting the methodology as a case study or educational offering required demonstrating that it worked reliably — which required the testing and operational maturity that Option 2 provided.

Option 1 (status quo) was viable in the short term but accumulated risk over time. Every new pipeline or data source added without testing increased the probability of an undetected failure.

**Anticipated student responses:**

- Students focused on the personal legacy goal may prefer Option 1, arguing that the project's value was in its existence, not its operational maturity.
- Entrepreneurially minded students may jump to Option 3, seeing a market opportunity in the human-AI DevOps methodology. The instructor should push back on whether the methodology was sufficiently proven.
- Some students may propose a fourth option: open-source the platform and attract community contributors. This introduced its own challenges (code review, contributor management, community governance) that the case did not fully explore.

**Discussion prompt:** Rodriguez's original motivation was to create a legacy for his children. How does that personal goal interact with each strategic option? Does formalizing infrastructure serve the legacy goal, or does it transform a personal project into something else entirely?

---

### Question 5: Statistical Methods for Marketplace Data

**Most appropriate answer:**

A simple arithmetic mean was insufficient because eBay listing data was inherently noisy. A single mispriced listing ($1,000 for a card worth $10), a lot sale (multiple cards sold as one listing), or a damaged item listed at a low price could dramatically skew the average. The Taguchi winsorized mean addressed this by reducing the influence of extreme values while preserving the overall distribution shape.

Other domains that could benefit from applying industrial quality engineering methods to marketplace data included:

- **Real estate pricing** — Zillow and similar platforms faced the same outlier problem with listing prices
- **Used car valuation** — Kelley Blue Book–style pricing could benefit from robust estimators
- **Commodity pricing in developing markets** — where data quality was inconsistent and outliers were common
- **Freelance marketplace rate estimation** — platforms like Upwork or Fiverr could apply similar methods to normalize pricing data

**Teaching tip:** Provide students with a sample dataset of 20 eBay prices for a specific athlete card, including 2–3 obvious outliers. Have them compute both the arithmetic mean and the Taguchi winsorized mean, then discuss which better represents the card's market value.

---

## Online Teaching Strategies

1. **Pre-class preparation:** Assign students to visit the VZLA Sports Elite platform (https://quick-shine-ui.lovable.app) and explore the athlete cards, pricing data, and investment signals before class. Ask them to identify one feature they find well-designed and one they would improve.

2. **Breakout rooms:** Divide students into groups of 3–4, each assigned one of the five discussion questions. Groups prepare a 5-minute presentation of their analysis, followed by class-wide discussion.

3. **Live demonstration:** If possible, show a GitHub Actions workflow run in real time (or a recorded run), walking through the pipeline execution, data commit, and frontend update cycle. This makes the automation tangible.

4. **Polling:** Use real-time polling to gauge student preferences on the three strategic options before discussion. Revisit the poll after discussion to see if opinions shifted.

5. **Statistical exercise:** Share a spreadsheet with sample eBay pricing data and have students compute robust statistics in class, comparing results with the platform's methodology.

---

## Relevant Readings

- Gene Kim, Kevin Behr, and George Spafford, *The Phoenix Project: A Novel About IT, DevOps, and Helping Your Business Win* (Portland: IT Revolution Press, 2013).
- Nicole Forsgren, Jez Humble, and Gene Kim, *Accelerate: The Science of Lean Software and DevOps* (Portland: IT Revolution Press, 2018).
- Genichi Taguchi, *Introduction to Quality Engineering: Designing Quality into Products and Processes* (Tokyo: Asian Productivity Organization, 1986).
- Donald J. Wheeler, *Understanding Industrial Experimentation*, 2nd ed. (Knoxville, TN: SPC Press, 1990).
- Adam Wiggins, "The Twelve-Factor App," 2017, https://12factor.net/.
- Thomas A. Limoncelli, "GitOps: A Path to More Self-Service IT," *Communications of the ACM* 61, no. 9 (2018): 38–42.
- Shraddha Barke, Michael B. James, and Nadia Polikarpova, "Grounded Copilot: How Programmers Interact with Code-Generating Models," *Proceedings of the ACM on Programming Languages (OOPSLA)* 7 (2023).
