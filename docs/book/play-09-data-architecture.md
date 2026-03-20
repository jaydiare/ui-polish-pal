# Play 9: Data Architecture for Cloud-Native Systems

---

> *"Design data flows for resilience and observability. If you can't trace a number back to its source, you don't trust it — and neither should your users."*

---

## The Fallback Chain

Every number displayed on VZLA Sports Elite — every price, every stability score, every grading count — passes through a chain of sources before reaching the user's screen. The chain is designed so that if any link fails, the next one takes over transparently.

### Three Layers of Data Availability

```
Layer 1: GitHub Raw URLs (Primary)
  ↓ fetch fails?
Layer 2: public/data/ local copies (Fallback)
  ↓ build corrupted?
Layer 3: Render PostgreSQL snapshots (Disaster Recovery)
```

**Layer 1: GitHub Raw URLs.** The frontend fetches data from `https://raw.githubusercontent.com/<repo>/main/data/<file>.json`. This URL always serves the latest committed version — no redeploy needed. When a pipeline commits new data to `main`, the frontend picks it up on the next page load.

**Layer 2: Local Copies.** Every pipeline that writes to `data/` also copies key files to `public/data/`. These files are bundled into the frontend build. If GitHub's raw content delivery is unavailable (rare, but it happens during outages), the frontend falls back to these local copies. They're potentially stale (from the last build), but stale data is better than no data.

**Layer 3: PostgreSQL Backup.** Every Sunday, the backup workflow sends every JSON file to a Render PostgreSQL database as a JSONB row. Recovery is a single query:

```sql
SELECT data FROM snapshots
WHERE file_name = 'athletes.json'
ORDER BY snapshot_date DESC LIMIT 1;
```

This layer exists for true disaster recovery — if the Git repository is corrupted or deleted. It's not part of the normal data flow, but it's always there.

---

## The Price Fallback Chain

Within a single athlete's pricing data, another fallback chain operates at the field level:

```
taguchiListing → avgListing → trimmedListing → avg → average
```

The frontend doesn't blindly display one price field. It walks a priority chain:

1. **`taguchiListing`** — Taguchi winsorized mean (40% trim). The most robust statistical estimator, resistant to outliers.
2. **`avgListing`** — Standard arithmetic mean. Less robust, but always available if Taguchi computation fails.
3. **`trimmedListing`** — Simple trimmed mean. Available when the Taguchi algorithm didn't run.
4. **`avg` / `average`** — Legacy field names from earlier versions of the pipeline.

This chain exists because the platform evolved over time. Early pipelines computed simple averages. Later versions added statistical methods. Rather than breaking backward compatibility, new fields were added alongside old ones, and the frontend learned to prefer the best available.

---

## The Unified Weekly Snapshot

Six data sources feed the platform. Querying them all individually for every analytics view would be fragile and slow. Instead, a weekly consolidation job (`snapshot-market-data.js`) merges everything into a single file:

```javascript
// For each of 550+ athletes, merge data from 6 sources:
const row = {
  name: athlete.name,
  sport: athlete.sport,
  league: athlete.league,
  // eBay raw active listings
  rawPrice: ebayAvg[key]?.taguchiListing,
  rawCV: ebayAvg[key]?.marketStabilityCV,
  rawListings: ebayAvg[key]?.nListing,
  // eBay graded active listings
  gradedPrice: ebayGradedAvg[key]?.taguchiListing,
  // eBay sold prices
  soldPrice: ebaySoldAvg[key]?.taguchiSold,
  // PSA grading population
  psaPop: gemratePopMap[athlete.name],
  // Beckett grading population
  beckettPop: beckettPopMap[athlete.name],
  // Historical trend
  sparkline: last14Days,
};
```

The output (`data/vzla-athlete-market-data.json`) is the "wide table" that powers the analytics dashboard. One file, one fetch, all the data. This is the **consolidation pattern** — accepting eventual consistency (data is up to a week old) in exchange for simplicity and performance.

---

## Data Provenance: Tracking First Observation

When was the first time we saw data for a given athlete? This matters for calculating metrics like "days on market" and for understanding data coverage.

The platform tracks this via `data/athlete-first-seen.json`:

```json
{
  "Ronald Acuna Jr.": "2026-01-15",
  "Miguel Cabrera": "2026-01-15",
  "Jose Altuve": "2026-01-17"
}
```

When the daily snapshot script encounters an athlete with active listings for the first time, it records the date. On subsequent snapshots, it computes `observedDays = today - firstSeen`. If listings disappear (the athlete's cards are no longer on eBay), the firstSeen date is reset — so the counter restarts when new listings appear.

This is **data provenance** — metadata about the data itself. It answers not just "what is the price?" but "how long have we been tracking this price?"

---

## Statistical Robustness in Data Pipelines

Raw data from external sources is noisy. eBay listings include bulk lots priced at $0.99, rare vintage cards priced at $10,000, and everything in between. A simple average would be meaningless.

The platform uses the **Taguchi Winsorized Mean** — a statistical method borrowed from manufacturing quality control:

1. Sort all prices ascending
2. Trim 20% from each end (40% total) — removing extreme outliers
3. Replace trimmed values with the nearest surviving value (winsorization)
4. Compute the mean of the winsorized dataset

This produces a price estimate that represents what a "typical" card actually sells for, ignoring both the fire-sale listings and the speculative moonshots.

Alongside the mean, the pipeline computes the **Coefficient of Variation (CV)** — standard deviation divided by mean, expressed as a percentage. This is the stability signal:

| CV Range | Interpretation |
|----------|---------------|
| < 10% | Very stable — tight pricing consensus |
| 10-20% | Stable — normal market variation |
| 20-35% | Moderate — some price disagreement |
| > 35% | Unstable — wide price dispersion, use caution |

A price with CV > 35% is flagged as "Unstable" in the UI. This tells collectors: "yes, we computed an average, but the underlying data is noisy — don't trust this number as a precise market value."

---

## Key Takeaways

1. **Build fallback chains** — Primary, fallback, and disaster recovery layers for every data path
2. **Consolidation patterns reduce complexity** — One weekly snapshot file beats six real-time queries
3. **Track data provenance** — Know when you first observed each data point
4. **Statistical robustness isn't optional** — Raw averages of market data are misleading
5. **Backward-compatible field names** — Add new fields, don't rename old ones
6. **Eventual consistency is acceptable** — Weekly snapshots sacrifice freshness for reliability
