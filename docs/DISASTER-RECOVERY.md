# VZLA Sports Elite — Disaster Recovery Build Specification

> **Purpose:** A complete system prompt–style specification to rebuild this website from scratch.  
> **Last updated:** March 2026  
> If the codebase is lost, this document contains every architectural decision, data flow, visual design token, component hierarchy, and business logic needed to recreate the platform faithfully.

---

## 1. Project Identity

- **Name:** VZLA Sports Elite
- **Domain:** vzlasportselite.com
- **Tagline:** "Venezuelan Athletes Sports Cards – Daily eBay Price Index"
- **Purpose:** Sports-card market intelligence platform tracking 550+ Venezuelan athletes across Baseball, Soccer, Basketball, Golf, Tennis, MMA, Football, Bowling, BMX, Track & Field.
- **Live URL:** https://quick-shine-ui.lovable.app (Lovable preview) / https://www.vzlasportselite.com (production)

---

## 2. Tech Stack (Exact Versions Matter)

| Layer | Technology | Notes |
|-------|-----------|-------|
| **Framework** | React 18 + TypeScript | Functional components, hooks only |
| **Build** | Vite (with `@vitejs/plugin-react-swc`) | Port 8080, HMR overlay disabled |
| **Styling** | Tailwind CSS + custom CSS utilities | Dark-only theme, no light mode |
| **UI Library** | shadcn/ui (Radix primitives) | Customized with design tokens |
| **Animations** | Framer Motion | Hero entrance, card stagger, dropdowns |
| **Charts** | Recharts | Scatter, Bar charts on `/data` page |
| **Routing** | react-router-dom v7 | Lazy-loaded pages |
| **State** | @tanstack/react-query + useState/useMemo | No Redux/Zustand |
| **Fonts** | Space Grotesk (display) + Inter (body) | Loaded via Google Fonts, non-render-blocking |
| **Data Pipelines** | Node.js scripts + Python scrapers | Run via GitHub Actions |
| **OAuth Server** | Express.js on Render | eBay OAuth token management |
| **Hosting** | Lovable (frontend) + Render (OAuth) | GitHub raw URLs for data freshness |

### Path Aliases
```
@ → ./src/
```

---

## 3. Design System — Exact Tokens

### 3.1 Color Palette (HSL values for CSS variables)

```css
:root {
  /* Core */
  --background: 230 60% 4%;        /* Near-black navy */
  --foreground: 0 0% 97%;          /* Off-white */
  --card: 230 40% 7%;              /* Slightly lighter navy */
  --card-foreground: 0 0% 97%;
  --primary: 55 93% 51%;           /* Venezuelan gold/yellow */
  --primary-foreground: 0 0% 0%;   /* Black on gold */
  --secondary: 230 35% 12%;        /* Dark panel */
  --muted: 230 25% 14%;
  --muted-foreground: 230 10% 56%; /* Subdued text */
  --accent: 250 80% 65%;           /* Purple accent */
  --destructive: 0 84% 60%;        /* Red for losses */
  --border: 230 30% 18%;
  --input: 230 30% 15%;
  --ring: 55 93% 51%;              /* Focus ring = gold */
  --radius: 0.75rem;

  /* Brand colors (Venezuelan flag) */
  --vzla-yellow: 55 93% 51%;
  --vzla-blue: 222 73% 40%;
  --vzla-red: 352 85% 38%;
  --vzla-mint: 165 100% 75%;
  --vzla-purple: 250 80% 65%;
}
```

### 3.2 Typography

- **Headings:** `font-family: 'Space Grotesk', 'Inter', sans-serif; font-weight: 700; letter-spacing: -0.03em;`
- **Body:** `font-family: 'Inter', system-ui, -apple-system, sans-serif;`
- **Anti-aliasing:** `-webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;`

### 3.3 Key CSS Utility Classes

| Class | Purpose |
|-------|---------|
| `.text-flag-gradient` | Venezuelan flag gradient text (yellow → blue → red, 90deg) |
| `.text-glow` | Gold text-shadow glow effect |
| `.glass-panel` | Card with blur backdrop, border, shadow |
| `.glass-panel-hover` | Glass panel with hover lift + gold border glow |
| `.glass-input` | Input field with blur backdrop |
| `.cta-yellow` | Gold gradient CTA button (Space Grotesk 800) |
| `.cta-flag` | Venezuelan flag gradient button |
| `.athlete-card` | Card container with hover lift animation |
| `.is-recommended` | Gold outline for budget-picked cards |
| `.icon-btn` | 40×40 social icon button |
| `.vzla-nav` | Sticky nav with purple gradient background |
| `.hero-panel` | Hero section with animated radial gradients |
| `.hero-sub` | Hero subtitle box with glass effect |
| `.page-shell` | Main content container (max-width: 1300px) |
| `.ebay-footer` | Fixed bottom eBay banner |
| `.shimmer` | Loading shimmer animation |
| `.stability-{bucket}` | Color classes for stability labels (stable=emerald, active=sky, volatile=amber, unstable=red) |

### 3.4 Navigation Bar Style

Purple gradient background (NOT the main dark navy):
```css
background: linear-gradient(135deg, hsl(250 50% 12%) 0%, hsl(260 60% 18%) 40%, hsl(245 55% 14%) 100%);
backdrop-filter: blur(16px) saturate(1.2);
border-bottom: 1px solid hsl(var(--vzla-purple) / 0.25);
```

### 3.5 Animations (Tailwind config)

- `fade-up`: opacity 0→1 + translateY 20→0 (0.5s)
- `fade-in`: opacity 0→1 (0.4s)
- `scale-in`: opacity 0→1 + scale 0.95→1 (0.3s)
- `accordion-down/up`: Radix accordion height transitions

### 3.6 Responsive Breakpoints

- Mobile: `max-width: 768px` (hero padding, font adjustments)
- Tablet: `max-width: 980px` (page shell padding)
- Desktop nav hidden below `md` (768px)
- Athlete grid: `grid-cols-[repeat(auto-fill,minmax(250px,1fr))]`

---

## 4. Data Architecture

### 4.1 Data Files (Source of Truth)

| File | Content | Update Frequency |
|------|---------|-----------------|
| `data/athletes.json` | Master roster (~553 athletes: name, sport, league, team, gemrate flag) | Manual |
| `data/ebay-avg.json` | Raw active listing averages (Taguchi mean, CV, DOM, index level) | Daily |
| `data/ebay-graded-avg.json` | Graded (PSA) active listing averages | Daily |
| `data/ebay-sold-avg.json` | Raw sold listing averages | Every 3 hours |
| `data/ebay-graded-sold-avg.json` | Graded sold listing averages | Every 2 hours |
| `data/ebay-base-prices.json` | Baseline prices for raw index calculation | Daily (append-only) |
| `data/ebay-graded-base-prices.json` | Baseline prices for graded index | Daily (append-only) |
| `data/athlete-history.json` | Per-athlete daily snapshots (90-day rolling) | Daily |
| `data/athlete-first-seen.json` | First-seen dates for DOM calculation | Daily |
| `data/index-history.json` | Sport-level index history (permanent) | Daily |
| `data/gemrate.json` | PSA population counts from Gemrate.com | Every 2 hours |
| `data/scp-raw.json` | SportsCardsPro raw prices | Monthly |
| `data/scp-history.json` | SCP historical price tracker | Monthly |
| `data/vzla-athlete-market-data.json` | Weekly unified snapshot | Weekly (Sunday) |
| `data/epn-performance.json` | eBay Partner Network click data | Manual |

### 4.2 Data Freshness Strategy

**Critical:** The frontend fetches data from **GitHub raw URLs**, NOT from local `public/data/` copies:
```
https://raw.githubusercontent.com/jaydiare/ui-polish-pal/main/data/{filename}.json
```
This ensures updates are visible without republishing the frontend. Local `public/data/` files serve as fallback only.

### 4.3 Data Fetch Pattern (useAthleteData hook)

On mount, fetch 10 JSON files in parallel via `Promise.all`:
1. `athletes.json` → merge with local `athleteDataRaw` (keep best metadata)
2. `ebay-avg.json` → enrich with base prices → build `byName`/`byKey` indexes
3. `ebay-graded-avg.json` → filter by `gemrate="yes"` athletes → merge with graded sold as fallback
4. `ebay-sold-avg.json` → raw sold data
5. `ebay-graded-sold-avg.json` → filter by gemrate eligibility
6. `ebay-sold-progress.json` → extract `lastBatchAt` for "Updated X ago" label
7. `athlete-history.json` → per-athlete sparkline data
8. `index-history.json` → sport-level index cards
9. `gemrate.json` → PSA population map
10. `scp-raw.json` → SportsCardsPro prices

### 4.4 eBay Index Lookup Chain

Name matching uses 4-layer normalization:
1. Exact name match
2. Accent-stripped match (`NFD` + remove `\u0300-\u036f`)
3. Punctuation-stripped (remove `.`, `-`, `'`)
4. `name|sport` composite key

Price fallback chain: `taguchiListing → avgListing → trimmedListing → avg → average → basePriceUSD`

---

## 5. Athlete Data Model

```typescript
interface Athlete {
  name: string;      // Display name (may include accents: "Ronald Acuña Jr.")
  sport: string;     // "Baseball", "Soccer", "Basketball", "Golf", etc.
  league: string;    // "MLB", "La Liga", "NBA", "PGA", etc.
  team: string;      // Current team
  gemrate?: string;  // "yes" = eligible for graded data; "no" or absent = raw only
  basePriceUSD?: number; // Historical baseline for index calculation
}

interface EbayAvgRecord {
  avgListing?: number;
  taguchiListing?: number;
  trimmedListing?: number;
  avg?: number;
  average?: number;
  sport?: string;
  marketStabilityCV?: number;    // Coefficient of variation (0-1 decimal)
  avgDaysOnMarket?: number;
  indexLevel?: number;           // Base-100 performance index
  basePriceUSD?: number;
  marketplaces?: {
    EBAY_US?: { marketStabilityCV?: number; avgDaysOnMarket?: number };
    EBAY_CA?: { marketStabilityCV?: number; avgDaysOnMarket?: number };
  };
}
```

### 5.1 Static Roster (Frontend Fallback)

`src/data/athletes.ts` contains a hardcoded subset of ~27 athletes as `athleteDataRaw`. This ensures the site renders even if the remote `athletes.json` fetch fails. The full roster (~553) comes from the fetched JSON.

---

## 6. Pricing Calculations

### 6.1 Taguchi Winsorized Trimmed Mean

All "average" prices use a robust statistical mean:
- Sort prices, trim 20% from each tail (top & bottom)
- Winsorize: replace trimmed values with boundary values
- Compute mean of winsorized array
- Field names: `taguchiListing` (active), `taguchiSold` (sold)

### 6.2 Market Stability (CV)

`CV = standardDeviation / mean` of listing prices (0-1 decimal range).

| CV Range | Label | CSS Class | Color |
|----------|-------|-----------|-------|
| < 0.10 | Stable | `.stability-stable` | emerald-400 |
| 0.10–0.20 | Active | `.stability-active` | sky-400 |
| 0.20–0.35 | Volatile | `.stability-volatile` | amber-400 |
| ≥ 0.35 | Unstable | `.stability-highly_unstable` | red-400 |

### 6.3 Index Level (Base-100)

`indexLevel = (currentPrice / basePriceUSD) × 100`

- First recorded price = baseline (100)
- Green arrow (↗) when ≥ 100, red arrow (↘) when < 100
- Stored in eBay avg JSON; frontend computes fallback from `price / basePriceUSD`

### 6.4 Sport Index

Average of all athletes' index levels within a sport. Displayed on index cards for Baseball, Soccer, and "All".

### 6.5 Signal-to-Noise Ratio

`S/N = 10 × log₁₀(1 / CV²)` — capped at 40, requires CV ≥ 0.01. Higher = more predictable pricing.

---

## 7. Investment Signals

### 7.1 Buy Low
**Condition:** `soldAvg < activeListingAvg`
**Badge:** 🔻 Buy Low (violet)

### 7.2 Flip Potential
**Condition:** `soldAvg ≥ activeListingAvg` AND stability is Volatile or Unstable
**Badge:** 🔄 Flip (gold)

### 7.3 Hot Seller
**Source:** eBay Partner Network performance data
**Badge:** 🔥 Hot Seller (orange)

### 7.4 Signal Quadrants (Market Intel Page)

| Quadrant | Criteria |
|----------|----------|
| 🟢 Undervalued & Stable | Sold > Listed, Low CV |
| ⚡ Fast Mover | Low days on market |
| 🎲 Speculative | High CV |
| 🔴 Overpriced & Slow | Listed > Sold, High DOM |

---

## 8. Budget Optimizer (Knapsack Algorithm)

0/1 knapsack maximizing `valueScore` under budget constraint:

```
valueScore = stabilityPoints(CV) × liquidityMultiplier(DOM) × signalToNoiseMultiplier(S/N)
```

**Stability Points:** ≤10% → 100, ≤20% → 70, ≤35% → 35, >35% → 10
**Liquidity Multiplier:** ≤7d → 1.3×, ≤14d → 1.15×, ≤30d → 1.0×, ≤60d → 0.9×, >60d → 0.75×
**S/N Bonus:** 0–40 maps to 1.0×–1.25× (null → 1.0× neutral)

Features:
- Deduplication by normalized `name|sport` key
- Optional max card count constraint (uses 2D DP table)
- Supports Raw or Graded price datasets independently
- Budget result highlights selected cards with gold outline

---

## 9. Component Hierarchy

### 9.1 App Shell

```
App
├── QueryClientProvider
├── TooltipProvider
├── BrowserRouter
│   ├── Routes (all lazy-loaded)
│   │   ├── / → Index
│   │   ├── /about → About
│   │   ├── /blog → Blog
│   │   ├── /blog/:slug → BlogPost
│   │   ├── /blog/acuna-torres-tracker → CardTrackerPage
│   │   ├── /data → Data (Market Intel)
│   │   ├── /privacy → Privacy
│   │   ├── /ebay/success → EbaySuccess
│   │   ├── /ebay/denied → EbayDenied
│   │   └── * → NotFound
│   └── CookieConsent (lazy, always rendered)
├── Toaster (shadcn)
└── Sonner
```

### 9.2 Home Page (`/`) Component Tree

```
Index
├── SEOHead (react-helmet-async)
├── VzlaNavbar (sticky, purple gradient)
├── <main.page-shell>
│   ├── VzlaHero (animated entrance, stability legend, signal explanations)
│   ├── VzlaIndexCards (sport index cards with sparklines)
│   ├── VzlaHowToMoney (educational section)
│   ├── VzlaTopDeals (featured deals)
│   ├── VzlaBudgetBar (budget input + knapsack trigger)
│   ├── VzlaSearchFilters (search, category, price, stability, DOM, signal filters + price mode toggle)
│   ├── VzlaAthleteGrid
│   │   ├── Sort controls (Default, Price ↓, Most Stable)
│   │   ├── AthleteCard[] (responsive grid)
│   │   │   ├── Wikipedia image or initials avatar
│   │   │   ├── Sport badge + league label
│   │   │   ├── Signal badges (Buy Low, Flip, Hot Seller)
│   │   │   ├── Price grid (Raw/Graded/Both columns)
│   │   │   ├── Index level with directional arrow
│   │   │   ├── Sparkline (7+ days required)
│   │   │   ├── Meta row (stability, sold price, DOM)
│   │   │   └── "Search on eBay →" CTA button
│   │   └── "Load More (N remaining)" button
│   └── VzlaFooter
└── VzlaEbayFooter (fixed bottom banner)
```

### 9.3 Market Intel Page (`/data`)

```
Data
├── VzlaNavbar
├── KPI Cards (total athletes, matched, avg price)
├── ModeToggle (Raw/Graded/Both) per section
├── Listed vs Sold Scatter Chart
├── Top 10 Price Gaps Bar Chart
├── VzlaSupplyDemand (supply/demand analysis)
├── Investment Signal Quadrants
│   └── 4 accordion sections with athlete lists
├── VzlaFooter
└── VzlaEbayFooter
```

---

## 10. Price Mode System

Three modes: **Raw**, **Graded**, **Both** (default: "both")

| Mode | Active price data | Card display | Filter/sort data |
|------|------------------|-------------|-----------------|
| Raw | `byName`/`byKey` from `ebay-avg.json` | Single price column | Raw averages |
| Graded | `gradedByName`/`gradedByKey` (merged listed+sold) | Single price column | Graded averages |
| Both | Both datasets | 2-column layout with independent signals | Raw for filtering |

**Gemrate gating:** Athletes with `gemrate !== "yes"` are forced to Raw mode even when global mode is Graded/Both.

**Graded data merging:** Since graded listed data is often sparse, graded sold data (`taguchiSold`) is used as fallback by mapping it to `avgListing` fields. Listed data overrides when available.

---

## 11. Athlete Image System

Images fetched dynamically from Wikipedia via `useAthleteImage` hook:
1. Query Wikipedia API for athlete page
2. Extract page thumbnail
3. Cache in component state
4. Fallback: colored initials avatar (gold text on secondary background)

---

## 12. Pagination

- Page size: 48 athletes
- "Load More" button shows remaining count
- Budget mode bypasses pagination (shows all matched cards)
- Filters reset visible count to PAGE_SIZE

---

## 13. SEO Implementation

### 13.1 index.html
- `<title>` with primary keyword
- Open Graph tags with feature image
- Twitter Card (summary_large_image)
- JSON-LD: WebSite + SearchAction, ItemList (top 5 athletes), FAQPage (3 questions)
- Canonical URL
- Preconnect to fonts.googleapis.com, fonts.gstatic.com, raw.githubusercontent.com
- Non-render-blocking font loading (preload + media="print" trick)
- Inline critical CSS for fast FCP (loading spinner)

### 13.2 Per-page SEO
- `SEOHead` component using `react-helmet-async`
- Unique title/description per route

### 13.3 robots.txt + sitemap.xml
- Both present in `/public/`

---

## 14. Accessibility

- Skip-to-content link (`.skip-link`)
- `focus-visible` outlines (gold)
- `prefers-reduced-motion` respected (disables all animations)
- ARIA roles: `role="main"`, `role="menubar"`, `role="menuitem"`, `role="search"`, `role="toolbar"`
- `aria-label` on navigation, search, sort controls
- `aria-expanded` and `aria-haspopup` on dropdown menus
- Semantic HTML: `<nav>`, `<main>`, `<article>`, `<section>`

---

## 15. External Links & Monetization

### 15.1 eBay Affiliate Links

All eBay links include EPN (eBay Partner Network) tracking parameters:
```
mkevt=1&mkcid=1&mkrid=706-53473-19255-0&campid=5339142305&toolid=10001
```

### 15.2 Social Links
- Instagram: `https://www.instagram.com/localheros_sportscards/`
- Twitter/X: `https://x.com/jdiegorceli1?s=21`
- Facebook Group: `https://www.facebook.com/groups/1591729798708721`

### 15.3 eBay Store
```
https://www.ebay.ca/str/localherossportscards?mkcid=1&mkrid=706-53473-19255-0&...
```

---

## 16. GitHub Actions Pipelines

| Workflow | Script | Schedule | Purpose |
|----------|--------|----------|---------|
| `ebay.yml` | `update-ebay-avg.js` | Daily 1 PM UTC | Raw active listings |
| `ebay-graded.yml` | `graded-update-ebay-avg.js` | Daily | Graded active listings |
| `ebay-sold.yml` | `sold-update-ebay-avg.js` | Every 3 hours | Raw sold (HTML scraping) |
| `ebay-graded-sold.yml` | `graded-sold-update-ebay-avg.js` | Every 2 hours | Graded sold (HTML scraping) |
| `gemrate.yml` | `fetch_gemrate.py` | Every 2 hours | PSA population data |
| `scp-prices.yml` | `fetch-scp-prices.js` | Monthly 1st | SportsCardsPro prices |
| `snapshot-history.yml` | `snapshot-athlete-history.js` | Daily | Per-athlete history snapshots |
| `market-data-snapshot.yml` | `snapshot-market-data.js` | Weekly Sunday | Unified data backup |
| `backup-render.yml` | `backup-to-render.js` | Weekly Sunday 1:30 PM UTC | Full data/ backup to Render PostgreSQL |
| `card-tracker.yml` | `card-tracker-update.js` | Varies | Card tracker blog data |
| `update.yml` | Various | Varies | Sync public/ copies |

### 16.1 Commit Pattern

All workflows use rebase-safe commits:
```bash
git fetch origin main
git rebase --autostash origin/main || (git rebase --abort && git pull --rebase origin main)
git push origin HEAD:main
```

### 16.2 Concurrency Groups

Each workflow uses a unique concurrency group to prevent parallel runs:
```yaml
concurrency:
  group: ebay-avg-main
  cancel-in-progress: true
```

---

## 17. OAuth Server (Render)

Express.js server for eBay OAuth:
- **Routes:** `GET /api/ebay/connect`, `GET /api/ebay/callback`
- **CORS:** Restricted to `FRONTEND_URL` (vzlasportselite.com)
- **Rate limiting:** 30 requests/minute per IP on `/api/ebay/*`
- **Middleware:** cookie-parser, cors, express-rate-limit
- **RuName:** `JD_Services_LTD-JDServic-twitte-timwunp`
- **Scopes:** basic access, sell.fulfillment.readonly, sell.inventory, sell.negotiation, sell.account

---

## 18. Critical Business Rules

1. **Never show graded data for athletes without `gemrate="yes"`** — filter at data layer, not UI
2. **Base prices are immutable** — stored in separate files, never overwritten
3. **History data uses 90-day rolling window** — older entries are pruned
4. **Index history is permanent** — no rolling window
5. **Sold scripts use HTML scraping** — no API quota impact
6. **Active listing scripts share one eBay Browse API quota** — careful scheduling
7. **Raw listing filter does NOT use API-level condition filter** — post-fetch filtering via `isGradedListing()` regex because too many raw listings lack `Condition Type` tags
8. **Graded listing filter uses API-level `Graded:{Yes}` + `Professional Grader:{PSA}`** — PSA-only
9. **Word-boundary regex (`\b`) must be used for blocklists** — substring matching causes false positives (e.g., "good" matching "Goodwin")
10. **`isGradedListing()` regex gap must be ≤3 chars** — wider gaps cause card numbers (#1, #2) to be mistakenly flagged as grades

---

## 19. File Structure (Key Directories)

```
src/
├── App.tsx                    # Root with lazy routes
├── main.tsx                   # ReactDOM.createRoot entry
├── index.css                  # Design tokens + utility classes
├── components/
│   ├── AthleteCard.tsx        # Main card component (complex)
│   ├── VzlaNavbar.tsx         # Sticky navigation
│   ├── VzlaHero.tsx           # Hero section
│   ├── VzlaIndexCards.tsx     # Sport index cards
│   ├── VzlaAthleteGrid.tsx    # Grid + sort controls
│   ├── VzlaSearchFilters.tsx  # Filter panel
│   ├── VzlaBudgetBar.tsx      # Knapsack input
│   ├── VzlaTopDeals.tsx       # Featured deals
│   ├── VzlaHowToMoney.tsx     # Educational content
│   ├── VzlaFooter.tsx         # Page footer
│   ├── VzlaEbayFooter.tsx     # Fixed bottom banner
│   ├── VzlaSupplyDemand.tsx   # Supply/demand chart
│   ├── VzlaStoreBanner.tsx    # Store promotion
│   ├── VzlaSideBanner.tsx     # Side ad banner
│   ├── Sparkline.tsx          # SVG mini-chart
│   ├── SEOHead.tsx            # Per-page meta tags
│   ├── SocialShare.tsx        # Share buttons
│   ├── CookieConsent.tsx      # GDPR banner
│   ├── BlogDataTable.tsx      # Blog data table
│   ├── NavLink.tsx            # Navigation link
│   └── ui/                    # shadcn components
├── hooks/
│   ├── useAthleteData.ts      # Main data orchestrator (CRITICAL)
│   ├── useAthleteImage.ts     # Wikipedia image fetcher
│   ├── useWikipediaImage.ts   # Wikipedia API wrapper
│   ├── useEpnPerformance.ts   # Hot seller detection
│   └── use-mobile.tsx         # Mobile breakpoint hook
├── lib/
│   ├── vzla-helpers.ts        # All pricing/filtering/sorting logic
│   ├── budget-knapsack.ts     # Knapsack optimizer
│   └── utils.ts               # cn() utility
├── data/
│   ├── athletes.ts            # Static athlete roster + TypeScript types
│   └── blog-types.ts          # Blog post types
├── pages/
│   ├── Index.tsx              # Home page
│   ├── Data.tsx               # Market Intel dashboard (1500+ lines)
│   ├── About.tsx
│   ├── Blog.tsx
│   ├── BlogPost.tsx
│   ├── CardTrackerPage.tsx
│   ├── privacy.tsx
│   └── NotFound.tsx

scripts/                       # Data pipeline scripts (Node.js + Python)
data/                          # Raw data files (JSON)
public/data/                   # Synced copies for fallback
.github/workflows/             # GitHub Actions schedules
server.js                      # OAuth Express server
docs/                          # Documentation
```

---

## 20. Recovery Checklist

### Phase 1: Foundation
- [ ] Scaffold React + Vite + TypeScript + Tailwind
- [ ] Install all dependencies (see package.json)
- [ ] Set up path alias `@ → ./src/`
- [ ] Copy design tokens to `index.css` (exact HSL values above)
- [ ] Configure `tailwind.config.ts` with custom colors, fonts, animations
- [ ] Set up shadcn/ui components

### Phase 2: Data Layer
- [ ] Create `src/data/athletes.ts` with types and fallback roster
- [ ] Create `src/lib/vzla-helpers.ts` with all pricing/filtering/sorting functions
- [ ] Create `src/lib/budget-knapsack.ts` with knapsack optimizer
- [ ] Create `src/hooks/useAthleteData.ts` with data fetching + state management
- [ ] Create `src/hooks/useAthleteImage.ts` for Wikipedia images

### Phase 3: Components
- [ ] Build VzlaNavbar (sticky, purple gradient, mobile drawer)
- [ ] Build VzlaHero (animated entrance, stability legend)
- [ ] Build AthleteCard (raw/graded/both modes, signals, sparklines)
- [ ] Build VzlaSearchFilters (6 filter types + price mode toggle)
- [ ] Build VzlaAthleteGrid (responsive grid + sort + pagination)
- [ ] Build VzlaBudgetBar (budget input + knapsack integration)
- [ ] Build VzlaIndexCards (sport-level index with sparklines)
- [ ] Build remaining components (footer, deals, how-to, etc.)

### Phase 4: Pages
- [ ] Home page (Index.tsx) — compose all components
- [ ] Market Intel page (Data.tsx) — scatter chart, bar charts, signal quadrants
- [ ] Blog system with slug-based routing
- [ ] About, Privacy, NotFound pages

### Phase 5: SEO & Performance
- [ ] Set up index.html with JSON-LD, OG tags, preconnects
- [ ] Add SEOHead component for per-page meta
- [ ] Add robots.txt and sitemap.xml
- [ ] Implement lazy loading for all routes and heavy components
- [ ] Add CookieConsent component

### Phase 6: Data Pipelines
- [ ] Restore all scripts in `scripts/`
- [ ] Restore all GitHub Actions workflows
- [ ] Set up GitHub Secrets (EBAY_CLIENT_ID, EBAY_CLIENT_SECRET, RENDER_DATABASE_URL)
- [ ] Restore data files from Render PostgreSQL backup (`snapshots` table) or re-run pipelines

### Phase 7: OAuth Server
- [ ] Deploy Express server to Render
- [ ] Configure environment variables (EBAY_*, FRONTEND_URL)
- [ ] Verify token refresh flow

---

## 21. Known Gotchas & Lessons Learned

1. **eBay Browse API does NOT reliably provide `itemCreationDate`** — use snapshot-based `observedDays` as fallback for DOM calculations
2. **Substring blocklists cause false positives** — always use word-boundary regex (`\b`)
3. **`isGradedListing()` with wide regex gaps catches card numbers** — keep gap ≤3 chars (`\s{0,3}`)
4. **"PSA ready" / "PSA worthy" are NOT graded cards** — exclude from graded detection
5. **Raw and graded base prices MUST be separate files** — shared file causes data contamination
6. **Graded listed data is often empty/sparse** — always merge with graded sold as fallback
7. **Accent normalization is critical** — "Acuña" vs "Acuna" must match everywhere
8. **GitHub raw URLs have ~5 min CDN cache** — data updates aren't instant
9. **The `_meta` key in eBay JSON must be skipped in all iterations** — it contains metadata, not athlete records
10. **Market Intel page (Data.tsx) is 1500+ lines** — consider splitting if rebuilding
