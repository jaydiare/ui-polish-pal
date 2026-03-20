# Appendix C: API Integration Cookbook

> **The AI DevOps Playbook — Appendix C**  
> Practical patterns, code recipes, and troubleshooting guides for every external API and data source.

---

## 1. eBay Browse API (Active Listings)

### Authentication: OAuth 2.0 Client Credentials

```javascript
// Token request — client_credentials grant (app-level, no user consent)
const tokenResponse = await fetch("https://api.ebay.com/identity/v1/oauth2/token", {
  method: "POST",
  headers: {
    "Content-Type": "application/x-www-form-urlencoded",
    Authorization: `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64")}`,
  },
  body: "grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope",
});
```

**Token lifetime:** 2 hours. Fetch a new token at the start of each workflow run.

### Search Endpoint

```javascript
const url = `https://api.ebay.com/buy/browse/v1/item_summary/search`
  + `?q=${encodeURIComponent(athleteName + " card")}`
  + `&category_ids=261328`        // Sports Trading Cards
  + `&filter=deliveryCountry:US`
  + `&sort=price`
  + `&limit=200`;
```

### Aspect Filters (Graded)

```javascript
// CRITICAL: categoryId: prefix is MANDATORY
// Without it, eBay silently ignores all aspect filters
const aspectFilter = `categoryId:261328,Graded:{Yes},Professional Grader:{PSA}`;
const url = baseUrl + `&aspect_filter=${encodeURIComponent(aspectFilter)}`;
```

**Known bug:** If you omit `categoryId:261328` from the aspect filter string, eBay returns unfiltered results without any error. This was the root cause of graded/raw data contamination (see DATA-PIPELINE-AUDIT.md §8.17).

### Post-Fetch Filtering Pipeline

```javascript
function isValidListing(item, athleteName) {
  const title = item.title.toLowerCase();
  
  // 1. All name parts must appear in title
  const nameParts = athleteName.toLowerCase().split(" ");
  if (!nameParts.every(part => title.includes(part))) return false;
  
  // 2. Exclude junk listings
  const JUNK_WORDS = ["u-pick", "lote", "digital", "reprint", "base cards from"];
  if (JUNK_WORDS.some(junk => title.includes(junk))) return false;
  
  // 3. Graded detection (for raw pipeline — exclude graded cards)
  const GRADED_REGEX = /\b(PSA|BGS|SGC|BVG|KSA|HGA|CSG|ISA|GMA|MNT|TAG|RCG)\s{0,3}\d/i;
  if (GRADED_REGEX.test(title)) return false;
  
  // 4. Condition blocklist
  const BAD_CONDITIONS = ["damaged", "poor", "fair", "creases", "water damage"];
  if (BAD_CONDITIONS.some(cond => title.includes(cond))) return false;
  
  return true;
}
```

### Quota Management

- **Daily limit:** 5,000 calls
- **Per run:** ~1,138 calls (553 athletes × 1 search + 1 token call)
- **Strategy:** Run every ~5 days (cron `*/5` day-of-month) = ~7 runs/month
- **Single marketplace:** Graded queries use `EBAY_US` only (removed `EBAY_CA` to halve calls)

---

## 2. eBay HTML Scraping (Sold Listings)

### Why Scrape Instead of API?

The eBay Finding API for sold listings requires different OAuth scopes (`sell.fulfillment.readonly`), has stricter rate limits, and returns less pricing detail than the HTML pages. HTML scraping has **zero API quota impact**.

### URL Construction

```javascript
const searchUrl = `https://www.ebay.com/sch/i.html`
  + `?_nkw=${encodeURIComponent(athleteName + " card")}`
  + `&_sacat=261328`           // Sports Trading Cards
  + `&LH_Sold=1&LH_Complete=1` // Sold & Completed only
  + `&_sop=13`                 // Sort: newest first
  + `&rt=nc`                   // No redirect
  + `&LH_PrefLoc=1`;           // US only
```

### Sport-Specific League Filters

```javascript
// Prevent cross-sport contamination
const LEAGUE_ASPECTS = {
  Baseball: "&League=Major%20League%20%28MLB%29",
  Soccer:   "&League=Major%20League%20Soccer%20%28MLS%29",
  Basketball: "&League=National%20Basketball%20Association%20%28NBA%29",
};
```

### 3-Tier HTML Extraction

```javascript
const $ = cheerio.load(html);

// Tier 1: Standard item selectors
let items = $(".s-item").not(".s-item__pl-on-bottom");

// Tier 2: Data-viewport rendering (eBay A/B tests)
if (items.length === 0) {
  items = $("[data-viewport]").find(".s-item");
}

// Tier 3: Server-rendered JSON (hydration data)
if (items.length === 0) {
  const scriptTag = $("script").filter((i, el) =>
    $(el).html()?.includes("__NEXT_DATA__")
  );
  // Parse JSON from script tag...
}
```

### Price Extraction

```javascript
function extractPrice(item) {
  const priceText = item.find(".s-item__price").first().text();
  
  // Handle range prices: "$3.00 to $5.00" → take lower bound
  const match = priceText.match(/\$[\d,.]+/);
  if (!match) return null;
  
  return parseFloat(match[0].replace(/[$,]/g, ""));
}
```

### Anti-Blocking Measures

```javascript
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  // 5+ variants
];

// Randomized delay: 4–6 seconds between requests
const delay = 4000 + Math.random() * 2000;
await sleep(delay);
```

### Retry with Exponential Backoff

```javascript
async function fetchWithRetry(url, maxRetries = 4) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)] },
      });
      if (response.status === 503 || response.status === 429) {
        const backoff = 4000 * Math.pow(2, attempt);
        console.log(`Rate limited — backing off ${backoff}ms (attempt ${attempt + 1})`);
        await sleep(backoff);
        continue;
      }
      return response;
    } catch (err) {
      if (attempt === maxRetries - 1) throw err;
      await sleep(4000 * Math.pow(2, attempt));
    }
  }
}
```

---

## 3. Gemrate.com (PSA Population Data)

### Request Pattern

```python
import requests, random, time

session = requests.Session()
BASE_URL = "https://gemrate.com/psa"

def fetch_gemrate(athlete_name):
    url = f"{BASE_URL}/{athlete_name.lower().replace(' ', '-')}"
    session.headers.update({
        "User-Agent": random.choice(USER_AGENTS)
    })
    
    response = session.get(url, timeout=30)
    time.sleep(random.uniform(3, 7))  # Human-like delay
    return response.text
```

### Multi-Layer Parsing

```python
# Layer 1: Regex for structured PSA data
psa_match = re.search(r'Total\s+PSA[^:]*:\s*([\d,]+)', html)

# Layer 2: Text fallback — scan for grade counts
grades = {}
for grade in range(1, 11):
    pattern = rf'PSA\s+{grade}[^:]*:\s*([\d,]+)'
    match = re.search(pattern, html)
    if match:
        grades[grade] = int(match.group(1).replace(',', ''))
```

### Cooldown System

```python
# Prevent re-scraping recently fetched athletes
cooldown = load_json("data/gemrate-cooldown.json")
if athlete_name in cooldown:
    last_fetched = datetime.fromisoformat(cooldown[athlete_name])
    if (datetime.now() - last_fetched).days < 7:
        continue  # Skip — data is fresh enough
```

---

## 4. SportsCardsPro API

### Query Pattern

```javascript
// Two queries per athlete: Raw and PSA
const queries = [
  `${athleteName} Raw`,
  `${athleteName} PSA`,
];

for (const query of queries) {
  const url = `https://www.sportscardspro.com/api/products?q=${encodeURIComponent(query)}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${SPORTSCARDSPRO_KEY}` },
  });
  
  await sleep(500);  // 500ms between requests
  if (processedCount % 50 === 0) await sleep(3000);  // 3s pause every 50
}
```

### Price Extraction

```javascript
// SCP stores prices in cents
const rawPrice = product["loose-price"];   // Ungraded card
const gradedPrice = product["new-price"] || product["cib-price"];  // Graded card

// Convert to USD
const priceUSD = rawPrice / 100;
```

### Taguchi Averaging Across Products

When multiple SCP products match a query, the platform applies the same Taguchi trimmed mean (but with 20% total trim instead of 40%) to produce a single representative price.

---

## 5. Wikipedia API (Athlete Images)

### Thumbnail Endpoint

```javascript
const wikiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(athleteName)}`;
const response = await fetch(wikiUrl);
const data = await response.json();

const imageUrl = data?.thumbnail?.source;  // Direct image URL
```

### Multi-Layer Name Matching

```javascript
// Layer 1: Full name
let result = await fetchWikipedia("Ronald Acuña Jr.");

// Layer 2: Without suffixes
if (!result) result = await fetchWikipedia("Ronald Acuña");

// Layer 3: ASCII transliteration
if (!result) result = await fetchWikipedia("Ronald Acuna Jr");

// Layer 4: Manual overrides (HEADSHOT-FIXES.md)
if (!result) result = MANUAL_OVERRIDES[athleteName];
```

---

## 6. Google Gemini API (AI Analysis)

### Request Pattern

```python
import google.generativeai as genai

genai.configure(api_key=os.environ["GEMINI_API_KEY"])
model = genai.GenerativeModel("gemini-2.5-flash")

prompt = f"""
Analyze this sports card market data and provide:
1. A headline (~10 words)
2. A summary (~50 words)
3. Three key insights
4. A 2-player watchlist
5. Risk alerts

Data: {json.dumps(market_stats, indent=2)[:8000]}
"""

response = model.generate_content(prompt)
```

### Free-Tier Constraints & Mitigations

```python
# Rate limit retry (free tier: 15 requests/minute)
try:
    response = model.generate_content(prompt)
except Exception as e:
    if "429" in str(e) or "quota" in str(e).lower():
        print("Rate limited — waiting 60s...")
        time.sleep(60)
        response = model.generate_content(prompt)

# Truncated JSON recovery
try:
    result = json.loads(response.text)
except json.JSONDecodeError:
    # Try to recover truncated JSON by closing brackets
    text = response.text.rstrip()
    for closer in ["}", "]", '"}']:
        try:
            result = json.loads(text + closer)
            break
        except:
            continue
```

### Graceful Degradation

```python
# If GEMINI_API_KEY not set or SKIP_LLM=1, run stats-only
if not os.environ.get("GEMINI_API_KEY") or os.environ.get("SKIP_LLM") == "1":
    output = {"stats": market_stats, "ai_narrative": None, "summary": generate_plain_text_summary(market_stats)}
```

---

## 7. eBay OAuth (User-Level — Store Automation)

### Authorization Code Grant Flow

```
1. User visits: https://auth.ebay.com/oauth2/authorize?
     client_id={CLIENT_ID}
     &redirect_uri={RuName}
     &response_type=code
     &scope=https://api.ebay.com/oauth/api_scope/sell.inventory
            https://api.ebay.com/oauth/api_scope/sell.negotiation

2. eBay redirects to Render server with auth code

3. Server exchanges code for tokens:
   POST https://api.ebay.com/identity/v1/oauth2/token
   Body: grant_type=authorization_code&code={auth_code}&redirect_uri={RuName}

4. Store refresh token in Render env vars + GitHub Secrets
```

### Token Refresh

```javascript
async function refreshToken() {
  const response = await fetch("https://api.ebay.com/identity/v1/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64")}`,
    },
    body: `grant_type=refresh_token&refresh_token=${REFRESH_TOKEN}`,
  });
  return response.json();  // { access_token, expires_in }
}
```

**Refresh token lifetime:** 18 months (eBay production). Set a calendar reminder to rotate.

---

## 8. Common Patterns Across All APIs

### Universal Error Handling

```javascript
async function safeFetch(url, options = {}) {
  try {
    const response = await fetch(url, { timeout: 30000, ...options });
    if (!response.ok) {
      console.error(`HTTP ${response.status} for ${url}`);
      return null;
    }
    return response;
  } catch (err) {
    console.error(`Fetch failed for ${url}: ${err.message}`);
    return null;
  }
}
```

### Rate Limiting Summary

| API | Delay Between Requests | Batch Pause | Daily Limit |
|-----|----------------------|-------------|-------------|
| eBay Browse API | N/A (single calls) | N/A | 5,000 |
| eBay HTML Scraping | 4–6s (randomized) | N/A | Unlimited* |
| Gemrate.com | 3–7s (randomized) | N/A | Unlimited* |
| SportsCardsPro | 500ms | 3s every 50 | Unknown |
| Wikipedia | None needed | N/A | Unlimited |
| Google Gemini | As needed | 60s on 429 | 15/min (free) |

*\*Subject to IP blocking if too aggressive*

---

*References: [eBay-Browse-API], [eBay-OAuth], [OAuth-RFC], [Cheerio], [Wikipedia-API], [Gemini-API]. See the References & Bibliography for full citations.*
