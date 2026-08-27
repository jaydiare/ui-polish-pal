import { useEffect, useState } from "react";

export type CareerGroup = "hitting" | "pitching";

export interface CareerStats {
  group: CareerGroup;
  stat: Record<string, string | number>;
}

const normalize = (s: string) =>
  String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.'`]/g, "")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim();

// Module-level cache: normalized name -> stats (null = known miss)
const cache = new Map<string, CareerStats | null>();
const inflight = new Map<string, Promise<CareerStats | null>>();

const PITCHER_POSITIONS = new Set(["P", "SP", "RP", "TWP"]);

async function fetchJson(url: string): Promise<any | null> {
  // Throws on network failure so callers can show an error state;
  // returns null for non-OK responses (treated as "no data").
  const res = await fetch(url);
  if (!res.ok) return null;
  return await res.json();
}

async function loadCareerStats(name: string): Promise<CareerStats | null> {
  const target = normalize(name);

  // 1. Player lookup by name
  const search = await fetchJson(
    `https://statsapi.mlb.com/api/v1/people/search?names=${encodeURIComponent(name)}`,
  );
  let people: any[] = Array.isArray(search?.people) ? search.people : [];

  if (people.length === 0) {
    // Fallback: accent-stripped query
    const stripped = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (stripped !== name) {
      const alt = await fetchJson(
        `https://statsapi.mlb.com/api/v1/people/search?names=${encodeURIComponent(stripped)}`,
      );
      people = Array.isArray(alt?.people) ? alt.people : [];
    }
  }

  if (people.length === 0) return null;

  const person =
    people.find((p) => normalize(p?.fullName) === target) ??
    people.find((p) => normalize(p?.nameFirstLast ?? "") === target) ??
    people[0];

  if (!person?.id) return null;

  const isPitcher = PITCHER_POSITIONS.has(person?.primaryPosition?.abbreviation ?? "");

  // 2. Career stats
  const data = await fetchJson(
    `https://statsapi.mlb.com/api/v1/people/${person.id}/stats?stats=career&group=hitting,pitching`,
  );
  const blocks: any[] = Array.isArray(data?.stats) ? data.stats : [];
  if (blocks.length === 0) return null;

  const pick = (group: CareerGroup) => {
    const block = blocks.find((b) => b?.group?.displayName === group);
    const stat = block?.splits?.[0]?.stat;
    return stat && typeof stat === "object" ? (stat as Record<string, string | number>) : null;
  };

  const preferred: CareerGroup = isPitcher ? "pitching" : "hitting";
  const other: CareerGroup = preferred === "pitching" ? "hitting" : "pitching";

  const primary = pick(preferred);
  if (primary) return { group: preferred, stat: primary };
  const secondary = pick(other);
  if (secondary) return { group: other, stat: secondary };
  return null;
}

export function useMlbCareerStats(name: string, sport: string, enabled: boolean) {
  const active = enabled && sport === "Baseball" && !!name;
  const key = normalize(name);

  const [state, setState] = useState<{ loading: boolean; data: CareerStats | null }>(() =>
    active && cache.has(key)
      ? { loading: false, data: cache.get(key) ?? null }
      : { loading: active, data: null },
  );

  useEffect(() => {
    if (!active) {
      setState({ loading: false, data: null });
      return;
    }

    if (cache.has(key)) {
      setState({ loading: false, data: cache.get(key) ?? null });
      return;
    }

    let cancelled = false;
    setState({ loading: true, data: null });

    let promise = inflight.get(key);
    if (!promise) {
      promise = loadCareerStats(name)
        .catch(() => null)
        .then((result) => {
          cache.set(key, result);
          inflight.delete(key);
          return result;
        });
      inflight.set(key, promise);
    }

    promise.then((result) => {
      if (!cancelled) setState({ loading: false, data: result });
    });

    return () => {
      cancelled = true;
    };
  }, [active, key, name]);

  return state;
}
