import { describe, expect, it } from "vitest";
import {
  findVenezuelanBio,
  formatBioDate,
  formatBioHeight,
  formatBioWeight,
  VenezuelanBioLookup,
} from "@/lib/venezuelan-bios";

const lookup: VenezuelanBioLookup = {
  players: {
    chouj001: {
      name: "Jackson Chourio", bats: "R", throws: "R", height: 71, weight: 198,
      hof: "", debut: "20240329", last: "20251017", birthCity: "Maracaibo", birthState: "Zulia",
    },
    acunr001: {
      name: "Ronald Acuna Jr.", bats: "R", throws: "R", height: 72, weight: 180,
      hof: "", debut: "20180425", last: "20250928", birthCity: "La Guaira", birthState: "Vargas",
    },
  },
  aliases: {
    "jackson chourio": "chouj001",
    "ronald acuna jr": "acunr001",
    "henderson alvarez": "chouj001",
  },
};

describe("Venezuelan biography matching", () => {
  it("matches Jackson Chourio exactly", () => {
    expect(findVenezuelanBio(lookup, "Jackson Chourio", "Baseball")?.birthCity).toBe("Maracaibo");
  });

  it("matches accents and a Jr. suffix", () => {
    expect(findVenezuelanBio(lookup, "Ronald Acuña Jr.", "Baseball")?.debut).toBe("20180425");
  });

  it("uses a unique base name when only the roster includes a suffix", () => {
    expect(findVenezuelanBio(lookup, "Henderson Alvarez III", "Baseball")?.name).toBe("Jackson Chourio");
  });

  it("does not assign biographies to non-baseball players or unknown names", () => {
    expect(findVenezuelanBio(lookup, "Jackson Chourio", "Soccer")).toBeNull();
    expect(findVenezuelanBio(lookup, "Carlos Hernandez", "Baseball")).toBeNull();
  });
});

describe("biography value formatting", () => {
  it("formats source dates as localized calendar dates", () => {
    expect(formatBioDate("20240329", "en")).toBe("Mar 29, 2024");
    expect(formatBioDate("20240230", "en")).toBe("—");
  });

  it("formats height and weight in imperial units", () => {
    expect(formatBioHeight(71)).toBe("5'11\"");
    expect(formatBioWeight(198)).toBe("198 lb");
    expect(formatBioHeight(null)).toBe("—");
    expect(formatBioWeight(null)).toBe("—");
  });
});
