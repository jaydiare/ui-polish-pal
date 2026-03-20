# Play 11: Data Quality as Monitoring

---

> *"In data platforms, bad data IS downtime. Your users won't see a 500 error — they'll see a wrong price and make a bad decision. That's worse."*

---

## The Silent Failure Problem

Traditional monitoring watches for crashes. Servers go down, error rates spike, latency increases — alerts fire, someone investigates, the system is restored. The failure mode is visible: something broke and stopped working.

Data platforms have a more insidious failure mode: **the system continues working perfectly while producing wrong results.**

Consider this scenario: eBay changes the HTML structure of their sold listings page. The scraper runs on schedule, fetches the page successfully, parses it without errors, computes averages, commits the results, and pushes to `main`. Every step succeeds. Every health check passes. But the prices are wrong — the parser extracted shipping costs instead of sale prices, or grabbed promoted listing prices instead of actual sold prices.

No alert fires. No error appears in logs. The wrong data flows downstream into historical snapshots, weekly consolidations, and user-facing displays. By the time someone notices, days or weeks of corrupted data may have been committed.

Data quality monitoring treats data itself as the signal.

---

## Coefficient of Variation as an Alarm

The primary data quality metric is the **Coefficient of Variation (CV)** — standard deviation divided by mean, expressed as a percentage. Every price average in the system is accompanied by its CV.

```javascript
const cv = (stdDev / mean) * 100;

// Classification
if (cv <= 10)  return "Very Stable";
if (cv <= 20)  return "Stable";
if (cv <= 35)  return "Moderate";
return "Unstable";  // CV > 35%
```

The CV is a canary. When everything is working correctly, most athletes have CVs in the 15-30% range — normal market variation for sports cards. When something goes wrong with data collection, CVs spike:

- **CV > 50%** — Possible data contamination. Bulk lots (priced at $0.99 for 50 cards) or rare vintage cards ($10,000) leaked through the filters.
- **CV > 100%** — Almost certainly a filter failure. The data contains items from fundamentally different price categories.
- **CV suddenly drops to 0%** — Only one listing was found. The average is technically correct but statistically meaningless.

The bi-weekly analysis pipeline uses CV as an anomaly detection signal:

```python
# Flag athletes with suspicious data quality
if cv > 100 or abs(price_change_pct) > 50:
    anomalies.append({
        "athlete": name,
        "cv": cv,
        "price_change": price_change_pct,
        "flag": "ANOMALY"
    })
```

---

## Filter Layers: Defense in Depth

Wrong data enters through filters that fail. The platform uses multiple independent filter layers — if one fails, the others still catch most contamination.

### Layer 1: API-Level Filters

```javascript
// eBay Browse API aspect filters (graded listings only)
filter: "categoryId:261328,Graded:{Yes},Professional Grader:{PSA}"
```

These are the coarsest filters — they reduce the result set at the API level. But as documented in the audit (§8.12), they can silently fail if the `categoryId:` prefix is missing.

### Layer 2: Title-Based Detection

```javascript
function isGradedListing(title) {
  // Detect grading company mentions with tight gap regex
  return /\b(PSA|BGS|SGC|BVG|BCCG|HGA|KSA|MNT|CGC)\s{0,3}\d/i.test(title)
    || /\bgraded\b/i.test(title)
    || /\b(gem\s*mint|mint\s*\d)\b/i.test(title);
}
```

The `{0,3}` gap between grader and grade number is critical. An earlier version used `{0,10}`, which caused false positives: titles like "PSA cards collection lot 5 items" matched because "PSA" and "5" were within 10 characters. Tightening to `{0,3}` fixed this — "PSA 10" matches but "PSA cards lot 5" doesn't.

### Layer 3: Junk Title Exclusion

```javascript
function isJunkTitle(title) {
  const junkPatterns = [
    /\bu-pick\b/i, /\blote\b/i, /\bbase cards from\b/i,
    /\bdigital\b/i, /\breprint\b/i, /\bcustom\b/i,
    /\bsticker\b/i, /\bmagnet\b/i, /\bposter\b/i
  ];
  return junkPatterns.some(p => p.test(title));
}
```

Domain-specific knowledge encoded as filters. "U-pick" means a bulk lot where the buyer picks one card. "Lote" is Spanish for lot. "Base cards from" indicates a set break. These patterns are specific to sports card eBay listings and were discovered through data quality investigation over months of operation.

Word-boundary matching (`\b`) is crucial. Without it, "reprint" would match "Sprint" and "digital" would match "digitally-enhanced." These are the kinds of bugs that produce plausible-looking but wrong data.

### Layer 4: Condition Blocklist

```javascript
const CONDITION_BLOCKLIST = [
  /\bpoor\b/i, /\bdamaged\b/i, /\btrimmed\b/i,
  /\baltered\b/i, /\bmiscut\b/i, /\bcreased\b/i
];
```

A card in "Poor" condition might sell for $0.50 while the same card in "Near Mint" sells for $15. Including poor-condition cards would contaminate the average. Each term uses word-boundary matching to prevent false positives.

---

## The Silent Failure Documented

The most dangerous bug the platform encountered was eBay's silent filter failure (documented as §8.12 in the audit):

> When querying the Browse API with aspect filters like `Graded:{Yes}`, the API requires a `categoryId:` prefix. Without it, the API returns HTTP 200 with valid-looking results — but the filters are completely ignored.

This is the canonical example of a silent failure:
- ✅ HTTP 200 response
- ✅ Valid JSON returned
- ✅ Listings with prices
- ❌ Filters not applied — graded and raw cards mixed together

Detection came through data quality monitoring: the CV for certain athletes spiked above 100%, which triggered investigation. The root cause was traced to a query format change that accidentally dropped the `categoryId:` prefix.

---

## Data Quality Signals in the UI

The platform surfaces data quality metrics directly to users, transforming monitoring data into user-facing features:

- **Stability badges** — Each athlete card shows "Stable," "Moderate," or "Unstable" based on CV
- **Listing count display** — Shows how many listings went into the average (n=3 is less reliable than n=30)
- **Price gap visualization** — Scatter plot on the data page shows the spread between listed and sold prices, making data quality visible at a glance

Users don't see "CV: 42.7%" — they see "Unstable" with a yellow badge. The technical metric is translated into an actionable signal.

---

## Key Takeaways

1. **Bad data is worse than no data** — At least "no data" is visibly wrong
2. **CV is your canary** — Monitor coefficient of variation to detect data contamination
3. **Defense in depth** — Multiple independent filter layers, each catching what the others miss
4. **Silent failures are the most dangerous** — APIs that return 200 with wrong data
5. **Word-boundary matching prevents false positives** — Always `\b` in data filters
6. **Surface quality metrics to users** — "Unstable" badges build trust through transparency
7. **Document every data bug** — The bug registry prevents regressions across sessions
