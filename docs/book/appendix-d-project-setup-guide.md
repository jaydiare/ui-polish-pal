# Appendix D: Project Setup Guide

> **The AI DevOps Playbook — Appendix D**  
> How to fork, configure, and run VZLA Sports Elite as your own learning platform.

---

## Prerequisites

- **GitHub account** (free tier is sufficient for ~2,000 Actions minutes/month)
- **Node.js 20+** installed locally (for running scripts manually)
- **Python 3.10+** installed locally (for Gemrate and analysis scripts)
- **Git** installed and configured

Optional:
- **eBay Developer Account** (for active listing data via Browse API)
- **Render Account** (for PostgreSQL backup — free tier)
- **Google AI Studio Account** (for Gemini API key — free tier)

---

## 1. Fork & Clone

```bash
# Fork via GitHub UI, then:
git clone https://github.com/YOUR_USERNAME/YOUR_FORK.git
cd YOUR_FORK

# Install frontend dependencies
npm install

# Start development server
npm run dev
```

The frontend should be running at `http://localhost:5173`.

---

## 2. Understanding the Project Structure

```
├── .github/workflows/     # 15+ GitHub Actions (automated pipelines)
├── data/                  # All JSON data files (Git-committed)
├── docs/                  # Platform documentation + book manuscript
│   ├── book/              # The AI DevOps Playbook manuscript
│   ├── PLATFORM-GUIDE.md  # Central technical reference
│   ├── DATA-PIPELINE-AUDIT.md  # Pipeline audit log
│   └── DISASTER-RECOVERY.md    # Rebuild blueprint
├── public/data/           # Frontend-accessible data copies
├── scripts/               # Data collection & processing scripts
├── src/                   # React frontend source
│   ├── components/        # UI components
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Utility functions & algorithms
│   ├── pages/             # Route pages
│   └── data/              # Static data & types
├── server.js              # Express OAuth server (for Render)
└── package.json           # Dependencies & scripts
```

---

## 3. Running Without API Keys

The platform is designed to work without any API keys out of the box:

- **Frontend:** Displays data from committed JSON files in `public/data/`
- **Data files:** The fork includes all existing data — you can explore the UI immediately
- **Scripts:** Most scripts will fail without API keys, but the data they've already generated persists

**What works without keys:**
- Full frontend with all athlete cards, charts, and filters
- Budget optimizer (uses committed price data)
- Market Intel dashboard
- Sparklines and history (uses committed history data)

**What requires keys:**
- eBay active listing updates (`EBAY_CLIENT_ID`, `EBAY_CLIENT_SECRET`)
- eBay sold listing scraping (no keys needed, but runs in GitHub Actions)
- Gemrate scraping (no keys needed, runs in Actions)
- SCP price updates (`SPORTSCARDSPRO`)
- AI market analysis (`GEMINI_API_KEY`)
- Database backup (`RENDER_DATABASE_URL`)

---

## 4. Configuring GitHub Secrets

Go to your fork's **Settings → Secrets and variables → Actions** and add:

### Minimum Viable Setup (eBay Data Only)

| Secret | How to Get It |
|--------|--------------|
| `EBAY_CLIENT_ID` | Create an app at https://developer.ebay.com → Production Keys |
| `EBAY_CLIENT_SECRET` | Same eBay developer app → Production Keys |

### Full Setup

| Secret | How to Get It |
|--------|--------------|
| `EBAY_CLIENT_ID` | eBay Developer Program → Create App → Production Keys |
| `EBAY_CLIENT_SECRET` | Same as above |
| `RENDER_DATABASE_URL` | Create PostgreSQL on https://render.com → Connection String |
| `GEMINI_API_KEY` | https://ai.google.dev → Get API Key (free) |
| `SPORTSCARDSPRO` | Contact SportsCardsPro for API access |
| `SPORTSDB_KEY` | https://www.thesportsdb.com → API Key |

---

## 5. Running Scripts Locally

### eBay Active Listings (Requires API Keys)

```bash
# Set environment variables
export EBAY_CLIENT_ID="your-client-id"
export EBAY_CLIENT_SECRET="your-client-secret"

# Run for a single athlete (testing)
node scripts/update-ebay-avg.js --only "Ronald Acuña Jr."

# Run full batch
node scripts/update-ebay-avg.js
```

### eBay Sold Listings (No API Keys Required)

```bash
# Run for a single athlete
node scripts/sold-update-ebay-avg.js --only "Ronald Acuña Jr."

# Run batch (10 athletes from current cursor)
node scripts/sold-update-ebay-avg.js
```

### Gemrate PSA Data (No API Keys Required)

```bash
# Install Python dependencies
pip install requests beautifulsoup4

# Run for single athlete
python scripts/fetch_gemrate.py --only "Ronald Acuña Jr."

# Run batch
python scripts/fetch_gemrate.py
```

### AI Market Analysis (Requires Gemini Key)

```bash
export GEMINI_API_KEY="your-gemini-key"
python scripts/bi-weekly-analysis.py

# Stats-only mode (no AI key needed)
SKIP_LLM=1 python scripts/bi-weekly-analysis.py
```

### Database Backup (Requires Render)

```bash
export RENDER_DATABASE_URL="postgresql://user:pass@host/db"
node scripts/backup-to-render.js
```

---

## 6. Enabling GitHub Actions

After forking, GitHub Actions are **disabled by default**. To enable:

1. Go to your fork → **Actions** tab
2. Click **"I understand my workflows, go ahead and enable them"**
3. Workflows will start running on their configured schedules

### Recommended: Start with One Workflow

Don't enable all 15 workflows at once. Start with:

1. **`snapshot-history.yml`** — Safe, read-only aggregation
2. **`ebay-sold.yml`** — HTML scraping, no API keys needed
3. **`ebay.yml`** — Once you have eBay API keys configured

### Manual Trigger for Testing

Every workflow supports `workflow_dispatch`. To test manually:

1. Go to **Actions** → Select a workflow
2. Click **"Run workflow"**
3. Optionally enter a single athlete name in the input field
4. Click **"Run workflow"** (green button)

---

## 7. Customizing the Athlete Roster

### Adding Athletes

Edit `data/athletes.json`:

```json
{
  "name": "New Athlete Name",
  "sport": "Baseball",
  "league": "MLB",
  "team": "Team Name",
  "country": "Venezuela"
}
```

Then run the update workflow or commit directly.

### Removing Athletes

Remove the entry from `data/athletes.json`. The athlete's data will remain in history files but won't be updated.

### Changing Sports Focus

The platform can track athletes from any country or sport. Modify:
1. `scripts/fetch_all_vzla.py` — Change API queries
2. `src/components/VzlaSearchFilters.tsx` — Update sport filter options
3. `src/components/VzlaIndexCards.tsx` — Update index card sports

---

## 8. Deploying Your Fork

### Option A: Lovable (Recommended)

1. Import your fork into [Lovable](https://lovable.dev)
2. Automatic builds on every push
3. Preview URLs for testing
4. One-click publish

### Option B: Vercel / Netlify

```bash
# Build the production bundle
npm run build

# Output is in dist/ — deploy to any static host
```

### Option C: GitHub Pages

Add to your fork's settings:
1. **Settings → Pages → Source:** GitHub Actions
2. Create a deployment workflow (or use the Vite GitHub Pages template)

---

## 9. Setting Up the OAuth Server (Optional)

Only needed if you want eBay store automation (Best Offer, Send Offers):

1. Create a Render Web Service
2. Deploy `server.js` 
3. Set environment variables:
   - `EBAY_CLIENT_ID`
   - `EBAY_CLIENT_SECRET`
   - `EBAY_REDIRECT_URI` (your Render URL + `/ebay/callback`)
   - `FRONTEND_URL` (your deployed frontend URL)
4. Configure eBay Developer App with your Render callback URL as RuName

---

## 10. Learning Path

Suggested order for exploring the codebase:

| Step | What to Study | Book Play |
|------|---------------|-----------|
| 1 | Read `docs/PLATFORM-GUIDE.md` | Play 3 |
| 2 | Run `npm run dev` and explore the UI | Play 15 |
| 3 | Read `update-ebay-avg.js` line by line | Play 4 |
| 4 | Understand cron schedules in `.github/workflows/` | Play 5 |
| 5 | Read `sold-update-ebay-avg.js` for resilience patterns | Play 6 |
| 6 | Map all 15 workflows and their data flows | Play 7 |
| 7 | Study `src/lib/budget-knapsack.ts` for the optimizer | Play 9 |
| 8 | Read `docs/DISASTER-RECOVERY.md` | Play 13 |
| 9 | Run a manual workflow via `workflow_dispatch` | Play 4 |
| 10 | Make a change, commit, and watch it deploy | Play 8 |

---

## 11. Troubleshooting

| Problem | Solution |
|---------|----------|
| `npm run dev` fails | Run `npm install` first |
| Workflows not running | Enable Actions in fork settings |
| eBay API returns 401 | Check `EBAY_CLIENT_ID` and `EBAY_CLIENT_SECRET` in GitHub Secrets |
| Sold scraper returns 0 results | eBay may be blocking — try manual run with `--only` flag |
| Gemrate returns empty data | Check if Gemrate.com is up; try with `--only` flag |
| Progress stuck | Delete the relevant `*-progress.json` file and re-run |
| "No changes to commit" | Normal — data hasn't changed since last run |
| Build fails on Lovable | Check console for TypeScript errors |

---

## 12. Contributing

If you've forked and improved the platform:

1. Create a feature branch
2. Make your changes
3. Update relevant documentation (`PLATFORM-GUIDE.md`, script headers)
4. Submit a pull request with a clear description

Areas where contributions are especially welcome:
- New data source integrations
- UI improvements and accessibility
- Statistical method refinements
- Documentation corrections

---

*This guide assumes the repository structure as of March 2026. If you're reading this later, check the README.md for any updated setup instructions.*
