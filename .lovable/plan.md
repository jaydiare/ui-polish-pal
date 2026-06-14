
## Why Google is reporting Soft 404

Google's example URL is `https://vzlasportselite.com/index.html`. This is a client-rendered React SPA: when Googlebot fetches it, the only HTML inside `<body>` is the loader shell:

```html
<div class="shell-loader">
  <div class="shell-spinner"></div>
  <h1>VZLA Sports Elite</h1>
  <p>Loading market data…</p>
</div>
```

The real page content is rendered later by JS after fetching JSON from `raw.githubusercontent.com`. If Googlebot's render times out, or the fetches are slow/throttled, it sees only "Loading market data…" — that looks like an empty page, so Google classifies it as Soft 404.

A secondary issue: `/` and `/index.html` are the same page on Lovable's static hosting. The canonical already points to `/`, but `/index.html` is still discoverable and reported separately.

## Plan

### 1. Replace the loader shell with crawlable static content (`index.html`)

Inside `#root`, ship a real, semantic above-the-fold shell that JS will hydrate over. This makes the page meaningful even if Googlebot never executes the JS:

- `<h1>` matching the page title ("Venezuelan Sports Cards, Daily Price Index").
- An intro paragraph summarizing what the site tracks (550+ athletes, daily eBay scans, raw + graded comps, stability + signals).
- A `<nav>` with anchor links to the main routes already in the sitemap: Data, Market Data, Blog, Methodology, Checklist Intel, How It Works, About.
- A short bulleted "What you'll find here" list (Raw averages, Graded comps, Sold data, Stability, Investment signals).
- Keep the spinner, but as a small inline element below the content rather than the entire screen, so users still see a loading cue.

All hidden behind the existing dark theme styles already in the inline `<style>` block, with a couple of additions (link color, list spacing) to keep visual quality. React will replace `#root`'s children on mount as it does today, so there is no UX regression for human visitors.

### 2. Force `/index.html` to canonicalize to `/`

Lovable hosting does not support server redirects, so use two layers:

- **Client-side**: in `src/main.tsx` (or a tiny inline script in `index.html` before React mounts), if `location.pathname === "/index.html"`, call `history.replaceState(null, "", "/")` before React Router boots. This collapses the URL in the browser and in any internal links crawlers follow.
- **SEO**: confirm the existing `<link rel="canonical" href="https://vzlasportselite.com/" />` and `og:url` already in `index.html` stay correct (they do).

### 3. Drop `/index.html` from any internal references

Quick grep of the codebase for `index.html` to make sure no internal link, sitemap entry, or sharing code points at `/index.html` instead of `/`. (`public/sitemap.xml` already uses `/`.) If anything points to `/index.html`, change it to `/`.

### 4. After deploy, ask Google to re-validate

Tell the user:
- Publish the change.
- In Search Console, on the Soft 404 issue, click "Validate fix" again (the current validation was started against the old HTML).
- Re-validation typically takes a few days; the "New reasons" emails should stop once Google re-crawls and finds substantive content at `/` and a clean redirect from `/index.html`.

## Out of scope (call out, don't do unless asked)

- Migrating to SSR / prerendering (would fully eliminate SPA soft-404 risk, but is a much larger change).
- Per-route `<Helmet>` canonicals for `/data`, `/blog/*`, etc. Useful follow-up for SEO hygiene, but not what's causing the current Soft 404 report.
- Editing `robots.txt` or `sitemap.xml` — both already look correct.

## Technical notes

- File touched: `index.html` (shell content + tiny redirect script), possibly `src/main.tsx` if we prefer the redirect there.
- No new dependencies.
- No changes to JSON pipelines, GitHub Actions, or routing.
- Memory: nothing project-wide to save; this is a one-time SEO fix.
