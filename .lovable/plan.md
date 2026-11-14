# Card Dealer Pro banner in the left sidebar

Add the Card Dealer Pro logo (from your uploaded image) as a clickable banner in the left side banner that already appears on every page (visible on wide screens, over 1700px, same as the current BCW and Market Movers banners).

- Links to https://v2-carddealerpro.cello.so/kDZf6Amyrrs, opens in a new tab.
- Placed after Market Movers, before the Google ad, so ad placement is unchanged.
- No extra text added, only the logo, matching the existing banner style.

## Technical details
- Upload the image via lovable-assets, import the pointer in `src/components/VzlaSideBanner.tsx`.
- Add an entry to `AFFILIATES` (`id: "sidebar-cdp"`, alt "Card Dealer Pro"), `rel="noopener noreferrer sponsored"`.
