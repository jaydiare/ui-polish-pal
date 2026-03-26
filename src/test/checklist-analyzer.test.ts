import { describe, it, expect } from "vitest";
import { analyzeChecklist, parseChecklist } from "@/lib/checklist-analyzer";

const SAMPLE_CHECKLIST = `2024 TOPPS CHROME BASEBALL CHECKLIST

BASE SET
1 Ronald Acuña Jr. - Atlanta Braves
2 Shohei Ohtani - Los Angeles Dodgers
3 Mookie Betts - Los Angeles Dodgers

GOLD REFRACTOR /50
1 Ronald Acuña Jr. - Atlanta Braves
2 Shohei Ohtani - Los Angeles Dodgers

AUTOGRAPHS
RA Ronald Acuña Jr. - Atlanta Braves

SUPERFRACTOR 1/1
1 Ronald Acuña Jr. - Atlanta Braves

RED REFRACTOR /5
1 Ronald Acuña Jr. - Atlanta Braves

ROOKIE AUTOGRAPHS
RC1 Ronald Acuña Jr. - Atlanta Braves
`;

function makeFile(content: string, name: string): File {
  const file = new File([content], name, { type: "text/plain" });
  if (!file.text) {
    (file as any).text = () => Promise.resolve(content);
  }
  return file;
}

describe("parseChecklist", () => {
  it("detects sections and card types from uppercase headers", () => {
    const entries = parseChecklist(SAMPLE_CHECKLIST);
    const acunaCards = entries.filter((e) => e.athlete.toLowerCase().includes("acuña") || e.athlete.toLowerCase().includes("acuna"));

    expect(acunaCards.length).toBeGreaterThanOrEqual(4);

    const sections = new Set(acunaCards.map((e) => e.section));
    expect(sections.size).toBeGreaterThan(1);
  });

  it("detects serial numbers from section text", () => {
    const entries = parseChecklist(SAMPLE_CHECKLIST);
    const withSerial = entries.filter((e) => e.serialNumber !== null);
    expect(withSerial.length).toBeGreaterThan(0);
  });
});

describe("analyzeChecklist – end-to-end", () => {
  it("finds matching cards for a target athlete", async () => {
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

  it("produces Pull Signal Analysis (robust scores)", async () => {
    const result = await analyzeChecklist({
      checklistFile: makeFile(SAMPLE_CHECKLIST, "checklist.txt"),
      oddsFile: null,
      athlete: "Acuña",
      formatName: null,
      packsPerBox: null,
      boxesPerCase: 12,
      manualOddsLines: [],
    });

    if (result.results.length > 0) {
      expect(result.robustSummary).toBeDefined();
      const withRobust = result.results.filter((r) => r.robust);
      expect(withRobust.length).toBeGreaterThan(0);

      const r = withRobust[0].robust!;
      expect(r.signalStrength).toBeGreaterThanOrEqual(0);
      expect(["exceptional", "strong", "moderate", "weak"]).toContain(r.grade);
      expect(r.insight).toBeTruthy();
    }
  });

  it("processes manual odds overrides without errors", async () => {
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
  });
});
