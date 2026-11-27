# Two player cards side by side on phones

On the home page, phones currently show one player card per line. Change the layout so phones show two cards side by side; tablets and computers keep the current layout.

## Steps
- Switch the athlete grid to two columns on small screens with a smaller gap.
- Tighten card spacing and text sizes on phones only so names, prices and badges still fit in the narrower cards (truncate long names, wrap badges).
- Check on a phone-sized screen in English and Spanish, including the Both price mode.

## Technical details
- `src/components/VzlaAthleteGrid.tsx` line 118: `grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(250px,1fr))] sm:gap-5`.
- Mobile-only (`max-sm` / base, restored at `sm:`) padding/font tweaks in the athlete card component.
