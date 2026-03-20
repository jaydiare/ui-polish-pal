# Appendix B: Statistical Methods

> **The AI DevOps Playbook — Appendix B**  
> Mathematical foundations for every pricing calculation and optimization algorithm in the platform.

---

## 1. Taguchi Winsorized Trimmed Mean

### Background

Genichi Taguchi's quality engineering methods [Taguchi-1986] were originally designed for manufacturing process optimization. The platform adapts his robust statistical approach to sports card pricing, where outlier listings (shill bids, misclassified lots, damaged cards listed as mint) routinely distort simple averages.

### Algorithm

Given a set of *n* listing prices:

1. **Sort** all prices in ascending order: *p₁ ≤ p₂ ≤ ... ≤ pₙ*
2. **Trim** the bottom 20% and top 20% of values:
   - *k* = ⌊0.20 × *n*⌋ (number of values to remove from each end)
   - Remaining values: *p_{k+1}, p_{k+2}, ..., p_{n-k}*
3. **Compute the mean** of the remaining 60%:
   - *Taguchi Mean* = (1 / (*n* - 2*k*)) × Σ *pᵢ* for *i* = *k*+1 to *n*-*k*

### Worked Example

```
Raw prices:  [$1.50, $2.50, $3.00, $3.25, $3.50, $3.75, $4.00, $4.50, $12.00, $85.00]
n = 10, k = ⌊0.20 × 10⌋ = 2

After trim:  [$3.00, $3.25, $3.50, $3.75, $4.00, $4.50]
             (removed: $1.50, $2.50 from bottom; $12.00, $85.00 from top)

Simple mean of all 10: $12.30  (distorted by $85.00 outlier)
Taguchi mean of 6:     $3.67   (representative market price)
```

### Minimum Sample Size

The platform requires a minimum of **4 listings** (`nListing ≥ 4`) before computing and displaying a Taguchi average. Below this threshold, the trim would remove all values.

### Fallback Chain

When fetching an athlete's price, the frontend uses this precedence:

```
taguchiListing → avgListing → trimmedListing → avg → average → null
```

This ensures backward compatibility as the statistical method evolved over time.

### Variant: SCP Pricing

SportsCardsPro prices use the same Taguchi method but with a **lighter 20% total trim** (10% from each end) because SCP queries typically return fewer results (3–8 products vs. 20–80 eBay listings).

---

## 2. Coefficient of Variation (CV)

### Definition

The Coefficient of Variation is a standardized measure of price dispersion [CV-Reference]:

```
CV = (σ / μ) × 100%
```

Where:
- *σ* = standard deviation of listing prices
- *μ* = mean of listing prices

### Interpretation for Sports Cards

| CV Range | Label | Market Meaning | Risk Level |
|----------|-------|----------------|------------|
| < 10% | **Stable** | Tight consensus on price — low risk | 🟢 Low |
| 10–20% | **Active** | Normal market activity — moderate variation | 🟡 Moderate |
| 20–35% | **Volatile** | Wide price disagreement — higher risk | 🟠 High |
| ≥ 35% | **Unstable** | No price consensus — speculation territory | 🔴 Very High |

### Why CV Over Standard Deviation?

Standard deviation is scale-dependent: a $1 SD means very different things for a $5 card vs. a $500 card. CV normalizes by the mean, enabling fair comparison across price points.

### Anomaly Threshold

CV > 100% (σ > μ) is flagged as an anomaly in the bi-weekly analysis, indicating the price distribution is so wide that the mean is essentially meaningless.

---

## 3. Signal-to-Noise Ratio (S/N)

### Definition

Adapted from Taguchi's quality engineering [Taguchi-Robust], the S/N ratio quantifies pricing predictability:

```
S/N = 10 × log₁₀(μ² / σ²)    [in decibels]
```

Where:
- *μ* = mean of listing prices
- *σ²* = variance of listing prices

### Interpretation

| S/N (dB) | Meaning |
|----------|---------|
| > 30 | Extremely predictable — strong signal |
| 20–30 | Reliable pricing — good signal |
| 10–20 | Moderate noise — usable but variable |
| < 10 | Noisy — price is unreliable |

### Relationship to CV

S/N and CV are inversely related:

```
S/N = 10 × log₁₀(1 / CV²)   [when CV is expressed as a decimal]
```

A high S/N ratio implies a low CV and vice versa. The platform uses both because:
- **CV** is more intuitive for users ("20% variation")
- **S/N** is more useful in optimization formulas (logarithmic scale compresses range)

### Usage in Budget Optimizer

The S/N ratio provides a **non-restrictive bonus** in the knapsack value scoring:

```
S/N Multiplier = 1.0 + (min(S/N, 40) / 40) × 0.25
```

- S/N unavailable → 1.0× (neutral, no penalty)
- S/N = 0 → 1.0× (no bonus)
- S/N = 20 → 1.125× (12.5% boost)
- S/N = 40+ → 1.25× (maximum 25% boost)

---

## 4. The 0/1 Knapsack Algorithm

### Problem Statement

Given:
- A **budget** *W* (in USD)
- A set of *n* athletes, each with a **cost** *cᵢ* (Taguchi average price) and **value** *vᵢ* (composite score)

Find the subset *S* that maximizes:

```
Maximize: Σ vᵢ  for all i ∈ S
Subject to: Σ cᵢ ≤ W  for all i ∈ S
            |S| ≤ maxCards (optional constraint)
```

### Value Score Computation

Each athlete's value score is a product of three factors:

```
Value = StabilityPoints × LiquidityMultiplier × S/N_Bonus
```

**Stability Points** (from CV):

| CV | Points | Rationale |
|----|--------|-----------|
| ≤ 10% | 100 | Most predictable — highest value |
| ≤ 20% | 70 | Good stability — strong candidate |
| ≤ 35% | 35 | Some risk — moderate value |
| > 35% | 10 | High risk — minimal base value |

**Liquidity Multiplier** (from Average Days on Market):

| Days | Multiplier | Rationale |
|------|-----------|-----------|
| ≤ 7 | 1.30× | Very fast sellers — premium |
| ≤ 14 | 1.15× | Quick turnaround — bonus |
| ≤ 30 | 1.00× | Normal — baseline |
| ≤ 60 | 0.90× | Slow — minor penalty |
| > 60 | 0.75× | Illiquid — significant penalty |

**S/N Bonus** (from Signal-to-Noise Ratio):

| S/N Range | Multiplier |
|-----------|-----------|
| Unavailable | 1.00× |
| 0–40 (linear) | 1.00×–1.25× |

### Dynamic Programming Solution

The platform uses the classic bottom-up DP approach [CLRS]:

```
dp[i][w] = max value achievable using items 1..i with capacity w

dp[i][w] = max(
  dp[i-1][w],                    // Don't include item i
  dp[i-1][w - cᵢ] + vᵢ          // Include item i (if cᵢ ≤ w)
)
```

**Price discretization:** Since DP requires integer weights, prices are converted to cents (multiply by 100) to maintain precision while using integer arithmetic.

### Deduplication

Before optimization, athletes with the same name and sport are deduplicated, keeping only the entry with the highest value score. This prevents the optimizer from recommending the same athlete from different data sources.

---

## 5. ROI Potential Score

### Formula

```
ROI = (Signal_SN × (RawSold + PSASold)) / (PSAPop × StabilityCV)
```

### Component Sources

| Component | Data Source | Unit |
|-----------|-----------|------|
| Signal S/N | Taguchi S/N ratio from listing data | Decibels (dB) |
| Raw Sold | `ebay-sold-avg.json` (taguchiSold or avg) | USD |
| PSA Sold | `ebay-graded-sold-avg.json` (taguchiSold or avg) | USD |
| PSA Pop | `gemrate.json` (total PSA graded count) | Count |
| Stability CV | Coefficient of Variation from listings | Decimal (0–1+) |

### Tier Classification

| Tier | Threshold | Interpretation |
|------|-----------|----------------|
| 🟢 High | ROI ≥ 1.0 | Strong signal, high demand relative to supply |
| 🟡 Medium | 0.3 ≤ ROI < 1.0 | Moderate opportunity — worth monitoring |
| 🔴 Low | ROI < 0.3 | Weak signal, oversupplied, or low demand |

### Prerequisites

ROI is only calculated when **all four** components are available and non-zero, and at least one sold price is positive. Otherwise, "—" is displayed.

---

## 6. Index Level (Base-100 Performance)

### Per-Athlete Index

```
IndexLevel = (CurrentPrice / BaselinePrice) × 100
```

- **BaselinePrice** = first recorded Taguchi average for the athlete
- Stored and updated in `ebay-avg.json` as `basePrice` and `indexLevel`
- Display: Green (≥ 100) = at or above baseline; Red (< 100) = below baseline

### Sport Index

```
SportIndex = (1/n) × Σ IndexLevelᵢ   for all athletes with indexLevel in sport
```

The homepage displays Sport Index for Baseball, Soccer, and an All-sports aggregate. The percentage change compares the last two entries in `index-history.json`.

---

## 7. Investment Signal Classification

### Buy Low Signal

```
IF soldAvg < listedAvg THEN signal = "Buy Low"
```

Cards selling below asking price — market softening or patient-buyer opportunity.

### Flip Potential Signal

```
IF soldAvg ≥ listedAvg AND stability ∈ {Volatile, Unstable} THEN signal = "Flip Potential"
```

Cards selling at or above ask in a volatile market — short-term flip opportunity with risk.

### Market Intel Quadrants

| Quadrant | Listed vs. Sold | Stability/DOM | Interpretation |
|----------|----------------|---------------|----------------|
| **Undervalued** | Sold > Listed | Low CV | Strong buy — selling above ask, stable |
| **Fast Mover** | — | Low DOM | High liquidity — sells quickly |
| **Speculative** | — | High CV | Wild price swings — high risk/reward |
| **Overpriced** | Listed > Sold | High DOM | Sitting on market above market value |

---

## 8. Days on Market (DOM) — Dual-Source Estimation

### Source 1: eBay API (`avgDaysOnMarket`)

Computed from `itemCreationDate` in Browse API responses. Often unreliable — eBay frequently returns 0 or null because creation dates aren't consistently provided in search summaries.

### Source 2: Snapshot-Based (`observedDays`)

```
obsDays = today - firstSeenDate
```

Where `firstSeenDate` is recorded in `athlete-first-seen.json` when an athlete first appears with active listings (`nListing > 0`). If listings disappear, `firstSeenDate` resets.

### Fallback Priority

```
DOM = eBay API avgDaysOnMarket (if > 0)
    → obsDays from athlete-history.json (if available)
    → null (not displayed)
```

---

*References: [Taguchi-1986], [Taguchi-Robust], [CV-Reference], [Robust-Statistics], [Wilcox-Robust], [CLRS], [Knapsack]. See the References & Bibliography for full citations.*
