import { Athlete, EbayAvgRecord, EbayAvgData } from "@/data/athletes";

// Helpers
function norm(s: string | undefined | null): string {
  return String(s || "").trim().toLowerCase();
}

function normKey(s: string | undefined | null): string {
  return String(s || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function makeNameSportKey(name: string | undefined, sport: string | undefined): string {
  return `${norm(name)}|${norm(sport)}`;
}

// Merge local + fetched athletes
export function mergeByNameSportKeepBest(localArr: Athlete[], fetchedArr: Athlete[]): Athlete[] {
  const map = new Map<string, Athlete>();
  const score = (o: Athlete) =>
    ["league", "team", "sport"].reduce((n, f) => n + ((o as any)?.[f] ? 1 : 0), 0);

  const add = (a: Athlete) => {
    const key = makeNameSportKey(a?.name, a?.sport);
    if (!key || key === "|") return;
    const prev = map.get(key);
    if (!prev) map.set(key, a);
    else map.set(key, score(a) >= score(prev) ? a : prev);
  };

  localArr.forEach(add);
  fetchedArr.forEach(add);
  return Array.from(map.values());
}

// eBay average lookups
export function buildEbayIndexes(obj: EbayAvgData) {
  const byName: Record<string, EbayAvgRecord> = {};
  const byKey: Record<string, EbayAvgRecord> = {};

  if (!obj || typeof obj !== "object") return { byName, byKey };

  for (const k of Object.keys(obj)) {
    if (k === "_meta") continue;
    const rec = obj[k] as EbayAvgRecord;
    if (!rec) continue;
    byName[k] = rec;
    if (rec?.sport) {
      byKey[makeNameSportKey(k, rec.sport)] = rec;
    }
  }
  return { byName, byKey };
}

export function getEbayAvgFor(
  athlete: Athlete,
  byName: Record<string, EbayAvgRecord>,
  byKey: Record<string, EbayAvgRecord>
): EbayAvgRecord | null {
  const key = makeNameSportKey(athlete.name, athlete.sport);
  return byKey[key] || byName[athlete.name] || null;
}

export function getEbayAvgNumber(
  athlete: Athlete,
  byName: Record<string, EbayAvgRecord>,
  byKey: Record<string, EbayAvgRecord>
): number | null {
  const avg = getEbayAvgFor(athlete, byName, byKey);
  const avgNum = avg?.avgListing ?? avg?.taguchiListing ?? avg?.trimmedListing ?? avg?.avg ?? avg?.average ?? null;
  if (avgNum == null) return null;
  const v = Number(avgNum);
  if (!Number.isFinite(v) || v <= 0) return null;
  return v;
}

export function getMarketStabilityCV(
  athlete: Athlete,
  byName: Record<string, EbayAvgRecord>,
  byKey: Record<string, EbayAvgRecord>
): number | null {
  const rec = getEbayAvgFor(athlete, byName, byKey);
  const v = rec?.marketStabilityCV ?? rec?.marketplaces?.EBAY_US?.marketStabilityCV ?? rec?.marketplaces?.EBAY_CA?.marketStabilityCV ?? null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function getAvgDaysOnMarket(
  athlete: Athlete,
  byName: Record<string, EbayAvgRecord>,
  byKey: Record<string, EbayAvgRecord>
): number | null {
  const rec = getEbayAvgFor(athlete, byName, byKey);
  const v = rec?.avgDaysOnMarket ?? rec?.marketplaces?.EBAY_US?.avgDaysOnMarket ?? rec?.marketplaces?.EBAY_CA?.avgDaysOnMarket ?? null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export interface StabilityScore {
  label: string;
  pctText: string;
  bucket: string;
}

export function marketStabilityScoreFromCV(cv: number | null): StabilityScore {
  if (cv == null) return { label: "—", pctText: "—", bucket: "none" };
  const pct = cv * 100;
  const pctText = `${pct.toFixed(0)}%`;
  if (pct < 10) return { label: "Stable", pctText, bucket: "stable" };
  if (pct < 20) return { label: "Active", pctText, bucket: "active" };
  if (pct < 35) return { label: "Volatile", pctText, bucket: "volatile" };
  return { label: "Highly Unstable", pctText, bucket: "highly_unstable" };
}

export function formatCurrency(amount: number, currency: string = "USD"): string {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "";
  const c = currency.toUpperCase();
  if (c === "CAD") return `CAD $${n.toFixed(2)}`;
  return `USD $${n.toFixed(2)}`;
}

export function buildEbaySearchUrl(name: string, sport: string): string {
  const query = encodeURIComponent(`${name} ${sport}`);
  return `https://www.ebay.ca/sch/i.html?_nkw=${query}&_sacat=261328&LH_BIN=1&LH_PrefLoc=1&mkevt=1&mkcid=1&mkrid=706-53473-19255-0&campid=5339142305&toolid=10001`;
}

export function initialsFromName(name: string): string {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "VZ";
  const a = parts[0]?.[0] || "";
  const b = parts.length > 1 ? (parts[1]?.[0] || "") : (parts[0]?.[1] || "");
  return (a + b).toUpperCase();
}

export function timeAgo(isoString: string): string {
  const then = new Date(isoString);
  if (isNaN(then.getTime())) return "—";
  const now = new Date();
  let seconds = Math.floor((now.getTime() - then.getTime()) / 1000);
  if (seconds < 0) seconds = 0;
  const mins = Math.floor(seconds / 60);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (seconds < 60) return `${seconds}s ago`;
  if (mins < 60) return `${mins}m ago`;
  if (hrs < 24) return `${hrs}h ago`;
  return `${days}d ago`;
}

export function computeIndexForSport(list: Athlete[], sportOrAll: string, byName: Record<string, EbayAvgRecord>, byKey: Record<string, EbayAvgRecord>) {
  let sum = 0;
  let used = 0;
  list.forEach((a) => {
    if (sportOrAll !== "All" && a.sport !== sportOrAll) return;
    const v = getEbayAvgNumber(a, byName, byKey);
    if (v != null) { sum += v; used += 1; }
  });
  return { sum, used };
}

export function getSportCounts(list: Athlete[]): Map<string, number> {
  const counts = new Map<string, number>();
  list.forEach((a) => {
    const sport = a?.sport || "Other";
    counts.set(sport, (counts.get(sport) || 0) + 1);
  });
  return counts;
}

export function formatIndexNumber(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("en-US").format(Math.round(n));
}

// Filtering
export interface Filters {
  search: string;
  category: string;
  league: string;
  price: string;
  stability: string;
}

export function filterAthletes(
  list: Athlete[],
  filters: Filters,
  byName: Record<string, EbayAvgRecord>,
  byKey: Record<string, EbayAvgRecord>
): Athlete[] {
  const q = norm(filters.search);

  let filtered = list
    .filter((a) => {
      if (filters.category === "all") return true;
      if (filters.category === "Other") return !["Baseball", "Soccer", "Basketball"].includes(a.sport);
      return a.sport === filters.category;
    })
    .filter((a) => {
      if (filters.league === "all") return true;
      return a.league === filters.league;
    })
    .filter((a) => {
      if (filters.stability === "all") return true;
      const cv = getMarketStabilityCV(a, byName, byKey);
      const bucket = marketStabilityScoreFromCV(cv).bucket;
      if (filters.stability === "none") return cv == null || bucket === "none";
      if (cv == null) return false;
      if (getEbayAvgNumber(a, byName, byKey) == null) return false;
      return bucket === filters.stability;
    })
    .filter((a) => !q || norm(a.name).includes(q));

  if (filters.price === "none") {
    filtered = filtered.filter((a) => getEbayAvgNumber(a, byName, byKey) == null);
  } else if (filters.price === "low" || filters.price === "high") {
    filtered = filtered.slice().sort((a, b) => {
      const pa = getEbayAvgNumber(a, byName, byKey);
      const pb = getEbayAvgNumber(b, byName, byKey);
      if (pa == null && pb == null) return 0;
      if (pa == null) return 1;
      if (pb == null) return -1;
      return filters.price === "low" ? pa - pb : pb - pa;
    });
  }

  return filtered;
}
