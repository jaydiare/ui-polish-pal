# Play 12: Progress Tracking & Batch Observability

---

> *"Long-running jobs need checkpoints and visibility. When you don't have Datadog, your JSON files ARE your dashboards."*

---

## The Batch Processing Problem

VZLA Sports Elite tracks 550+ athletes. Collecting data for each athlete involves making HTTP requests, parsing responses, computing statistics, and writing results. Processing all athletes in a single workflow run would take hours and risk timeouts, rate limits, and anti-scraping blocks.

The solution is batch processing: each workflow run processes a subset of athletes, picks up where the last run left off, and eventually cycles through the entire roster.

But batch processing creates a new problem: **how do you know where you are?**

If a workflow processes athletes 100-109, crashes at athlete 105, and restarts, does it start from 100 (re-processing 5 athletes) or from 110 (skipping 5 athletes)? Neither answer is satisfactory. You need checkpoints.

---

## Progress Files as State Machines

Every batch-processing workflow in the platform maintains a progress file — a small JSON document that records the current cursor position and metadata about the last run.

### eBay Sold Listings Progress

```json
{
  "nextIndex": 330,
  "lastBatchAt": "2026-03-20T18:45:21.164Z"
}
```

Two fields, complete clarity:
- **`nextIndex`** — The starting position for the next batch. The workflow reads this, processes athletes at indices 330-339 (batch of 10), then updates it to 340.
- **`lastBatchAt`** — Timestamp of the last successful batch. Useful for debugging ("when did this last run?") and for detecting stale batches.

The implementation is straightforward:

```javascript
// Read progress
const progress = JSON.parse(fs.readFileSync(PROGRESS_FILE));
const startIdx = progress.nextIndex || 0;

// Process batch
const endIdx = Math.min(startIdx + BATCH_SIZE, athletes.length);
for (let i = startIdx; i < endIdx; i++) {
  await processAthlete(athletes[i]);
}

// Update progress
if (endIdx >= athletes.length) {
  // Full cycle complete — reset to beginning
  progress.nextIndex = 0;
} else {
  progress.nextIndex = endIdx;
}
progress.lastBatchAt = new Date().toISOString();
fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
```

When `nextIndex` reaches the end of the athlete roster, it resets to 0, starting a new cycle. This means every athlete is guaranteed to be updated at least once per full cycle — approximately every 5.5 days for sold listings (550 athletes ÷ 10 per batch ÷ 8 runs per day).

### Gemrate Grading Progress

```json
{
  "startIdx": 160,
  "lastBatchAt": "2026-03-20T16:38:48.783401+00:00",
  "lastBatchRange": "140-159",
  "totalAthletes": 568
}
```

The grading progress file includes additional metadata:
- **`lastBatchRange`** — Human-readable record of the previous batch. Useful when checking workflow logs: "the last run covered athletes 140-159."
- **`totalAthletes`** — Total roster size at the time of the run. If the roster grows (new athletes added), this field helps detect that the batch cycle needs to accommodate more entries.

---

## Progressive Saves: Crash Safety

A batch processing 10 athletes takes several minutes. If the workflow crashes at athlete 7, what happens to the data for athletes 1-6?

The platform uses **progressive saves** — writing results after each individual athlete, not just at the end of the batch:

```javascript
for (let i = startIdx; i < endIdx; i++) {
  const athlete = athletes[i];
  const result = await processAthlete(athlete);
  
  // Save immediately after each athlete
  data[athlete.name] = result;
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(data, null, 2));
}
```

This means a crash at athlete 7 preserves data for athletes 1-6. The progress file's `nextIndex` is updated at the end of the batch, so the crashed batch will be re-run from the beginning on the next workflow execution — but athletes 1-6 will be overwritten with (likely identical) fresh data rather than lost.

The tradeoff: more disk writes. For a GitHub Actions runner processing 10 athletes, this is negligible. For a system processing millions of records, you'd batch the writes too.

---

## Audit Trails: Who Changed What

Data deduplication produces an audit report:

```json
{
  "total_before": 553,
  "total_after": 550,
  "removed": [
    {"name": "José Altuve", "reason": "duplicate (newer entry removed)"},
    {"name": "Jose Altuve", "reason": "duplicate (accent variant)"},
    {"name": "Ronald Acuña Jr", "reason": "duplicate (accent variant)"}
  ],
  "timestamp": "2026-03-01T00:00:00Z"
}
```

This file (`data/athletes_dedupe_report.json`) is committed alongside the data changes. When reviewing the Git log, you can see both the data change and the reasoning:

```
commit abc123
Author: GitHub Actions
Date: March 1, 2026

    Automated sync: Updated Venezuelan athletes

    data/athletes.json (550 entries, 3 removed by dedupe)
    data/athletes_dedupe_report.json (audit trail)
```

### Change Detection Logs

```json
// data/new-graded-athletes.json
{
  "added": [
    {"name": "Luis Arráez", "firstSeen": "2026-03-15", "psaPop": 47}
  ],
  "lastChecked": "2026-03-20"
}
```

When the grading sync discovers an athlete with PSA population data for the first time, it's logged. This answers the question: "when did we start tracking grading data for this athlete?"

---

## File-Based Observability

Traditional observability stacks involve metrics collection agents, time-series databases, and visualization dashboards. This platform achieves comparable visibility using committed JSON files:

| Observability Need | Traditional Tool | VZLA Sports Elite |
|---|---|---|
| "Where is the batch?" | Datadog job tracker | `ebay-sold-progress.json` |
| "When did this last run?" | Cron monitor | `lastBatchAt` timestamp |
| "What was processed?" | Application logs | `lastBatchRange` field |
| "Did deduplication remove anything?" | Log aggregation | `athletes_dedupe_report.json` |
| "When did we first see this athlete?" | Event tracking | `athlete-first-seen.json` |
| "What's changed?" | Change data capture | `new-graded-athletes.json` |

The advantage: every observability artifact is versioned in Git. You can check the state of the batch cursor at any point in history. You can diff progress files to see how processing speed changed over time. You can trace exactly when a new athlete entered the system.

The disadvantage: no real-time alerting. If a batch fails silently, you won't know until you check. For this platform's scale and tolerance, that's acceptable. For a high-stakes financial system, you'd need more.

---

## The Corrupted File Problem

What happens when a progress file itself becomes corrupted? A partial write, a JSON syntax error, or an empty file could cause the next workflow run to crash before processing even begins.

The platform handles this defensively:

```javascript
function readProgress(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    if (!raw || raw.trim() === '') return { nextIndex: 0 };
    return JSON.parse(raw);
  } catch {
    // Corrupted or missing — start from scratch
    return { nextIndex: 0 };
  }
}
```

If the progress file is corrupted, the script resets to the beginning of the roster. This means some athletes might be re-processed, but no data is lost and no batch is permanently stuck.

---

## Key Takeaways

1. **Progress files are state machines** — Small JSON documents that track batch cursor position
2. **Progressive saves prevent data loss** — Write after each item, not just at batch end
3. **Audit trails are committed with data** — Deduplication reports, change logs, and provenance files
4. **File-based observability works at small scale** — JSON files in Git replace Datadog for simple systems
5. **Handle corrupted state files defensively** — Reset to beginning rather than crash
6. **Cycle completion is implicit** — When `nextIndex` exceeds roster size, reset to 0
