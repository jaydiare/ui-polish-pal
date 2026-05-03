import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

/**
 * UI regression check: ensure the homepage layout stays consistent after
 * removing the "Top Deals" section. Verifies that:
 *  - VzlaTopDeals is no longer imported or rendered
 *  - The remaining sections appear in the expected order
 *  - Each section in the lazy Suspense block uses consistent spacing
 *    (relies on each component's own `my-*` margin; no extra wrapper gaps)
 */
describe("Index page – post-TopDeals spacing", () => {
  const source = readFileSync(
    resolve(__dirname, "../Index.tsx"),
    "utf-8"
  );

  it("does not reference VzlaTopDeals anymore", () => {
    expect(source).not.toMatch(/VzlaTopDeals/);
  });

  it("renders the homepage sections in the expected order", () => {
    const order = [
      "VzlaHero",
      "VzlaIndexCards",
      "VzlaMarketInsights",
      "VzlaHowToMoney",
      "VzlaBudgetBar",
      "VzlaSearchFilters",
      "VzlaAthleteGrid",
      "VzlaFooter",
    ];
    let lastIndex = -1;
    for (const name of order) {
      const idx = source.indexOf(`<${name}`);
      expect(idx, `${name} should be rendered`).toBeGreaterThan(-1);
      expect(idx, `${name} should appear after previous section`).toBeGreaterThan(lastIndex);
      lastIndex = idx;
    }
  });

  it("does not introduce extra wrapper divs with ad-hoc margins between sections", () => {
    // The Suspense block should contain the sections directly, not wrapped
    // in <div className="mt-..."> spacers that would create inconsistent gaps.
    const suspenseBlock = source.match(/<Suspense fallback=\{<div className="min-h-\[200px\]"[^]*?<\/Suspense>/);
    expect(suspenseBlock, "expected lazy Suspense block to exist").toBeTruthy();
    const block = suspenseBlock![0];
    // No bare <div className="mt-..."> or <div className="my-..."> wrappers
    expect(block).not.toMatch(/<div className="m[ty]-\d+"\s*>/);
  });
});

describe("Section components – consistent vertical rhythm", () => {
  const sections = [
    "src/components/VzlaHowToMoney.tsx",
    "src/components/VzlaBudgetBar.tsx",
    "src/components/VzlaSearchFilters.tsx",
  ];

  it.each(sections)("%s uses a my-* margin on its root section for consistent spacing", (path) => {
    const src = readFileSync(resolve(process.cwd(), path), "utf-8");
    // Each section component should self-manage vertical spacing via my-*
    // (or mt-*/mb-*) so the parent doesn't need wrapper margins.
    expect(src).toMatch(/className="[^"]*\bm[ytb]-\d+\b/);
  });
});
