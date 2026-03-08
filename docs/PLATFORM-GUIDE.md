# VZLA Sports Elite — Platform Documentation

> **Last updated:** March 2026  
> A complete reference for every feature, metric, calculation, and data pipeline powering the site.

---

## 1. What Is VZLA Sports Elite?

A sports-card market intelligence platform tracking **550+ Venezuelan athletes** across Baseball, Soccer, Basketball, and other sports. It pulls daily eBay listing and sold data, computes statistical pricing analytics, and displays actionable investment signals for collectors.

**Live URL:** [https://quick-shine-ui.lovable.app](https://quick-shine-ui.lovable.app)

---

## 2. Data Sources & Pipelines

### 2.1 Data Files

| File | Description |
|------|-------------|
| `data/athletes.json` | Master athlete roster (name, sport, league, team) |
| `data/ebay-avg.json` | Raw (ungraded) active listing averages |
| `data/ebay-graded-avg.json` | Graded active listing averages |
| `data/ebay-sold-avg.json` | Raw sold listing averages |
| `data/ebay-graded-sold-avg.json` | Graded sold listing averages |
| `data/athlete-history.json` | Per-athlete daily snapshots (price, CV, days, index level) — 90-day rolling window |
| `data/index-history.json` | Daily sport-level index snapshots (permanent, no cap) |
| `data/gemrate.json` | PSA grading population counts from Gemrate.com |

### 2.2 Active Listing Scripts (eBay Browse API)

| Script | Workflow | Schedule | What It Does |
|--------|----------|----------|--------------|
| `update-ebay-avg.js` | `ebay.yml` | Daily 1 PM UTC | Fetches raw (Near Mint + Excellent) active listings |
| `graded-update-ebay-avg.js` | `ebay-graded.yml` | Daily | Fetches graded (PSA, BGS, SGC) active listings |

- **API quota:** Both share one daily eBay Browse API production quota.
- **Condition filter (Raw):** Accepts "Near Mint" and "Excellent" conditions. Blocklist excludes damaged/poor but explicitly allows `excellent`, `ex`, `auto`, and `signed`.
- **Condition filter (Graded):** Matches listings containing grading company keywords (PSA, BGS, SGC, etc.).

### 2.3 Sold Listing Scripts (HTML Scraping — no API quota impact)

| Script | Workflow | Schedule | What It Does |
|--------|----------|----------|--------------|
| `sold-update-ebay-avg.js` | `ebay-sold.yml` | Every 3 hours (10 athletes/batch) | Scrapes raw sold listings |
| `graded-sold-update-ebay-avg.js` | `ebay-graded-sold.yml` | Every 2 hours (10 athletes/batch) | Scrapes graded sold listings |

- Uses sport-specific League aspect filters (e.g., "Major League (MLB)") to prevent cross-sport contamination.
- Excludes bulk lots (`u-pick`, `lote`, `base cards from`).
- 4-retry loops with exponential backoff; progress saved in `*-progress.json`.

### 2.4 PSA Grading Data

| Script | Workflow | Schedule |
|--------|----------|----------|
| `fetch_gemrate.py` | `gemrate.yml` | Every 2 hours (10 athletes/batch) |

- Scrapes Gemrate.com for PSA population counts.
- Multi-layered parsing (regex + text fallback).
- Anti-blocking: randomized delays, rotating User-Agents, session persistence.

### 2.5 History Snapshots

| Script | Workflow | What It Records |
|--------|----------|-----------------|
| `snapshot-athlete-history.js` | `snapshot-history.yml` | Per-athlete: price, CV, days on market (API + observed), listing count, index level. Also maintains `data/athlete-first-seen.json` for snapshot-based DOM tracking. 90-day rolling window. |
| (embedded in `update-ebay-avg.js`) | `ebay.yml` | Sport-level index to `data/index-history.json` — permanent archive. |

### 2.6 Data Freshness Strategy

- Frontend fetches data from **GitHub raw URLs** (not local public/ copies) so updates are visible without republishing.
- Fallback: local `public/data/` files if remote fetch fails.
- "Updated" timestamp comes from `ebay-sold-progress.json → lastBatchAt`.

---

## 3. Pricing Calculations

### 3.1 Taguchi Method Average

All "average" prices use a **Taguchi-method** robust mean rather than a simple arithmetic average. This statistical approach reduces the influence of outlier listings (extremely high or low prices) to produce a more representative market price.

- Field: `taguchiListing` (active) or `taguchiSold` (sold)
- Fallback chain: `taguchiListing → avgListing → trimmedListing → avg → average`

### 3.2 Market Stability (CV)

**Coefficient of Variation (CV)** = standard deviation ÷ mean of listing prices.

| CV Range | Label | Bucket |
|----------|-------|--------|
| < 10% | Stable | `stable` |
| 10–20% | Active | `active` |
| 20–35% | Volatile | `volatile` |
| ≥ 35% | Unstable | `highly_unstable` |

Lower CV = more consistent pricing = lower risk. Displayed as a percentage on athlete cards.

### 3.3 Average Days on Market

How long listings typically stay active before selling or expiring. Used as a **liquidity indicator**.

**Data sources (fallback chain):**
1. **eBay API `avgDaysOnMarket`** — from `itemCreationDate` in Browse API responses. Often unreliable (returns 0 or null) because eBay doesn't consistently provide creation dates in search summaries.
2. **Snapshot-based `observedDays`** — computed from `data/athlete-first-seen.json`. The snapshot script (`snapshot-athlete-history.js`) records the first date an athlete has active listings (`nListing > 0`). On subsequent snapshots, `obsDays = today - firstSeen`. If listings disappear, firstSeen resets so the counter restarts when new listings appear. This is stored in each history entry's `raw.obsDays` / `graded.obsDays` field.

The frontend prefers the eBay API value when it's available and > 0, otherwise falls back to `obsDays` from the latest history entry.

| Days | Interpretation |
|------|----------------|
| < 7 | Very liquid / fast movers |
| 7–30 | Normal |
| 30–180 | Slow |
| > 180 | Illiquid |

Filter buckets on the site:
- **Low:** < 180 days
- **Medium:** 180–540 days
- **High:** > 540 days

### 3.4 Index Level (Per-Athlete)

A **base-100 performance index** where the first recorded price for an athlete serves as the baseline (100).

- Calculated and stored daily in the eBay avg scripts.
- Displayed on athlete cards with direction arrows (↗/↘) and color coding:
  - **Green (≥ 100):** Price at or above baseline
  - **Red (< 100):** Price below baseline

### 3.5 Sport Index (Index Cards on Home Page)

The **average Index Level** across all priced athletes in a sport.

- Formula: `sum(indexLevel for each athlete) / count(athletes with indexLevel)`
- Displayed for the top 2 sports (Baseball, Soccer) and an "All" aggregate.
- The percentage change shown (e.g., "↘ -11.4% 4d") compares the last two entries in `data/index-history.json`.

---

## 4. Investment Signals

### 4.1 Buy Low Signal

Triggers when: **Sold average < Active listing average**

Meaning: Cards are selling for less than they're listed at, suggesting the market is softening or that patient buyers can find deals below the typical ask.

### 4.2 Flip Potential Signal

Triggers when: **Sold average ≥ Active listing average** AND stability is **Volatile or Unstable**

Meaning: Cards are selling at or above list price in a volatile market — potential for quick flips, but higher risk due to price instability.

### 4.3 Investment Signal Quadrants (Market Intel Page)

| Quadrant | Criteria | Meaning |
|----------|----------|---------|
| **Undervalued** | Sold > Listed, Low CV | Selling above ask with stable pricing — strong buy candidate |
| **Fast Mover** | Low days on market | High liquidity — cards sell quickly |
| **Speculative** | High CV | Wildly varying prices — high risk/reward |
| **Overpriced** | Listed > Sold, High DOM | Priced above what buyers pay, sitting on market |

**Days-on-market fallback in signals:** The signal classifier uses the same DOM fallback chain as athlete cards — eBay API `avgDaysOnMarket` first, then snapshot-based `obsDays` from `athlete-history.json` when the API value is 0 or unavailable. This ensures "Fast Mover" and "Overpriced & Slow" classifications remain accurate even when the eBay Browse API omits listing creation dates.

---

## 5. Budget Optimizer (Knapsack Algorithm)

A **0/1 knapsack optimization** that recommends the best combination of athlete cards within a user-specified budget.

### 5.1 How It Works

1. User enters a **budget** (in USD) and optional **max card count**.
2. Each athlete is scored using:

   **Value Score = Stability Points × Liquidity Multiplier**

   **Stability Points** (from CV):
   | CV | Points |
   |----|--------|
   | ≤ 10% | 100 |
   | ≤ 20% | 70 |
   | ≤ 35% | 35 |
   | > 35% | 10 |

   **Liquidity Multiplier** (from Avg Days on Market):
   | Days | Multiplier |
   |------|-----------|
   | ≤ 7 | 1.3× |
   | ≤ 14 | 1.15× |
   | ≤ 30 | 1.0× |
   | ≤ 60 | 0.9× |
   | > 60 | 0.75× |

3. The algorithm maximizes total value score within the budget constraint.
4. Duplicate athletes (same name+sport) are de-duplicated, keeping the highest value score.

### 5.2 Card Type Support

The optimizer can run against **Raw** or **Graded** price datasets independently.

---

## 6. UI Features

### 6.1 Price Mode Toggle

Three modes: **Raw**, **Graded**, **Both** (default).

- **Raw:** Shows ungraded card prices only.
- **Graded:** Shows graded (PSA/BGS/SGC) card prices only.
- **Both:** Side-by-side display with dual metadata rows labeled "Raw" and "Grd".

### 6.2 Athlete Cards

Each card displays:
- **Athlete name** and sport icon
- **eBay average listing price** (Taguchi method)
- **eBay average sold price** (reference point)
- **Stability score** (CV-based, with label and percentage)
- **Days on market** (liquidity indicator)
- **Index Level** (base-100 performance, with directional arrow)
- **Buy Low / Flip Potential** badges (when applicable)
- **Sparkline** (7+ days of history required to render)
- Wikipedia image (fetched dynamically)

In "Both" mode, cards use a 2-column layout with Raw and Graded data side-by-side.

### 6.3 Sparklines

Interactive SVG mini-charts showing price trends:
- **Primary color** trendline = gains
- **Destructive color** trendline = losses
- Tooltips show specific prices and dates on hover
- Minimum 7 days of snapshot data required

### 6.4 Search & Filters

| Filter | Options |
|--------|---------|
| **Search** | Free-text name search |
| **Category** | All, Baseball, Soccer, Basketball, Other |
| **Price** | All, Low→High, High→Low, No Price |
| **Stability** | All, Stable, Active, Volatile, Unstable, None |
| **Days Listed** | All, Low (<180), Medium (180-540), High (>540), None |
| **Signal** | All, Buy Low, Flip Potential |

By default, athletes with no eBay data are hidden unless the user explicitly filters for them (No Price, None stability, or uses search).

### 6.5 Sorting

| Option | Behavior |
|--------|----------|
| Default | Natural order from data |
| Price (High→Low) | Descending by Taguchi average |
| Stability (Best) | Ascending by CV (most stable first) |

### 6.6 Market Intel Dashboard (`/data`)

- **KPI Cards:** Total athletes, matched (with both listed + sold data), average price, etc.
- **Top 10 Biggest Price Gaps** bar chart (listed vs. sold spread)
- **Graded Cards – Top 10** bar chart (PSA population from Gemrate)
- **Investment Signal Quadrants** (Undervalued, Fast Mover, Speculative, Overpriced)
- All charts support Raw/Graded/Both visualization modes

---

## 7. eBay Store Automation

### 7.1 Best Offer Auto-Enable

- **Script:** `check-best-offer.js`
- **Schedule:** Daily at 8 AM UTC
- Scans active listings and enables Best Offer if not already on.

### 7.2 Auto Send Offers to Watchers

- **Script:** `send-offers.js`
- **Schedule:** Daily at 2 PM UTC
- Sends 10% discount offers to watchers of eligible items.

### 7.3 OAuth

- **RuName:** `JD_Services_LTD-JDServic-twitte-timwunp`
- **Scopes:** basic access, sell.fulfillment.readonly, sell.inventory, sell.negotiation, sell.account
- Refresh token stored in Render env vars + GitHub Secrets.

---

## 8. Pages

| Route | Page | Description |
|-------|------|-------------|
| `/` | Home | Hero, index cards, how-to, top deals, budget optimizer, search/filters, athlete grid |
| `/data` | Market Intel | Dashboard with KPIs, charts, signal quadrants |
| `/about` | About | Platform information |
| `/blog` | Blog | Blog listing |
| `/blog/:slug` | Blog Post | Individual blog post |
| `/privacy` | Privacy | Privacy policy |

---

## 9. Tech Stack

- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS
- **UI Components:** shadcn/ui (Radix primitives)
- **Animations:** Framer Motion
- **Charts:** Recharts
- **Data Pipelines:** Node.js scripts + Python scrapers
- **CI/CD:** GitHub Actions (scheduled workflows)
- **Hosting:** Lovable (frontend) + Render (OAuth server)
- **APIs:** eBay Browse API (active listings), eBay HTML scraping (sold listings), Gemrate.com (PSA data), Wikipedia (athlete images)

---

## 10. Glossary

| Term | Definition |
|------|------------|
| **Taguchi Average** | Robust statistical mean that minimizes outlier influence |
| **CV (Coefficient of Variation)** | Standard deviation / mean — measures price consistency |
| **Index Level** | Base-100 metric; first price = 100, current price as % of that |
| **Sport Index** | Average Index Level across all priced athletes in a sport |
| **DOM (Days on Market)** | Average time listings stay active |
| **Knapsack** | Optimization algorithm to maximize value within a budget |
| **Raw** | Ungraded cards in Near Mint or Excellent condition |
| **Graded** | Professionally graded cards (PSA, BGS, SGC, etc.) |
| **Gemrate** | Third-party site providing PSA grading population data |
| **Stability Points** | Score derived from CV, used in budget optimizer (0-100) |
| **Liquidity Multiplier** | Modifier based on DOM, boosts/penalizes fast/slow sellers |
