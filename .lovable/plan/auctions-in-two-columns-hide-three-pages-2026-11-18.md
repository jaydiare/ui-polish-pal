# Auctions in two columns, hide three pages

## 1. Auctions page: two columns
- On phones, show auction cards two per row instead of one, with slightly smaller text and padding so title, bid and countdown still fit.
- Tablets and desktop keep their current layout (3 to 4 per row).

## 2. Hide Market Data, Checklist Intel and MLB Leaders
- Remove the three links from the menu (desktop and phone).
- Visiting those addresses directly sends people to the home page.
- Remove them from the sitemap and the AI site summary (llms.txt) so Google stops listing them.
- The pages themselves stay in the project, so they can be turned back on later with one switch.

## Technical details
- `src/pages/Auctions.tsx`: grid `grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`, tighter card spacing below `sm`.
- `src/lib/hidden-pages.ts`: `HIDDEN_PAGES` list; `VzlaNavbar.tsx` filters nav items by it; `App.tsx` maps hidden paths to `<Navigate to="/" replace />`.
- Edit `public/sitemap.xml` and `public/llms.txt` (and the sitemap generator if it lists them).
- Check at phone and desktop width.
