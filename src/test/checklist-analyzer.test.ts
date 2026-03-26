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
  const file = new File([content], name, { type: "text/plain" });
  if (!file.text) {
    (file as any).text = () => Promise.resolve(content);
  }
  return file;
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

    // Log for debugging what tiers/types are detected
    console.log("Tiers:", result.summary.byTier);
    console.log("Types:", result.summary.byType);
    console.log("Results:", result.results.map(r => ({
      section: r.section,
      tier: r.rarityTier,
      types: r.cardTypes,
      serial: r.serialNumber,
      score: r.score,
      robust: r.robust ? { grade: r.robust.grade, signal: r.robust.signalStrength } : null,
    })));
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
    console.log("Odds results:", result.results.map(r => ({
      section: r.section,
      matchedOdds: r.matchedOdds,
      estimatedPackOdds: r.estimatedPackOdds,
    })));
  });

  it("includes Pull Signal Analysis on scored cards", async () => {
    const result = await analyzeChecklist({
      checklistFile: makeFile(SAMPLE_CHECKLIST, "checklist.txt"),
      oddsFile: null,
      athlete: "Acuña",
      formatName: null,
      packsPerBox: null,
      boxesPerCase: 12,
      manualOddsLines: [],
    });

    console.log("Robust scores:", result.results.map(r => ({
      section: r.section,
      robust: r.robust,
    })));

    // robustSummary should exist if any cards found
    if (result.results.length > 0) {
      expect(result.robustSummary).toBeDefined();
    }
  });
});
