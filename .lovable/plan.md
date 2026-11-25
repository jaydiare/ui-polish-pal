# Player popup, photo, and Venezuelan biographies

## What will change

- Make each athlete’s name an accessible button that opens the same price-history popup as the graph. The graph will keep working as it does now.
- Add the athlete’s existing card photo beside the popup title, with the current initials fallback when no photo is available. The already-resolved photo will be passed into the popup, avoiding another headshot search.
- Add a compact biography block directly below the popup name/header and above career stats for matching baseball players born in Venezuela.
- Display the requested fields: Bats, Throws, Height, Weight, HOF, MLB debut (`debut_p`), Last played (`last_p`), Birth city, and Birth state.
- Format values for visitors: localized dates, height in feet/inches, weight in pounds, readable bats/throws values, and a dash for missing values. Add all labels in English and Spanish.
- Preserve the popup’s mobile scrolling, sticky header, career stats, price chart, and existing styling.

## Biography data

- Generate a small `venezuelan-bios.json` lookup from `data/biofile0.csv`, filtering to `birthcountry = Venezuela` and retaining only the requested fields. This avoids downloading the 4 MB CSV in each visitor’s browser.
- Match names accent-insensitively using the file’s `usename`, `lastname`, and `fullname`, including suffixes such as “Jr.”; do not show a biography when the match is uncertain.
- Load the compact lookup once and share it between popups, using the live data URL with the bundled fallback.
- Add a regeneration script and run it from the existing daily history workflow so future `biofile0.csv` updates flow into the derived JSON automatically.

## Technical changes

- Update `AthleteCard.tsx` to open the popup from the name and pass the existing photo.
- Update `PriceHistoryDialog.tsx` with the photo header and biography block.
- Add a small cached biography hook/parser plus EN/ES translation keys.
- Add the compact derived files under `data/` and `public/data/`, the regeneration script, and the workflow commit entries.

## Verification

- Test matching for Jackson Chourio and accent/suffix handling for Ronald Acuña Jr.; test that unrelated or uncertain players do not receive a biography.
- Test concrete formatting: `20240329` as March 29, 2024, height `71` as 5'11", weight `198` as 198 lb, and blank HOF as a dash.
- In the browser, open Jackson Chourio’s popup by clicking both his name and graph; confirm his photo and all requested biography fields appear.
- Check the popup at phone and desktop sizes, verify Spanish labels, and confirm the preview builds without errors.
