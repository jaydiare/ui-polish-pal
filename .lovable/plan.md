# Fix: Price history dialog unusable on mobile

## Problem

Confirmed on a 393x706 mobile viewport: the price history dialog renders **708px tall**, taller than the screen. Because `DialogContent` is fixed-centered with no max-height or scrolling, the top of the dialog (athlete name + the X close button) is clipped off-screen and there is no way to scroll to it or dismiss the popup.

## Fix (in `src/components/PriceHistoryDialog.tsx`)

1. **Make the dialog scrollable and viewport-bounded** on `DialogContent`:
   - `max-h-[calc(100dvh-2rem)] overflow-y-auto` so the whole dialog (header included) scrolls inside the screen, on all devices.
   - `w-[calc(100vw-1.5rem)]` so it never touches the screen edges on small phones.
   - Use `dvh` (dynamic viewport height) so mobile browser address bars don't break the sizing.
2. **Keep the header visible while scrolling**: make the `DialogHeader` sticky at the top of the scrollable area (`sticky top-0 z-10 bg-background`) with a small bottom border, so the athlete name and the X close button are always reachable.
3. **Tighten mobile vertical spacing** so more fits on screen:
   - Reduce dialog padding on mobile (`p-4 sm:p-6`).
   - Reduce chart height slightly on mobile (`h-[220px] sm:h-[260px]`).
4. Keep desktop behavior unchanged (same max width, centered, rounded).

## Verification

- Re-run the mobile Playwright check (393x706): open the dialog, confirm the athlete name and close button are visible/tappable, scrolling works, and tapping X (or outside / back gesture via Radix) closes it.
- Spot-check desktop viewport to confirm no visual regression.
