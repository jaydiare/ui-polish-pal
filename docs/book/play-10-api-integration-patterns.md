# Play 10: API Integration Patterns

---

> *"External APIs are unreliable. They change without warning, rate-limit without mercy, and return wrong data without errors. Design accordingly."*

---

## Six APIs, Six Strategies

VZLA Sports Elite integrates with six external data sources. Each required a different strategy for authentication, rate limiting, error handling, and graceful degradation.

| Source | Method | Auth | Rate Strategy | Fallback |
|--------|--------|------|---------------|----------|
| eBay Browse API | REST | OAuth2 client credentials | ~5-day polling cycle | Cached `ebay-avg.json` |
| eBay Sold Listings | HTML scraping | None | 10 athletes/3h, rotating UAs | Cached `ebay-sold-avg.json` |
| Gemrate.com (PSA) | HTML scraping | None | 20 athletes/4h, random delays | Cached `gemrate.json` |
| Gemrate.com (Beckett) | HTML scraping | None | 20 athletes/4h, staggered | Cached `gemrate_beckett.json` |
| Gemrate.com (SGC) | HTML scraping | None | 20 athletes/4h, staggered | Cached `gemrate_sgc.json` |
| SportsCardsPro | REST API | Token in URL | 500ms delay, 3s pause every 50 | Cached `scp-prices.json` |
| Google Gemini | REST | API key | 1 call per bi-weekly run | Statistical-only report |
| Wikipedia Images | REST | None | Per-request, cached results | Initials avatar |

---

## Pattern 1: API Quota Management (eBay Browse API)

The eBay Browse API is the platform's primary data source for active listing prices. It provides structured, filtered, paginated results — but with a production quota that limits daily requests.

The solution: **don't query daily.**

```yaml
# Run every ~5 days instead of daily
- cron: "0 13 */5 * *"
```

By spacing requests to every 5 days, the platform makes approximately 7 API calls per month — well within quota. The tradeoff (prices are up to 5 days stale) is acceptable because active listing prices change slowly. A card listed at $15 today will probably still be listed at $15 in three days.

### The Condition Filter Trap

A critical lesson from the eBay integration: **APIs can silently return wrong data.**

The Browse API supports "aspect filters" to narrow results by condition (Graded, Ungraded, etc.). But there's a catch — documented nowhere in eBay's API reference:

```
❌ Graded:{Yes},Professional Grader:{PSA}
✅ categoryId:261328,Graded:{Yes},Professional Grader:{PSA}
```

Without the `categoryId:` prefix, eBay silently ignores all aspect filters and returns unfiltered results. The API returns HTTP 200, the response looks valid, but the data is contaminated. You get graded cards mixed with raw cards, damaged cards mixed with mint condition.

This bug was discovered through data quality monitoring (Play 11) and documented in the audit's bug registry to prevent regression.

---

## Pattern 2: HTML Scraping When APIs Fall Short (eBay Sold)

eBay's API doesn't expose sold listing data in its public Browse API. But sold prices are the most valuable signal — they represent actual transactions, not aspirational asking prices.

The solution: HTML scraping of eBay's public search results pages.

```javascript
// Build the search URL with sold listings filter
const url = `https://www.ebay.com/sch/i.html?_nkw=${encodeQuery}`
  + `&LH_Sold=1&LH_Complete=1&rt=nc`
  + `&Condition%20Type=Ungraded`;
```

### Anti-Blocking Strategy

eBay actively detects and blocks automated scrapers. The platform uses multiple techniques:

**Rotating User-Agents** — Each request uses a randomly selected browser User-Agent string from a pool of 5+ realistic configurations:

```javascript
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/124.0.0.0",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Firefox/125.0",
  // ...
];
```

**Exponential Backoff** — Failed requests retry up to 4 times with increasing delays:

```javascript
const backoff = Math.min(30000, 2000 * Math.pow(2, attempt));
const jitter = Math.random() * 2000;
await sleep(backoff + jitter);
```

**CAPTCHA Detection** — If eBay returns a CAPTCHA page instead of search results, the scraper detects it and backs off rather than hammering the endpoint:

```javascript
if (html.includes('captcha') || html.includes('robot')) {
  console.warn('⚠️ CAPTCHA detected, backing off');
  await sleep(60000);
  continue;
}
```

**Batch Size Limiting** — Only 10 athletes per workflow run. This keeps sessions short and request patterns less suspicious.

### Three-Tier Extraction

eBay's HTML structure is inconsistent. The scraper uses a fallback extraction chain:

1. **CSS selectors** — Standard `.s-item` class selectors for listing elements
2. **Data attributes** — `[data-viewport]` fallback when CSS classes change
3. **Script tags** — Embedded JSON-LD data as the last resort

If all three fail, the athlete is skipped and retried in the next batch.

---

## Pattern 3: Polite Scraping (Gemrate.com)

Gemrate.com provides PSA grading population data — how many cards of each athlete have been professionally graded. It's a smaller service with fewer resources than eBay, so politeness is paramount.

```python
DELAY_MIN = 3   # Minimum seconds between requests
DELAY_MAX = 6   # Maximum seconds between requests
BATCH_SIZE = 20  # Athletes per workflow run
MAX_RETRIES = 2
COOLDOWN_DAYS = 30  # Don't re-scrape recently successful athletes
```

**Randomized Delays** — Instead of a fixed delay, each request waits a random interval between 3 and 6 seconds. Fixed intervals are a scraping fingerprint; random intervals mimic human behavior.

**Cooldown Tracking** — Once an athlete's grading data is successfully scraped, they're placed on a 30-day cooldown. The `gemrate-cooldown.json` file tracks when each athlete was last scraped. Athletes whose data was recently collected are skipped, focusing each batch on athletes with stale or missing data.

**Session Persistence** — The scraper maintains HTTP session cookies across requests within a batch. This mimics a user browsing multiple pages, rather than making disconnected anonymous requests.

---

## Pattern 4: Rate-Limited API Consumption (SportsCardsPro)

SportsCardsPro provides market prices via a JSON API. The rate limiting is straightforward but strict:

```javascript
// 500ms between individual requests
await sleep(500);

// 3-second pause every 50 athletes
if (count % 50 === 0) {
  await sleep(3000);
}
```

This is the simplest pattern: fixed delays that stay well below the service's limits. No rotating User-Agents, no exponential backoff — just measured, predictable consumption.

---

## Pattern 5: Free-Tier Constraint Management (Google Gemini)

The bi-weekly analysis pipeline calls Google Gemini to generate narrative market reports. The free tier has tight constraints: limited requests per minute, limited tokens per request.

```python
# Truncate input data to fit within token limits
prompt_data = json.dumps(stats_payload)[:8000]

# Single call with timeout and retry
for attempt in range(3):
    try:
        response = requests.post(GEMINI_URL, json=payload, timeout=60)
        if response.status_code == 429:
            time.sleep(60)  # Rate limited — wait a full minute
            continue
        break
    except requests.Timeout:
        time.sleep(30)
```

**Truncated JSON recovery** — If the AI returns a response with truncated JSON (it hits its output token limit mid-response), the script attempts to repair the JSON by closing open brackets and braces. Imperfect, but better than losing the entire report.

**Fallback to statistics-only** — If the Gemini call fails entirely, the analysis pipeline still produces a report containing the statistical computations (top movers, anomalies, market summary) without the AI-generated narrative. The `SKIP_LLM=1` environment variable forces this mode for testing.

---

## Pattern 6: Dynamic Content with Graceful Degradation (Wikipedia)

Athlete headshot images come from Wikipedia's API. The lookup chain:

1. Search Wikipedia for the athlete's name
2. Try the full name, then last name only, then name with sport context
3. Extract the page's main image via the API
4. Cache the result to avoid repeated lookups

If Wikipedia has no image (many Venezuelan athletes have sparse Wikipedia pages), the frontend falls back to styled initials — a colored circle with the athlete's first and last initial. No broken image icons, no empty spaces.

---

## The Universal Pattern

Every API integration in this platform follows the same meta-pattern:

```
1. Try the primary source
2. If it fails, retry with backoff
3. If retries exhaust, use cached data
4. If no cache exists, degrade gracefully (show what you have)
5. Log the failure for observability
6. Document the failure mode in the audit
```

No external dependency is trusted. No API response is taken at face value. Every integration has a plan for when things go wrong — because they will.

---

## Key Takeaways

1. **APIs lie** — HTTP 200 doesn't mean correct data; validate results, not just status codes
2. **Match your polling rate to your quota** — Don't call daily if weekly is sufficient
3. **Rotate User-Agents and randomize delays** — Fixed patterns are scraping fingerprints
4. **Batch and checkpoint** — Process in small batches with progress tracking
5. **Cooldown tracking prevents waste** — Don't re-scrape what you already have
6. **Always have a fallback** — Cached data, statistical-only mode, styled initials
7. **Document every API quirk** — The next developer (human or AI) needs to know about `categoryId:` prefixes
