import { describe, it, expect } from "vitest";
import { analyzeChecklist } from "@/lib/checklist-analyzer";

const SAMPLE_CHECKLIST = `2024 Topps Chrome Baseball Checklist

Base Set
1 Ronald Acuña Jr. - Atlanta Braves
2 Shohei Ohtani - Los Angeles Dodgers
3 Mookie Betts - Los Angeles Dodgers

Gold Refractor /50
1 Ronald Acuña Jr. - Atlanta Braves
2 Shohei Ohtani - Los Angeles Dodgers

Autographs
RA Ronald Acuña Jr. - Atlanta Braves

SuperFractor 1/1
1 Ronald Acuña Jr. - Atlanta Braves

Red Refractor /5
1 Ronald Acuña Jr. - Atlanta Braves

Rookie Autographs
RC1 Ronald Acuña Jr. - Atlanta Braves
`;

function makeFile(content: string, name: string): File {
  return new File([content], name, { type: "text/plain" });
}

describe("Checklist Analyzer – end-to-end", () => {
  it("parses a TXT checklist and returns results for the target athlete", async () => {
    const result = await analyzeChecklist({
      checklistFile: makeFile(SAMPLE_CHECKLIST, "checklist.txt"),
      oddsFile: null,
      athlete: "Acuña",
      formatName: null,
      packsPerBox: null,
      boxesPerCase: 12,
      manualOddsLines: [],
    });

    expect(result.athlete).toContain("Acuña");
    expect(result.results.length).toBeGreaterThan(0);
    expect(result.summary.count).toBeGreaterThan(0);

    // Should find cards across multiple tiers
    const tiers = new Set(result.results.map((r) => r.rarityTier));
    expect(tiers.size).toBeGreaterThanOrEqual(2);

    // SuperFractor 1/1 should be elite
    const superFractor = result.results.find(
      (r) => r.section.toLowerCase().includes("superfractor") || r.serialNumber === 1
    );
    expect(superFractor).toBeDefined();
    if (superFractor) {
      expect(superFractor.rarityTier).toBe("elite");
    }

    // Autograph cards should be detected
    const autoCards = result.results.filter((r) => r.cardTypes.includes("autograph"));
    expect(autoCards.length).toBeGreaterThan(0);
  });

  it("returns empty results for an athlete not in the checklist", async () => {
    const result = await analyzeChecklist({
      checklistFile: makeFile(SAMPLE_CHECKLIST, "checklist.txt"),
      oddsFile: null,
      athlete: "Mike Trout",
      formatName: null,
      packsPerBox: null,
      boxesPerCase: 12,
      manualOddsLines: [],
    });

    expect(result.results.length).toBe(0);
    expect(result.summary.count).toBe(0);
  });

  it("applies manual odds overrides", async () => {
    const result = await analyzeChecklist({
      checklistFile: makeFile(SAMPLE_CHECKLIST, "checklist.txt"),
      oddsFile: null,
      athlete: "Acuña",
      formatName: null,
      packsPerBox: null,
      boxesPerCase: 12,
      manualOddsLines: ["gold=1:480", "autograph=1:24"],
    });

    expect(result.results.length).toBeGreaterThan(0);
    // Cards with matched odds should have estimatedPackOdds
    const withOdds = result.results.filter((r) => r.estimatedPackOdds !== null);
    expect(withOdds.length).toBeGreaterThan(0);
  });

  it("includes Pull Signal Analysis (robust scores) on scored cards", async () => {
    const result = await analyzeChecklist({
      checklistFile: makeFile(SAMPLE_CHECKLIST, "checklist.txt"),
      oddsFile: null,
      athlete: "Acuña",
      formatName: null,
      packsPerBox: null,
      boxesPerCase: 12,
      manualOddsLines: [],
    });

    const withRobust = result.results.filter((r) => r.robust);
    expect(withRobust.length).toBeGreaterThan(0);

    const r = withRobust[0].robust!;
    expect(r.desirability).toBeGreaterThan(0);
    expect(r.signalStrength).toBeGreaterThanOrEqual(0);
    expect(["exceptional", "strong", "moderate", "weak"]).toContain(r.grade);
    expect(r.insight).toBeTruthy();
  });
});
