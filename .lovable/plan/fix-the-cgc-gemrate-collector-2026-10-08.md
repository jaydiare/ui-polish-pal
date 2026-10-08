# Fix the CGC Gemrate collector

## What is going wrong
1. **Results are never saved.** The save step adds four files at once, but two of them (`gemrate-progress_cgc.json` and `gemrate-cooldown_cgc.json`) don't exist yet. When one file is missing, git refuses to add any of them, so even a successful run ends with "No changes to commit" and the CGC data is thrown away. SGC works only because its files already exist.
2. **"No CGC cards" is treated as a block.** Most Venezuelan athletes have few or no CGC-graded cards. The script counts every empty answer the same as a Cloudflare block, so it keeps hitting the 90-second pause and the run drags on (or gets cancelled by the next scheduled run).
3. **Wrong progress file shown in the log** (it prints the SGC file), which hides what CGC actually did.

## Changes
- `.github/workflows/gemrate-cgc.yml`
  - Add each file only if it exists, so a missing file can't block the save.
  - Show `gemrate-progress_cgc.json` in the progress step.
  - Add a job time limit so a slow run stops cleanly before the next one starts.
- Seed `data/gemrate-progress_cgc.json` (start at 0) and `data/gemrate-cooldown_cgc.json` (`{}`).
- `scripts/fetch_gemrate_cgc.py`
  - Separate "page loaded, no CGC cards" (skip, no pause) from real blocks (HTTP 403 / Cloudflare page), which still trigger the pause.
  - Print a short end-of-run summary: found, no CGC data, blocked.
- Apply the same safe "add only existing files" fix to the PSA, Beckett and SGC workflows so they can't hit the same problem.

## After it ships
Run "Gemrate CGC Grading Sync" manually once from GitHub Actions; the summary line will confirm data is being saved. If almost everything shows as "blocked", the problem is Gemrate blocking GitHub's servers, and we'd discuss a different collection path.
