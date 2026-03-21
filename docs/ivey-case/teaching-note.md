# Teaching Note

# VZLA Sports Elite: DevOps with an AI Partner

---

## Case Synopsis

In January 2026, Juan Rodriguez — a Professional Engineer, Technical Program Manager, and university lecturer — faced a decision about the future of VZLA Sports Elite, a sports card market intelligence platform he had built entirely through conversation with an AI coding partner. The case examined how six core DevOps principles — version control as source of truth, documentation as infrastructure, automation, resilience, observability, and iterative development — served as the collaboration framework between a human operator and a stateless AI. Rodriguez had to decide whether the DevOps methodology that enabled this human-AI collaboration was sufficient to sustain production infrastructure, or whether formalizing testing, operational runbooks, and the methodology itself was the necessary next step.

---

## Learning Objectives

After completing this case, students should be able to:

1. **Evaluate** how DevOps principles (automation, version control, resilience, observability, continuous improvement) function as collaboration infrastructure between human operators and AI development tools.
2. **Analyze** the role of documentation as a compensating mechanism when an engineering partner has no persistent memory, and its implications for software development practices.
3. **Assess** the risks of single-operator AI-assisted systems, including bus factor, testing gaps, and the boundary between "working" and "production-grade."
4. **Apply** the concept of iterative, session-bounded development to understand how complex systems can emerge from incremental AI-assisted work.
5. **Recommend** a strategic path forward that balances technical sustainability, operational risk, and the human operator's goals.

---

## Assignment Questions

1. Rodriguez identified six DevOps principles that made the human-AI collaboration viable. Which of these principles was most critical to the project's success? Could the platform have been built without any one of them?

2. The case describes documentation as "infrastructure" rather than supplementary material. How does this reframe the traditional view of documentation in software engineering? What are the implications for organizations adopting AI-assisted development tools?

3. Rodriguez's AI partner wrote every line of code but retained no memory between sessions. How did this constraint shape the platform's architecture? What architectural decisions would have been different if the AI had persistent memory?

4. The platform has no automated test suite. Rodriguez relies on statistical methods and data quality monitoring to detect errors. Evaluate whether this approach is viable for production systems. What testing strategy would you recommend given the single-operator constraint?

5. Assess the three strategic options Rodriguez was considering (maintain status quo, formalize infrastructure, scale the methodology). Which would you recommend, and why? Consider how each option served or conflicted with Rodriguez's original goal of creating a technical legacy for his children.

---

## Analysis

### Question 1: Critical DevOps Principle

**Most appropriate answer:**

Documentation as infrastructure was the most critical principle. Without it, every other principle degraded. Automation was useless if the AI could not understand what to automate in the next session. Version control recorded *what* changed but not *why*. Resilience patterns could not be replicated without documented failure histories. The documentation served as the bridge between stateless AI sessions, making all other principles reproducible.

However, a strong case could be made for version control as source of truth, since the Git repository was the sole location of all system state — code, data, and documentation. Without version control, documentation itself had no reliable home.

**Anticipated student responses:**

- Students with DevOps backgrounds may argue for automation, reasoning that the fifteen pipelines were the platform's core value. The counterargument was that automation without documentation produced inconsistent implementations — early pipelines had ad-hoc commit messages and varied error handling because no convention document existed.
- Some students may argue that no single principle was sufficient alone and that the six principles formed an interdependent system. This was a valid synthesis-level response.

**Teaching tip:** Ask students to imagine removing one principle at a time and predicting the consequences. This reveals the dependency structure: documentation supported everything; automation was high-value but replaceable with manual execution; observability was important but secondary.

---

### Question 2: Documentation as Infrastructure

**Most appropriate answer:**

Rodriguez's framing inverted the traditional documentation pyramid. In conventional software engineering, documentation was a record of decisions already made — useful but not essential to system operation. In Rodriguez's model, documentation was the mechanism by which decisions *survived* between development sessions. An undocumented decision was, functionally, a decision that had never been made — because the AI would not know about it in the next session.

Implications for organizations:

- **Documentation debt became technical debt.** Missing documentation meant the AI partner would repeat past mistakes or propose architectures that had already been tried and rejected.
- **Documentation quality bounded AI collaboration quality.** Well-documented systems produced sophisticated AI contributions; poorly documented systems produced generic, context-free code.
- **The "DO NOT" pattern emerged.** Documentation explicitly recording what *not* to do was often more valuable than documenting what to do, because it prevented the AI from re-discovering known failure modes.

**Anticipated student responses:**

- Students may argue that newer AI models with longer context windows or memory capabilities would reduce the need for documentation. The counterargument was that external documentation was version-controlled, searchable, and shared across tools — qualities that an AI's internal state did not reliably offer.
- Some students may note that this documentation burden could be unsustainable for larger teams. The instructor should distinguish between documentation for human consumption (which scaled poorly) and documentation for AI consumption (which was consumed instantly and could be highly structured).

**Teaching tip:** Ask students to estimate how much institutional knowledge exists only in their team members' heads. How long would it take a new team member — or an AI — to become productive? The gap between "documented" and "known" was the vulnerability.

---

### Question 3: Architecture Shaped by Statelessness

**Most appropriate answer:**

The AI's lack of persistent memory directly produced several architectural patterns:

- **Convention-over-configuration:** Early pipelines had inconsistent error handling, commit messages, and progress tracking because each session's AI produced its own approach. After Rodriguez documented standard patterns, new pipelines automatically followed them. The AI did not standardize on its own — it followed whatever conventions were visible in the documentation.
- **Incremental layered development:** Each session added one capability and documented it before ending. The system grew in complete, working increments because the AI could not carry partially implemented features across sessions.
- **Bug-as-documentation:** Code fixes prevented bugs from recurring in the current code. Documentation fixes prevented bugs from recurring in future sessions where the AI might refactor the code and inadvertently reintroduce the problem.

If the AI had persistent memory, Rodriguez might have relied more on conversational context and less on formal documentation. The architecture might have been less modular (features could span sessions), less well-documented (decisions would "live" in the AI's memory), and potentially more brittle (if the AI's memory was lost or corrupted, recovery would be harder than re-reading documentation).

**Anticipated student responses:**

- Students may suggest that persistent AI memory would eliminate the need for documentation. The counterargument was that memory was not the same as documentation — memory was internal, unsearchable by other tools, and not version-controlled.
- Some students may note that the statelessness constraint, while challenging, produced better engineering practices. This was a key insight: the constraint forced discipline that benefitted the project regardless of the AI's capabilities.

**Discussion prompt:** Does the constraint of statelessness accidentally produce better engineering outcomes? If so, should teams deliberately impose "stateless" practices even when persistent memory is available?

---

### Question 4: Testing Strategy

**Most appropriate answer:**

The absence of automated tests was the platform's most significant technical risk. While the Taguchi winsorized mean and CV scores provided implicit data quality checks, they did not catch logic errors in pipeline code, API response format changes, or frontend rendering bugs.

A recommended testing approach, prioritized for a single operator:

1. **Data validation tests** (highest priority) — JSON schema validation on every pipeline output before committing. This caught structural errors at the point of creation.
2. **Smoke tests** — Simple API response checks at the start of each pipeline run to detect upstream service changes early.
3. **Snapshot tests** — Compare pipeline outputs against known-good baselines to detect unexpected drift.
4. **End-to-end tests** (lowest priority for a single operator) — Browser-based testing of the frontend, deferred until the project scaled.

Rodriguez's reliance on statistical methods for error detection was clever but incomplete. The Taguchi mean could detect pricing anomalies, but it could not detect silent pipeline failures (a workflow that stopped running), schema drift (an API returning different field names), or frontend regressions.

**Anticipated student responses:**

- Students may argue that the AI partner could write the test suite. This was true for implementation, but the human still needed to define what "correct" looked like. Testing strategy was a curatorial decision, not a coding one.
- Some students may propose continuous integration testing triggered by each pipeline commit. This was a good extension — but required investment in test infrastructure that competed with feature development time.

**Teaching tip:** Ask students to calculate the cost of a single undetected data quality error propagating through the system for one week. How many athlete profiles would display incorrect prices? What would the impact be on user trust?

---

### Question 5: Strategic Path Forward

**Most appropriate answer:**

Option 2 (formalize the infrastructure) was the most balanced recommendation. It addressed the platform's most critical risks while preserving Rodriguez's ability to pursue Options 1 or 3 later. Specific recommendations:

- Add data validation tests to every pipeline (2–3 weeks of effort)
- Create an operational runbook for common failure scenarios
- Establish a staging branch for testing pipeline changes before merging to main
- Document recovery procedures with step-by-step verification

Option 3 (scale the methodology) was premature without Option 2. Presenting the human-AI DevOps methodology as a teachable framework required demonstrating that it produced reliable, sustainable systems — which required the testing and operational maturity that Option 2 provided.

Option 1 (status quo) was viable short-term but accumulated risk. Every new pipeline added without testing increased the probability of an undetected failure.

**Alignment with legacy goal:** Rodriguez's original motivation was creating a technical legacy for his children. Option 2 best served this goal — a well-tested, professionally documented platform demonstrated engineering rigour more effectively than a feature-rich but fragile one. Option 3 could serve the legacy goal if it produced a published case study or educational resource, but only after Option 2 established the foundation.

**Anticipated student responses:**

- Students focused on the personal legacy goal may prefer Option 1, arguing that the project's value was in its existence and its story, not its operational maturity.
- Entrepreneurially minded students may jump to Option 3. The instructor should push back on whether the methodology was sufficiently proven without automated testing.
- Some students may propose open-sourcing the platform. This introduced governance, code review, and community management challenges that the case did not address.

**Discussion prompt:** How does the personal motivation behind a technical project affect strategic decisions? Would Rodriguez make different choices if this were a commercial product rather than a legacy project?

---

## Online Teaching Strategies

1. **Pre-class preparation:** Assign students to visit the VZLA Sports Elite platform (https://quick-shine-ui.lovable.app) and explore the athlete cards, pricing data, and investment signals. Ask them to identify one design decision that reflected a DevOps principle and one area they would improve.

2. **Breakout rooms:** Divide students into groups of 3–4, each assigned one of the five discussion questions. Groups prepare a 5-minute presentation of their analysis, followed by class-wide discussion.

3. **Live demonstration:** If possible, show a GitHub Actions workflow run in real time (or a recorded run), walking through the pipeline execution, data commit, and frontend update cycle. This made the automation tangible.

4. **Polling:** Use real-time polling to gauge student preferences on the three strategic options before discussion. Revisit the poll after discussion to see if opinions shifted.

5. **Reflection exercise:** Ask students to write a 200-word "documentation for AI" passage about a system they work with. What decisions would they capture? What "DO NOT" warnings would they include? This made the documentation-as-infrastructure concept personal and concrete.

---

## Relevant Readings

- Gene Kim, Kevin Behr, and George Spafford, *The Phoenix Project: A Novel About IT, DevOps, and Helping Your Business Win* (Portland: IT Revolution Press, 2013).
- Nicole Forsgren, Jez Humble, and Gene Kim, *Accelerate: The Science of Lean Software and DevOps* (Portland: IT Revolution Press, 2018).
- Genichi Taguchi, *Introduction to Quality Engineering: Designing Quality into Products and Processes* (Tokyo: Asian Productivity Organization, 1986).
- Donald J. Wheeler, *Understanding Industrial Experimentation*, 2nd ed. (Knoxville, TN: SPC Press, 1990).
- Adam Wiggins, "The Twelve-Factor App," 2017, https://12factor.net/.
- Thomas A. Limoncelli, "GitOps: A Path to More Self-Service IT," *Communications of the ACM* 61, no. 9 (2018): 38–42.
- Shraddha Barke, Michael B. James, and Nadia Polikarpova, "Grounded Copilot: How Programmers Interact with Code-Generating Models," *Proceedings of the ACM on Programming Languages (OOPSLA)* 7 (2023).
- Daniele Procida, "Diátaxis: A Systematic Approach to Technical Documentation," accessed March 2026, https://diataxis.fr/.
