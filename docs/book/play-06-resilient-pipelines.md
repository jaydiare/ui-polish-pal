# Play 6: Resilient Pipelines — When Things Go Wrong

---

> *"Everything fails. The only question is whether your system knows what to do next."*

---

## The Principle

Pipelines will fail. External APIs will throttle you. Concurrent workflows will stomp on each other's data. Network connections will drop mid-write. Bot detectors will block your scrapers. JSON files will corrupt when a runner gets preempted between truncating a file and writing new content.

The goal is not to prevent failure — it's to design systems that recover automatically, preserve progress, and leave clear evidence of what happened.

This play covers the five resilience patterns that emerged from real failures in VZLA Sports Elite's 15 pipeline infrastructure. None were designed upfront. All were born from production incidents.

---

## Pattern 1: Rebase-Safe Commits

### The Problem

VZLA Sports Elite runs multiple workflows that commit to the same `main` branch. Consider a typical Monday:

- **00:00 UTC** — `ebay-sold.yml` starts, processes 10 athletes, tries to push
- **00:15 UTC** — `gemrate.yml` starts, processes 20 athletes, tries to push
- **00:30 UTC** — `ebay-sold.yml` finishes and pushes successfully
- **00:45 UTC** — `gemrate.yml` finishes — but `main` has moved

Without handling this, `gemrate.yml` gets a non-fast-forward rejection:

```
! [rejected]        HEAD -> main (non-fast-forward)
error: failed to push some refs to 'github.com/...'
```

The entire workflow fails. Twenty athletes' worth of grading data is lost. The progress tracker never updates, so the next run re-processes the same batch — wasting another cycle.

### The Solution

Every data-writing workflow in the project uses this exact commit pattern:

```yaml
- name: Commit & push (rebase-safe)
  run: |
    set -e

    git config user.name "github-actions[bot]"
    git config user.email "github-actions[bot]@users.noreply.github.com"

    git add data/ebay-sold-avg.json data/ebay-sold-progress.json

    if git diff --cached --quiet; then
      echo "No changes to commit"
      exit 0
    fi

    git commit -m "Update eBay sold averages (batch)"

    git fetch origin main
    git rebase --autostash origin/main || \
      (git rebase --abort && git pull --rebase origin main)

    git push origin HEAD:main
```

Let's walk through every line and why it matters.

**`set -e`** — Exit on any error. Without this, a failed `git rebase` would silently continue, and the subsequent `git push` would push a broken state. In shell scripts, silence is the enemy.

**`if git diff --cached --quiet`** — If the script ran but nothing changed (the API returned the same data, or no athletes were due for update), skip the commit entirely. This prevents empty commits that clutter history and trigger unnecessary downstream webhooks.

**`git fetch origin main`** — Get the latest state of `main` from GitHub. This is the critical step. Between our checkout (which happened at workflow start) and now, other workflows may have pushed.

**`git rebase --autostash origin/main`** — Replay our commit on top of whatever is now on `main`. The `--autostash` flag handles the edge case where there are uncommitted changes in the working directory (rare in CI, but defensive coding costs nothing).

**The fallback: `git rebase --abort && git pull --rebase origin main`** — If the rebase fails (a genuine merge conflict), abort it cleanly and try `pull --rebase` as a second strategy. In practice, conflicts are rare because each workflow writes to different files. But when they do occur — for example, if two workflows both update `athlete-history.json` — this fallback prevents a stuck pipeline.

### Why Not Merge?

You might ask: why rebase instead of merge? Two reasons:

1. **Linear history.** Merge commits in an automated data pipeline create a noisy, unreadable git log. When you need to trace when a data regression was introduced, a linear history is invaluable.

2. **Conflict resolution.** Rebase applies changes sequentially, making conflicts visible one commit at a time. Merge commits can hide conflicts in the merge commit itself.

### The Checkout Configuration

The rebase pattern requires full history:

```yaml
- uses: actions/checkout@v4
  with:
    fetch-depth: 0  # Full history needed for rebase
```

The default `fetch-depth: 1` (shallow clone) breaks rebase because Git can't find the common ancestor between our branch and `origin/main`. This single line — `fetch-depth: 0` — took several pipeline failures to discover. The error message ("fatal: refusing to merge unrelated histories") gives no hint that the solution is a deeper clone.

### The Pattern

> **When multiple automated processes write to the same repository, every commit step must: (1) check if changes exist, (2) fetch the latest remote state, (3) rebase with a merge fallback, and (4) handle the empty-diff case gracefully.**

---

## Pattern 2: Batch Processing with Checkpoint/Resume

### The Problem

VZLA Sports Elite tracks 553 athletes. Processing all of them in a single workflow run is impractical:

- **eBay HTML scraping** takes 4-8 seconds per athlete (with polite delays). 553 × 6s = 55 minutes. GitHub Actions has a 6-hour timeout, but eBay's bot detection would kick in long before that.
- **Gemrate scraping** requires 3-7 seconds per athlete with randomized delays. A single run would take 30-60 minutes and almost certainly trigger Cloudflare protection.
- **API quotas** limit how many calls you can make per day. Processing everyone at once would blow the budget.

### The Solution

Split the roster into batches and track progress in a committed JSON file:

```javascript
// From sold-update-ebay-avg.js
const BATCH_SIZE = 10; // athletes per run

// Load progress from previous run
const progress = loadProgress();
const startIdx = progress.nextIndex || 0;

// If we've processed everyone, reset
if (startIdx >= athletes.length) {
  console.log(`All ${athletes.length} athletes processed. Resetting.`);
  saveProgress({ nextIndex: 0, lastCompletedAt: new Date().toISOString() });
  return;
}

// Process this batch
const endIdx = Math.min(startIdx + BATCH_SIZE, athletes.length);
const batch = athletes.slice(startIdx, endIdx);

console.log(`📦 Batch: athletes ${startIdx + 1}–${endIdx} of ${athletes.length}`);

// ... process batch ...

// Save progress for next run
saveProgress({ nextIndex: endIdx, lastBatchAt: new Date().toISOString() });
```

The progress file is simple:

```json
{
  "nextIndex": 340,
  "lastBatchAt": "2026-03-19T18:00:05.123Z",
  "lastBatchRange": "330-339",
  "totalAthletes": 553
}
```

Because this file is committed to Git alongside the data, it survives between workflow runs. When the next run starts, it reads `nextIndex: 340` and picks up exactly where the previous run left off.

### The Math

With 553 athletes and a batch size of 10:

- **Sold listings** (every 3 hours): 55 batches × 3 hours = **6.9 days** per full cycle
- **Gemrate** (every 4 hours, batch of 20): 28 batches × 4 hours = **4.7 days** per full cycle

This means every athlete gets fresh sold data roughly weekly and fresh grading data roughly every five days — without ever hitting rate limits or triggering bot detection.

### Progressive Save

Notice this line buried in the main processing loop:

```javascript
// Progressive save after EACH athlete
fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2));
```

After every single athlete is processed, the output file is written to disk. If the workflow crashes on athlete #7 of a 10-athlete batch, athletes #1-6 are already saved. The progress tracker still points to the batch start, so the next run will re-process #1-6 (cheap, since the data just gets overwritten with identical values) and successfully process #7-10.

This is the **idempotent progressive save** pattern: every intermediate state is a valid final state.

### The Gemrate Cooldown

The Gemrate scraper adds another layer — a 30-day cooldown after completing a full cycle:

```python
# After processing all athletes in the roster
if next_start == 0:
    cooldown_path = os.path.join(base_dir, "data", COOLDOWN_FILE)
    with open(cooldown_path, "w") as f:
        json.dump({
            "completedAt": datetime.now(timezone.utc).isoformat()
        }, f, indent=2)
    print("🛑 Full cycle complete — entering 30-day cooldown.")
```

At the start of every run, it checks:

```python
def in_cooldown(base_dir):
    cooldown_path = os.path.join(base_dir, "data", COOLDOWN_FILE)
    try:
        with open(cooldown_path, "r") as f:
            data = json.load(f)
        last_done = datetime.fromisoformat(data["completedAt"])
        return datetime.now(timezone.utc) < last_done + timedelta(days=COOLDOWN_DAYS)
    except Exception:
        return False
```

PSA grading population data doesn't change daily — new grades trickle in over weeks. Running the scraper continuously would waste resources and risk getting the IP blocked by Cloudflare. The cooldown pattern lets the pipeline self-regulate: scrape aggressively until complete, then sleep for 30 days, then start again.

### The Pattern

> **When processing large datasets across scheduled runs, persist a cursor (progress file) alongside the data. Save progressively after each unit of work. Design every intermediate state to be a valid final state. Add cooldown periods for data sources that update infrequently.**

---

## Pattern 3: Exponential Backoff with Jitter

### The Problem

eBay's servers respond to rapid requests with three flavors of rejection:

1. **HTTP 429** (Too Many Requests) — explicit rate limiting with a `Retry-After` header
2. **HTTP 503** (Service Unavailable) — server overload or maintenance
3. **CAPTCHA pages** — bot detection that returns a 200 OK with a challenge page instead of real data

Each requires different handling, but the underlying strategy is the same: wait, then try again, with increasing patience.

### The Solution

The sold listing scraper implements a multi-layer retry system:

```javascript
const MAX_RETRIES = 4;

async function fetchSoldPage(url) {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const res = await fetch(url, {
      headers: {
        "User-Agent": randomUA(),
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://www.ebay.com/",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
      },
      redirect: "follow",
    });

    // Layer 1: Explicit rate limiting
    if (res.status === 429) {
      const retryAfter = res.headers.get("Retry-After");
      let delayMs = Math.pow(2, attempt) * 3000;
      if (retryAfter) {
        const parsed = parseInt(retryAfter, 10);
        if (!isNaN(parsed)) delayMs = Math.max(parsed * 1000, delayMs);
      }
      const jitter = Math.random() * 2000;
      console.log(`⏳ Rate limited (429). Waiting ${((delayMs + jitter) / 1000).toFixed(1)}s`);
      await sleep(delayMs + jitter);
      continue;
    }

    // Layer 2: Server errors
    if (!res.ok) {
      if (attempt < MAX_RETRIES - 1) {
        const waitMs = Math.pow(2, attempt) * 2000 + Math.random() * 1000;
        console.log(`⚠️ HTTP ${res.status}. Retrying in ${(waitMs / 1000).toFixed(1)}s`);
        await sleep(waitMs);
        continue;
      }
      throw new Error(`Fetch failed (${res.status}) after ${MAX_RETRIES} attempts`);
    }

    const html = await res.text();

    // Layer 3: CAPTCHA/bot detection
    if (html.includes("captcha") || html.includes("robot") || html.length < 5000) {
      if (attempt < MAX_RETRIES - 1) {
        const waitMs = Math.pow(2, attempt) * 5000 + Math.random() * 3000;
        console.log(`🤖 CAPTCHA detected (${html.length} chars). Waiting ${(waitMs / 1000).toFixed(1)}s`);
        await sleep(waitMs);
        continue;
      }
      console.log(`🤖 CAPTCHA persists after ${MAX_RETRIES} attempts — skipping`);
    }

    return html;
  }

  throw new Error(`Max retries (${MAX_RETRIES}) exceeded`);
}
```

Let's trace the timing for a worst-case scenario where every attempt fails:

| Attempt | Base Delay | Jitter | Total Wait |
|---------|-----------|--------|------------|
| 1 | 3,000ms (2⁰ × 3s) | 0-2,000ms | 3-5s |
| 2 | 6,000ms (2¹ × 3s) | 0-2,000ms | 6-8s |
| 3 | 12,000ms (2² × 3s) | 0-2,000ms | 12-14s |
| 4 | 24,000ms (2³ × 3s) | 0-2,000ms | 24-26s |

Total worst-case wait: ~53 seconds across 4 attempts. Long enough to ride out a transient issue, short enough to not burn the entire GitHub Actions timeout.

### Why Jitter Matters

The `Math.random() * 2000` added to every delay is not cosmetic. Without jitter, if two workflows hit a rate limit at the same time, they'd both retry at exactly the same intervals — creating synchronized bursts that trigger more rate limiting. Jitter desynchronizes the retries.

This is the **thundering herd** problem, and it applies even when you're a solo developer — because your 15 workflows are 15 independent clients from the API's perspective.

### The Gemrate Approach: Adaptive Backoff

The Python scraper takes a different approach, adapting its delay based on the pattern of failures:

```python
# Random polite delay between every request
delay = random.uniform(DELAY_MIN, DELAY_MAX)  # 3-6 seconds
time.sleep(delay)

# Adaptive: if too many consecutive blocks, pause much longer
if blocked_count > 3:
    print("⏸ Multiple blocks, pausing 60s...")
    time.sleep(60)
    blocked_count = 0
```

This pattern recognizes that consecutive failures are qualitatively different from isolated ones. One 429 is noise. Four in a row means you've triggered a defense system, and short retries will only make it angrier. The 60-second pause is a white flag — "I'll stop for a while, please let me back in."

### Between-Athlete Delays

Beyond per-request retries, the scrapers add randomized delays between athletes:

```javascript
// Dynamic delay between athletes
const dynamicDelay = BASE_DELAY_MS + Math.random() * 4000;
console.log(`💤 Waiting ${(dynamicDelay / 1000).toFixed(1)}s before next athlete...`);
await sleep(dynamicDelay);
```

This 4-8 second random gap between athletes simulates human browsing patterns. A human doesn't search for 10 athletes in 10 seconds — they browse, read, think, then search again. The randomized delay creates a similar traffic pattern.

### The Pattern

> **Layer your retries: (1) respect explicit rate limit headers, (2) exponential backoff for server errors, (3) content-based detection for bot challenges. Add random jitter to every delay. Implement adaptive escalation for consecutive failures. Simulate human timing between logical operations.**

---

## Pattern 4: Self-Healing File Reads

### The Problem

GitHub Actions runners are ephemeral. They can be preempted, recycled, or terminated at any point during execution. If a workflow is mid-write when this happens:

```javascript
// This is NOT atomic — there's a gap between truncate and write
fs.writeFileSync(OUT_PATH, JSON.stringify(data, null, 2));
```

`writeFileSync` first truncates the file (empties it), then writes new content. If the process dies between truncation and completion, the file is empty — zero bytes. The next workflow run reads it:

```javascript
const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
// SyntaxError: Unexpected end of JSON input
```

The entire pipeline crashes. And because the progress file is also corrupted, it can't even resume — it restarts from the beginning, potentially overwriting hours of previously collected data.

### The Solution

Every file read in the project wraps parsing in a recovery handler:

```javascript
function readJson(filePath) {
  try {
    if (!fs.existsSync(filePath)) return {};
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw);
  } catch {
    // Corrupted or empty file — reinitialize with empty object
    return {};
  }
}
```

The Python equivalent:

```python
def parse_with_recovery(content):
    """Parse JSON, attempting to recover truncated arrays."""
    try:
        return json.loads(content)
    except json.JSONDecodeError as e:
        print(f"⚠ JSON parsing failed, attempting recovery... ({e})")
        last_brace = content.rfind("}")
        if last_brace > 0:
            repaired = content[:last_brace + 1].rstrip()
            if not repaired.endswith("]"):
                repaired += "]"
            try:
                items = json.loads(repaired)
                print(f"✓ Recovered {len(items)} items from truncated JSON")
                return items
            except json.JSONDecodeError:
                pass
        raise
```

The Python version goes further: it attempts to *recover* truncated JSON by finding the last valid closing brace and reconstructing the array. If the file was mid-write and the last valid entry ended at athlete #340, this recovery logic salvages those 340 entries instead of discarding them.

### Why Return `{}` Instead of Throwing?

This is a deliberate design choice. An empty object (`{}`) is a valid state for every data file in the system:

- `ebay-avg.json` with `{}` → no athletes have prices → the frontend shows "No Price" labels
- `gemrate-progress.json` with `{}` → progress is at index 0 → the next batch starts from the beginning
- `athlete-history.json` with `{}` → no history → sparklines don't render

None of these are catastrophic. They're all self-correcting: the next pipeline run will repopulate the data. The system degrades gracefully rather than crashing in a loop.

### The Pattern

> **Every file read should be wrapped in a try/catch that returns a valid empty state on failure. Attempt content recovery before falling back to empty. Design your data schemas so that an empty object is always a legal — if impoverished — state.**

---

## Pattern 5: Concurrency Control

### The Problem

What happens when you manually trigger a workflow that's also running on its schedule? Or when a scheduled run takes longer than expected and overlaps with the next scheduled run?

Without protection, you get two instances of the same script writing to the same files simultaneously. The last one to commit wins, and the other's work is silently discarded.

### The Solution

Every workflow declares a concurrency group:

```yaml
concurrency:
  group: ebay-sold-avg-main
  cancel-in-progress: true
```

This tells GitHub Actions: "Only one instance of this workflow can run at a time. If a new run starts while one is already running, cancel the in-progress run."

The group name must be unique per logical pipeline. The naming convention in VZLA Sports Elite is `{data-source}-{operation}-main`:

```yaml
# Each workflow has its own concurrency group
concurrency: { group: ebay-avg-main }           # Raw active listings
concurrency: { group: ebay-sold-avg-main }      # Raw sold listings
concurrency: { group: gemrate-sync }             # PSA grading data
concurrency: { group: backup-render }            # Database backup
concurrency: { group: bi-weekly-analysis }       # AI market analysis
```

### Why `cancel-in-progress: true`?

The alternative is `cancel-in-progress: false`, which queues the new run until the current one finishes. This sounds safer, but it creates a problem: if a workflow consistently takes longer than its schedule interval, the queue grows without bound.

For example, if the sold listing scraper takes 40 minutes but runs every 3 hours, this is fine — there's plenty of margin. But during an eBay outage, each run might spend most of its time in retry loops, taking 2+ hours. With queueing, you'd accumulate a backlog of stale runs.

`cancel-in-progress: true` says: "The freshest data matters most. If a new run starts, the old one's work is stale anyway — kill it."

This works because of Pattern 2 (progressive save). Any work completed before cancellation is already written to disk. The new run will pick up from wherever the progress file says.

### The Pattern

> **Every scheduled workflow needs an explicit concurrency group. Use `cancel-in-progress: true` for data pipelines where fresher data supersedes older data. This works best when combined with progressive save — cancelled work isn't lost, just incomplete.**

---

## Pattern 6: Anti-Detection Camouflage

### The Problem

Web scrapers that make identical requests at machine speed get blocked. Period. eBay, Gemrate, and every other data source in the pipeline have bot detection systems that look for:

1. **Identical User-Agent strings** across requests
2. **Perfectly regular timing** (human requests are never exactly N seconds apart)
3. **High request volume** from a single IP
4. **Missing browser headers** that real browsers send

### The Solution

The project implements multi-layer camouflage:

```javascript
// Rotating User-Agents
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125.0.0.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/125.0.0.0",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/125.0.0.0",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0",
];

function randomUA() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}
```

```javascript
// Full browser-like header set
headers: {
  "User-Agent": randomUA(),
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept-Encoding": "gzip, deflate",
  "Cache-Control": "no-cache",
  "Referer": "https://www.ebay.com/",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "same-origin",
}
```

The `Sec-Fetch-*` headers are particularly important. These are automatically sent by modern browsers and are nearly impossible to spoof incorrectly. Bot detectors check for their presence and consistency. A request with `Sec-Fetch-Dest: document` and `Sec-Fetch-Mode: navigate` looks like a human clicking a link, not a script making an API call.

The Python scraper adds session persistence:

```python
session = requests.Session()
session.headers.update({
    "User-Agent": random.choice(USER_AGENTS),
    "Accept": "text/html,application/xhtml+xml",
    "Accept-Language": "en-US,en;q=0.9",
    "Origin": "https://www.gemrate.com",
    "Referer": "https://www.gemrate.com/player",
    "Connection": "keep-alive",
})
```

A `requests.Session()` maintains cookies across requests — exactly like a real browser. A fresh connection for every request is a bot fingerprint.

### The Pattern

> **Rotate User-Agents. Include full browser header sets including Sec-Fetch-\* headers. Use persistent sessions for cookie continuity. Add randomized delays that mimic human browsing patterns. Batch small (10-20 items) to stay below detection thresholds.**

---

## The Meta-Pattern: Composition

No single pattern above is sufficient on its own. The resilience of VZLA Sports Elite's pipelines comes from their composition:

1. **Batch processing** limits the blast radius of any single failure to 10-20 athletes
2. **Progressive save** ensures partial batches aren't wasted
3. **Self-healing reads** let the next run recover from corrupted state
4. **Exponential backoff** keeps external services happy
5. **Rebase-safe commits** prevent concurrent workflows from stomping each other
6. **Concurrency control** prevents the same pipeline from running twice
7. **Anti-detection** keeps the scrapers running for months without manual intervention

Together, these patterns create a system that runs 8 scraping pipelines continuously — every 2-4 hours — across 553 athletes, against multiple external services with active bot detection, and has been running unattended for months.

The system isn't clever. It's relentlessly boring. It handles every failure the same way: save what you have, wait politely, try again. No fancy orchestration. No message queues. No circuit breakers. Just files, retries, and patience.

That's the real lesson of resilient pipelines: the best systems are the ones simple enough to debug at 3 AM — when something finally does go wrong that you didn't anticipate.

---

## Try It Yourself

1. Create a GitHub Actions workflow that commits to your repo on a schedule
2. Create a *second* workflow that commits to the same repo on a different schedule
3. Run both simultaneously (use `workflow_dispatch`)
4. Watch one of them fail with a non-fast-forward error
5. Add the rebase-safe commit pattern
6. Run both again — they should both succeed

This five-minute exercise teaches you more about concurrent CI/CD than any documentation ever will.
