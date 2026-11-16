# Make the price method description match on every page

## What the price scripts really do
All five eBay price scripts (raw listings, raw sold, graded listings, graded sold, PSA 7/8 sold) use the same setting: they sort prices, cap the lowest 40% and highest 40% at the nearest value left in the middle (winsorizing, so nothing is deleted), then average everything. So every page is currently wrong: some say 10%, some say 20%, and some say the extreme prices are "removed".

## One shared description (EN / ES)
- EN: "We sort all prices, cap the lowest 40% and highest 40% at the nearest middle value (winsorization), then average. Extreme listings can't pull the price up or down."
- ES: "Ordenamos todos los precios, limitamos el 40% más bajo y el 40% más alto al valor central más cercano (winsorización) y luego promediamos. Las publicaciones extremas no pueden subir ni bajar el precio."

Short mentions (lists, FAQ answers) use the same "40% from each end, capped, not removed" wording.

## Places to update (wording only, no layout changes)
- About Us: intro paragraph and FAQ answer (EN + ES), plus its Google FAQ data
- How It Works: main explanation, "Outlier removal" bullet, and its Google FAQ data (the "averaging the remaining 80%" line goes)
- Methodology: two paragraphs and FAQ answer (EN + ES), plus the page's built-in FAQ text
- Market Cap blog: methodology note ("top/bottom 10%")

SportsCardsPro monthly prices use a different 20% trim. Where a page talks about those, it will say so separately so the two numbers don't get mixed up.

## Technical details
- Files: `src/i18n/pageTranslations.ts` (lines ~49, 86, 108, 113, 140 and the ES copies ~216, 253, 275, 280, 307), `src/pages/About.tsx` (JSON-LD), `src/pages/HowItWorks.tsx` (JSON-LD and lines 104, 210), `src/pages/Methodology.tsx` (JSON-LD line 26), `src/pages/MarketCapBlog.tsx` line 373.
- Source of truth: `TAGUCHI_TRIM_PCT = 0.4` in `scripts/*update-ebay-avg.js`. Add a short note in `AGENTS.md` that the methodology text must match this value.
- No em dashes in new copy.
