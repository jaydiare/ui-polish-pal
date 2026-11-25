import { useEffect, useState } from "react";
import {
  findVenezuelanBio,
  isVenezuelanBioLookup,
  VenezuelanBio,
  VenezuelanBioLookup,
} from "@/lib/venezuelan-bios";

const LIVE_URL = "https://raw.githubusercontent.com/jaydiare/ui-polish-pal/main/data/venezuelan-bios.json";
const FALLBACK_URL = "/data/venezuelan-bios.json";
let sharedLookup: Promise<VenezuelanBioLookup | null> | null = null;

async function fetchLookup(url: string): Promise<VenezuelanBioLookup | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const text = await response.text();
    try {
      const parsed = JSON.parse(text);
      return isVenezuelanBioLookup(parsed) ? parsed : null;
    } catch {
      // The development preview exposes public JSON as a JavaScript assignment.
      const assignment = text.match(/^const __oj_json = ([\s\S]*?);\s*export default/);
      if (!assignment) return null;
      const parsed = JSON.parse(assignment[1]);
      return isVenezuelanBioLookup(parsed) ? parsed : null;
    }
  } catch {
    return null;
  }
}

function loadLookup(): Promise<VenezuelanBioLookup | null> {
  if (!sharedLookup) {
    sharedLookup = (async () => {
      const live = await fetchLookup(LIVE_URL);
      if (live) return live;
      return fetchLookup(FALLBACK_URL);
    })();
  }
  return sharedLookup;
}

export function useVenezuelanBio(name: string, sport: string, enabled: boolean): VenezuelanBio | null {
  const [bio, setBio] = useState<VenezuelanBio | null>(null);

  useEffect(() => {
    let active = true;
    if (!enabled || sport !== "Baseball") {
      setBio(null);
      return () => { active = false; };
    }

    loadLookup().then((lookup) => {
      if (active) setBio(findVenezuelanBio(lookup, name, sport));
    });
    return () => { active = false; };
  }, [name, sport, enabled]);

  return bio;
}
