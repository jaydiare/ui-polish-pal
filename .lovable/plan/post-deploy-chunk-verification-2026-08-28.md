# Post-Deploy Chunk Verification

A small Node script that checks every lazily-loaded JavaScript chunk actually loads, so a broken or incomplete deploy is caught immediately instead of showing users a blank screen.

## What it does

1. Reads the built `dist/index.html`, finds the entry `<script type="module">`.
2. Walks the module graph: for each JS file, extracts all static and dynamic import URLs plus `modulepreload` links, following them recursively.
3. Verifies each referenced chunk exists and is real JavaScript (not an HTML 404 fallback page).
4. Exits `1` with a list of missing chunks; exits `0` with a count of verified chunks.

## Two modes

- **Local (default):** checks files on disk in `dist/`. Fast, no network, catches broken builds before publishing.
- **Remote:** `node scripts/verify-chunks.mjs https://vzlasportselite.com` fetches `index.html` and each chunk over HTTP, failing on non-200 responses or HTML content-type (the classic stale/missing-chunk case). Requests run with limited concurrency and a short timeout.

## Technical notes

- New file: `scripts/verify-chunks.mjs`, plain Node ESM, zero dependencies (same style as `scripts/preflight.mjs`, reusing its colored pass/fail output).
- Import extraction via regex over `from "..."` / `import("...")` / `import "..."` string literals restricted to `/assets/*.js` paths, so it does not need a parser.
- New npm scripts: `verify:chunks` (local) and `verify:chunks:remote`.
- Nothing in `src/` changes; no build config changes.

## Optional follow-up (not included unless you want it)

Wire the local check into a GitHub Action that runs `npm run build && npm run verify:chunks` on push, so a bad chunk graph fails CI.
