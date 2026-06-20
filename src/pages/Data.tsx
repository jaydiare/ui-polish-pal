import { useState, useEffect, useMemo, useRef, useCallback, lazy, Suspense } from "react";
import { motion } from "framer-motion";
import SEOHead from "@/components/SEOHead";
import SocialShare from "@/components/SocialShare";
import VzlaNavbar from "@/components/VzlaNavbar";
import VzlaFooter from "@/components/VzlaFooter";
import VzlaEbayFooter from "@/components/VzlaEbayFooter";
import VzlaSideBanner from "@/components/VzlaSideBanner";
import VzlaSupplyCurves from "@/components/VzlaSupplyCurves";
import Sparkline from "@/components/Sparkline";
import { buildEbaySearchUrl, buildEbayGradedSearchUrl } from "@/lib/vzla-helpers";
const EpnPlacementSummary = lazy(() => import("@/components/EpnPlacementSummary"));
const SalesTrendsTable = lazy(() => import("@/components/SalesTrendsTable"));
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  Legend,
} from "recharts";

/* ── Types ── */
interface SoldRecord { avg?: number; taguchiSold?: number; lastKnownSold?: number; lastKnownSoldAt?: string }
interface ListedRecord {
  avgListing?: number; taguchiListing?: number; trimmedListing?: number;
  avg?: number; average?: number; sport?: string;
  marketplaces?: Record<string, { avgListing?: number; taguchiListing?: number }>;
}

function getListedPrice(rec: ListedRecord | undefined): number | null {
  if (!rec) return null;
  const mp = rec.marketplaces;
  if (mp) {
    const vals: number[] = [];
    for (const m of Object.values(mp)) {
      const v = m?.taguchiListing ?? m?.avgListing;
      if (v != null && Number.isFinite(v) && v > 0) vals.push(v);
    }
    if (vals.length) return vals.reduce((a, b) => a + b, 0) / vals.length;
  }
  const v = rec.taguchiListing ?? rec.avgListing ?? rec.trimmedListing ?? rec.avg ?? rec.average ?? null;
  return v != null && Number.isFinite(v) && v > 0 ? v : null;
}

function getSoldPrice(rec: SoldRecord | undefined): number | null {
  if (!rec) return null;
  const v = rec.taguchiSold ?? rec.avg ?? rec.lastKnownSold ?? null;
  return v != null && Number.isFinite(v) && v > 0 ? v : null;
}

async function fetchJson(url: string) {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

const SPORT_COLORS: Record<string, string> = {
  Baseball: "hsl(45, 93%, 47%)",
  Soccer: "hsl(142, 71%, 45%)",
  Basketball: "hsl(25, 95%, 53%)",
  Football: "hsl(221, 83%, 53%)",
  All: "hsl(280, 70%, 55%)",
  Other: "hsl(270, 60%, 55%)",
};

const SPORT_ICONS: Record<string, string> = {
  Baseball: "⚾", Soccer: "⚽", Basketball: "🏀", Football: "🏈", All: "🏆", Other: "🏅",
};

function getSportColor(sport: string) {
  return SPORT_COLORS[sport] || SPORT_COLORS.Other;
}

/* ── Toggle component ── */
type CardMode = "raw" | "graded" | "both";

const ModeToggle = ({ value, onChange, className = "" }: { value: CardMode; onChange: (v: CardMode) => void; className?: string }) => (
  <div className={`inline-flex items-center rounded-full border border-border/50 bg-card/80 backdrop-blur-sm p-0.5 ${className}`}>
    <button
      onClick={() => onChange("raw")}
      className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wide transition-all ${value === "raw" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}
    >
      🃏 Raw
    </button>
    <button
      onClick={() => onChange("graded")}
      className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wide transition-all ${value === "graded" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}
    >
      🏅 Graded
    </button>
    <button
      onClick={() => onChange("both")}
      className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wide transition-all ${value === "both" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}
    >
      ⚖️ Both
    </button>
  </div>
);

/* ── Custom tooltip ── */
const PriceTooltip = ({ payload }: any) => {
  if (!payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  const isRawVsGraded = d.variant === "raw-vs-graded";
  return (
    <div className="rounded-xl border border-border/50 bg-background/95 backdrop-blur-lg p-3 text-xs shadow-2xl">
      <a
        href={buildEbaySearchUrl(d.name, d.sport)}
        target="_blank"
        rel="noopener noreferrer"
        className="font-display font-bold text-foreground hover:text-primary transition-colors underline decoration-dotted underline-offset-2"
      >
        {d.name} ↗
      </a>
      <div className="text-muted-foreground text-[10px] mb-1.5">{d.sport}</div>
      <div className="flex flex-col gap-0.5">
        {isRawVsGraded ? (
          <>
            <span className="text-muted-foreground">Raw Listed: <strong className="text-foreground">${d.sold.toFixed(2)}</strong></span>
            <span className="text-muted-foreground">Graded Listed: <strong className="text-foreground">${d.listed.toFixed(2)}</strong></span>
            <span className="text-muted-foreground">Premium: <strong className={d.spread > 0 ? "text-green-400" : "text-red-400"}>
              {d.spread > 0 ? "+" : ""}${d.spread.toFixed(2)}
            </strong></span>
          </>
        ) : (
          <>
            <span className="text-muted-foreground">Listed: <strong className="text-foreground">${d.listed.toFixed(2)}</strong></span>
            <span className="text-muted-foreground">Sold: <strong className="text-foreground">${d.sold.toFixed(2)}</strong></span>
            <span className="text-muted-foreground">Spread: <strong className={d.spread > 0 ? "text-red-400" : "text-green-400"}>
              {d.spread > 0 ? "+" : ""}${d.spread.toFixed(2)}
            </strong></span>
          </>
        )}
      </div>
      <div className="text-[9px] text-muted-foreground/60 mt-1.5">Click name to search eBay</div>
    </div>
  );
};

/* ── Pinned tooltip for scatter chart ── */
interface PinnedData {
  name: string; sport: string; listed: number; sold: number; spread: number; cx: number; cy: number;
  variant?: "raw-vs-graded";
}

const PinnedScatterTooltip = ({ data, onClose }: { data: PinnedData; onClose: () => void }) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => { document.removeEventListener("mousedown", handler); document.removeEventListener("touchstart", handler); };
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute z-50 rounded-xl border border-border/50 bg-background/95 backdrop-blur-lg p-3 text-xs shadow-2xl"
      style={{ left: Math.min(data.cx + 12, 220), top: Math.max(data.cy - 10, 0), pointerEvents: "auto", minWidth: 160 }}
    >
      <a href={buildEbaySearchUrl(data.name, data.sport)} target="_blank" rel="noopener noreferrer"
        className="font-display font-bold text-foreground hover:text-primary transition-colors underline decoration-dotted underline-offset-2">
        {data.name} ↗
      </a>
      <div className="text-muted-foreground text-[10px] mb-1.5">{data.sport}</div>
      <div className="flex flex-col gap-0.5">
        {data.variant === "raw-vs-graded" ? (
          <>
            <span className="text-muted-foreground">Raw Listed: <strong className="text-foreground">${data.sold.toFixed(2)}</strong></span>
            <span className="text-muted-foreground">Graded Listed: <strong className="text-foreground">${data.listed.toFixed(2)}</strong></span>
            <span className="text-muted-foreground">Premium: <strong className={data.spread > 0 ? "text-green-400" : "text-red-400"}>
              {data.spread > 0 ? "+" : ""}${data.spread.toFixed(2)}
            </strong></span>
          </>
        ) : (
          <>
            <span className="text-muted-foreground">Listed: <strong className="text-foreground">${data.listed.toFixed(2)}</strong></span>
            <span className="text-muted-foreground">Sold: <strong className="text-foreground">${data.sold.toFixed(2)}</strong></span>
            <span className="text-muted-foreground">Spread: <strong className={data.spread > 0 ? "text-red-400" : "text-green-400"}>
              {data.spread > 0 ? "+" : ""}${data.spread.toFixed(2)}
            </strong></span>
          </>
        )}
      </div>
      <div className="text-[9px] text-muted-foreground/60 mt-1.5">Tap name to search eBay</div>
    </div>
  );
};

/* ── Helper: build comparison items from listed + sold ── */
function buildComparison(
  listedData: Record<string, ListedRecord>,
  soldData: Record<string, SoldRecord>,
  athleteSportMap: Record<string, string>,
) {
  const items: { name: string; sport: string; listed: number; sold: number; spread: number }[] = [];
  const allKeys = new Set([...Object.keys(listedData), ...Object.keys(soldData)]);
  for (const key of allKeys) {
    if (key === "_meta") continue;
    const lp = getListedPrice(listedData[key] as ListedRecord);
    const sp = getSoldPrice(soldData[key] as SoldRecord);
    if (lp == null || sp == null) continue;
    const ratio = Math.max(lp, sp) / Math.max(Math.min(lp, sp), 0.01);
    if (ratio > 10) continue;
    const normKey = key.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[.\-']/g, "").replace(/\s+/g, " ").toLowerCase().trim();
    const sport = athleteSportMap[key] || athleteSportMap[normKey];
    if (!sport) continue; // skip athletes not in the roster
    items.push({ name: key, sport, listed: Math.round(lp * 100) / 100, sold: Math.round(sp * 100) / 100, spread: Math.round((lp - sp) * 100) / 100 });
  }
  return items;
}

function buildStats(comparisonData: { listed: number; sold: number; spread: number }[]) {
  if (!comparisonData.length) return null;
  const avgSpread = comparisonData.reduce((s, d) => s + d.spread, 0) / comparisonData.length;
  const overpriced = comparisonData.filter(d => d.spread > 0).length;
  const underpriced = comparisonData.filter(d => d.spread < 0).length;
  return { avgSpread, overpriced, underpriced, matched: comparisonData.length };
}

const Data = () => {
  // Raw data
  const [listedData, setListedData] = useState<Record<string, ListedRecord>>({});
  const [soldData, setSoldData] = useState<Record<string, SoldRecord>>({});
  // Graded data
  const [gradedListedData, setGradedListedData] = useState<Record<string, ListedRecord>>({});
  const [gradedSoldData, setGradedSoldData] = useState<Record<string, SoldRecord>>({});

  const [athleteSportMap, setAthleteSportMap] = useState<Record<string, string>>({});
  const [gemrateSet, setGemrateSet] = useState<Set<string>>(new Set());
  const [pinnedDot, setPinnedDot] = useState<PinnedData | null>(null);
  const scatterWrapRef = useRef<HTMLDivElement>(null);
  const [athleteHistory, setAthleteHistory] = useState<Record<string, any[]>>({});
  // Per-section toggles
  const [scatterSportFilter, setScatterSportFilter] = useState<string | null>(null);
  const [scatterSearch, setScatterSearch] = useState<string>("");
  
  const [supplyMode, setSupplyMode] = useState<CardMode>("raw");
  const [signalMode, setSignalMode] = useState<CardMode>("raw");

  const handleScatterClick = useCallback((state: any) => {
    if (!state?.activePayload?.length) { setPinnedDot(null); return; }
    const d = state.activePayload[0]?.payload;
    if (!d?.name) { setPinnedDot(null); return; }
    const cx = state.chartX ?? 0;
    const cy = state.chartY ?? 0;
    setPinnedDot({
      name: d.name, sport: d.sport, listed: d.listed, sold: d.sold,
      spread: d.spread ?? d.listed - d.sold, cx, cy,
      variant: "raw-vs-graded",
    });
  }, []);

  const closePinned = useCallback(() => setPinnedDot(null), []);

  useEffect(() => {
    Promise.all([
      fetchJson("https://raw.githubusercontent.com/jaydiare/ui-polish-pal/main/data/ebay-avg.json"),
      fetchJson("https://raw.githubusercontent.com/jaydiare/ui-polish-pal/main/data/ebay-sold-avg.json"),
      fetchJson("https://raw.githubusercontent.com/jaydiare/ui-polish-pal/main/data/ebay-graded-avg.json"),
      fetchJson("https://raw.githubusercontent.com/jaydiare/ui-polish-pal/main/data/ebay-graded-sold-avg.json"),
      fetchJson("data/athletes.json"),
      fetchJson("https://raw.githubusercontent.com/jaydiare/ui-polish-pal/main/data/athlete-history.json"),
    ]).then(([listed, sold, gradedListed, gradedSold, athletes, history]) => {
      if (listed) setListedData(listed);
      if (sold) setSoldData(sold);
      if (gradedListed) setGradedListedData(gradedListed);
      if (gradedSold) setGradedSoldData(gradedSold);
      const map: Record<string, string> = {};
      const grSet = new Set<string>();
      const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[.\-']/g, "").replace(/\s+/g, " ").toLowerCase().trim();
      if (athletes && Array.isArray(athletes)) {
        for (const a of athletes) {
          if (a?.name && a?.sport) {
            map[a.name] = a.sport;
            map[norm(a.name)] = a.sport;
          }
          // Track which athletes have gemrate="yes" (eligible for graded data)
          if (a?.name && a?.gemrate?.toLowerCase() === "yes") {
            grSet.add(a.name);
            grSet.add(norm(a.name));
          }
        }
      }
      // Also populate sport map from eBay data keys (which carry .sport)
      // Only add if the athlete is already in the roster to avoid removed athletes reappearing
      const rosterNames = new Set(Object.keys(map));
      for (const src of [listed, gradedListed]) {
        if (!src || typeof src !== "object") continue;
        for (const [key, rec] of Object.entries(src)) {
          if (key === "_meta" || !rec) continue;
          const sport = (rec as any)?.sport;
          if (sport && !map[key] && (rosterNames.has(key) || rosterNames.has(norm(key)))) {
            map[key] = sport;
          }
        }
      }
      setAthleteSportMap(map);
      setGemrateSet(grSet);
      if (history && typeof history === "object") setAthleteHistory(history);
    });
  }, []);

  // Filter graded data to only include athletes with gemrate="yes"
  const filterByGemrate = useCallback((data: Record<string, any>) => {
    if (gemrateSet.size === 0) return data; // no filter data yet
    const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[.\-']/g, "").replace(/\s+/g, " ").toLowerCase().trim();
    const filtered: Record<string, any> = {};
    for (const [key, val] of Object.entries(data)) {
      if (key === "_meta" || gemrateSet.has(key) || gemrateSet.has(norm(key))) {
        filtered[key] = val;
      }
    }
    return filtered;
  }, [gemrateSet]);

  const filteredGradedListed = useMemo(() => filterByGemrate(gradedListedData), [gradedListedData, filterByGemrate]);
  const filteredGradedSold = useMemo(() => filterByGemrate(gradedSoldData), [gradedSoldData, filterByGemrate]);

  // Merge graded listed with graded sold as fallback (graded listed may be sparse/empty)
  const mergedGradedListed = useMemo(() => {
    const merged: Record<string, ListedRecord> = {};
    // Start with sold data mapped to listed fields
    for (const [key, val] of Object.entries(filteredGradedSold)) {
      if (key === "_meta" || !val) continue;
      const r = val as any;
      const soldPrice = r.taguchiSold ?? r.avg;
      if (soldPrice != null && Number.isFinite(soldPrice) && soldPrice > 0) {
        merged[key] = { ...r, avgListing: soldPrice, taguchiListing: soldPrice, avg: soldPrice, average: soldPrice };
      }
    }
    // Override with actual listed data where available
    for (const [key, val] of Object.entries(filteredGradedListed)) {
      if (key === "_meta" || !val) continue;
      const lp = getListedPrice(val as ListedRecord);
      if (lp != null) merged[key] = val as ListedRecord;
    }
    return merged;
  }, [filteredGradedListed, filteredGradedSold]);

  /* ── Comparison data per mode ── */
  const rawComparison = useMemo(() => buildComparison(listedData, soldData, athleteSportMap), [listedData, soldData, athleteSportMap]);
  const gradedComparison = useMemo(() => buildComparison(mergedGradedListed, filteredGradedSold, athleteSportMap), [mergedGradedListed, filteredGradedSold, athleteSportMap]);

  const rawStats = useMemo(() => buildStats(rawComparison), [rawComparison]);
  const gradedStats = useMemo(() => buildStats(gradedComparison), [gradedComparison]);

  // Listing-only arrays (no sold required) for the Raw vs Graded Supply Curves
  const rawListingOnly = useMemo(() => {
    const out: { name: string; listed: number; sport?: string }[] = [];
    for (const [key, rec] of Object.entries(listedData)) {
      if (key === "_meta") continue;
      const lp = getListedPrice(rec as ListedRecord);
      if (lp != null && lp > 0) out.push({ name: key, listed: lp, sport: athleteSportMap[key] });
    }
    return out;
  }, [listedData, athleteSportMap]);

  const gradedListingOnly = useMemo(() => {
    const out: { name: string; listed: number; sport?: string }[] = [];
    for (const [key, rec] of Object.entries(mergedGradedListed)) {
      if (key === "_meta") continue;
      const lp = getListedPrice(rec as ListedRecord);
      if (lp != null && lp > 0) out.push({ name: key, listed: lp, sport: athleteSportMap[key] });
    }
    return out;
  }, [mergedGradedListed, athleteSportMap]);

  /* ── Per-section active data ── */
  
  const supplyComparison = supplyMode === "graded" ? gradedComparison : rawComparison;

  // Listed Raw vs Listed Graded: athletes that have BOTH a raw listed and graded listed price
  const listedRawVsGradedData = useMemo(() => {
    const items: { name: string; sport: string; listed: number; sold: number; spread: number; variant: "raw-vs-graded" }[] = [];
    const keys = new Set([...Object.keys(listedData), ...Object.keys(mergedGradedListed)]);
    for (const key of keys) {
      if (key === "_meta") continue;
      const raw = getListedPrice(listedData[key] as ListedRecord);
      const graded = getListedPrice(mergedGradedListed[key] as ListedRecord);
      if (raw == null || graded == null) continue;
      const ratio = Math.max(raw, graded) / Math.max(Math.min(raw, graded), 0.01);
      if (ratio > 50) continue; // looser cap: graded can be much pricier than raw
      const normKey = key.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[.\-']/g, "").replace(/\s+/g, " ").toLowerCase().trim();
      const sport = athleteSportMap[key] || athleteSportMap[normKey];
      if (!sport) continue;
      // Reuse fields: listed=graded (Y axis), sold=raw (X axis), spread=graded premium over raw
      items.push({
        name: key, sport,
        listed: Math.round(graded * 100) / 100,
        sold: Math.round(raw * 100) / 100,
        spread: Math.round((graded - raw) * 100) / 100,
        variant: "raw-vs-graded",
      });
    }
    return items;
  }, [listedData, mergedGradedListed, athleteSportMap]);

  const listedVsListedScatter = scatterSportFilter
    ? listedRawVsGradedData.filter(d => d.sport === scatterSportFilter)
    : listedRawVsGradedData;

  // Dynamic log-scale axis bounds based on data percentiles (tight fit, drop outliers)
  const scatterAxisBounds = useMemo(() => {
    const niceFloor = (v: number) => {
      const candidates = [0.5, 1, 2, 5, 10, 25, 50, 100];
      for (let i = candidates.length - 1; i >= 0; i--) if (candidates[i] <= v) return candidates[i];
      return 0.5;
    };
    const niceCeil = (v: number) => {
      const candidates = [1, 2, 5, 10, 25, 50, 100, 200, 500, 1000, 2500, 5000];
      for (const c of candidates) if (c >= v) return c;
      return 5000;
    };
    const pct = (arr: number[], p: number) => {
      if (!arr.length) return 0;
      const s = [...arr].sort((a, b) => a - b);
      const idx = Math.min(s.length - 1, Math.max(0, Math.floor(p * (s.length - 1))));
      return s[idx];
    };
    const xs = listedVsListedScatter.map(d => d.sold).filter(v => v > 0);
    const ys = listedVsListedScatter.map(d => d.listed).filter(v => v > 0);
    const xMin = xs.length ? niceFloor(pct(xs, 0.02)) : 0.5;
    const xMax = xs.length ? niceCeil(pct(xs, 0.99)) : 100;
    const yMin = ys.length ? niceFloor(pct(ys, 0.02)) : 1;
    const yMax = ys.length ? niceCeil(pct(ys, 0.99)) : 500;
    const allTicks = [0.5, 1, 2, 5, 10, 25, 50, 100, 200, 500, 1000, 2500, 5000];
    const xTicks = allTicks.filter(t => t >= xMin && t <= xMax);
    const yTicks = allTicks.filter(t => t >= yMin && t <= yMax);
    return { xMin, xMax, yMin, yMax, xTicks, yTicks };
  }, [listedVsListedScatter]);

  // Top 10 graded premiums (graded listed - raw listed), largest absolute first
  const topSpread = useMemo(() =>
    [...listedRawVsGradedData].sort((a, b) => Math.abs(b.spread) - Math.abs(a.spread)).slice(0, 10),
    [listedRawVsGradedData]);

  /* ── Investment Signal Score (listing-only) ── */
  type SignalCategory = "premium_listing" | "fast_mover" | "speculative" | "stale_inventory";

  interface SignalAthlete {
    name: string;
    sport: string;
    listed: number;        // active listed price for the current mode
    rawListed: number | null;
    gradedListed: number | null;
    premiumPct: number | null; // graded premium over raw, %
    cv: number | null;
    days: number | null;
    sn: number | null;
    signal: SignalCategory;
  }

  const SIGNAL_META: Record<SignalCategory, { label: string; emoji: string; color: string; desc: string }> = {
    premium_listing: { label: "Premium Listing", emoji: "🟢", color: "hsl(142, 71%, 45%)", desc: "Graded asks far above raw with stable pricing" },
    fast_mover: { label: "Fast Mover", emoji: "⚡", color: "hsl(45, 93%, 47%)", desc: "Low days on market, high liquidity" },
    speculative: { label: "Speculative", emoji: "🎲", color: "hsl(280, 70%, 55%)", desc: "High listing volatility, potential flip opportunity" },
    stale_inventory: { label: "Stale Inventory", emoji: "🔴", color: "hsl(0, 72%, 50%)", desc: "Sitting on the market, slow to clear" },
  };

  const signalAthletes = useMemo(() => {
    // Build a unified roster of athletes that have a listing in the active mode
    type Row = { name: string; sport: string; listed: number };
    let rows: Row[] = [];
    const pickSport = (key: string) => {
      const normKey = key.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[.\-']/g, "").replace(/\s+/g, " ").toLowerCase().trim();
      return athleteSportMap[key] || athleteSportMap[normKey] || null;
    };

    const collect = (src: Record<string, ListedRecord>) => {
      for (const key of Object.keys(src)) {
        if (key === "_meta") continue;
        const lp = getListedPrice(src[key] as ListedRecord);
        if (lp == null) continue;
        const sport = pickSport(key);
        if (!sport) continue;
        rows.push({ name: key, sport, listed: Math.round(lp * 100) / 100 });
      }
    };

    if (signalMode === "raw") {
      collect(listedData);
    } else if (signalMode === "graded") {
      collect(mergedGradedListed);
    } else {
      collect(listedData);
      const seen = new Set(rows.map(r => r.name));
      for (const key of Object.keys(mergedGradedListed)) {
        if (key === "_meta" || seen.has(key)) continue;
        const lp = getListedPrice(mergedGradedListed[key] as ListedRecord);
        if (lp == null) continue;
        const sport = pickSport(key);
        if (!sport) continue;
        rows.push({ name: key, sport, listed: Math.round(lp * 100) / 100 });
      }
    }

    const results: SignalAthlete[] = [];
    for (const d of rows) {
      const rec = (signalMode === "graded" ? mergedGradedListed[d.name] : listedData[d.name]) as any;
      const cv: number | null = rec?.marketStabilityCV ?? rec?.marketplaces?.EBAY_US?.marketStabilityCV ?? null;
      const apiDays: number | null = rec?.avgDaysOnMarket ?? rec?.marketplaces?.EBAY_US?.avgDaysOnMarket ?? null;
      let days: number | null = apiDays != null && apiDays > 0 ? apiDays : null;
      if (days == null) {
        const hist = athleteHistory[d.name];
        const key = signalMode === "graded" ? "graded" : "raw";
        if (hist?.length) {
          const last = hist[hist.length - 1];
          const obsDays = last?.[key]?.obsDays;
          if (obsDays != null && Number.isFinite(obsDays) && obsDays > 0) days = obsDays;
        }
      }

      const rawListed = getListedPrice(listedData[d.name] as ListedRecord);
      const gradedListed = getListedPrice(mergedGradedListed[d.name] as ListedRecord);
      const premiumPct = (rawListed != null && rawListed > 0 && gradedListed != null)
        ? ((gradedListed - rawListed) / rawListed) * 100
        : null;

      // Classic Taguchi S/N = 10 * log10(1 / cv²)
      const mean = rec?.taguchiListing ?? rec?.avgListing ?? rec?.trimmedListing ?? rec?.avg ?? rec?.average ?? null;
      const sn: number | null = (cv != null && cv > 0 && mean != null && mean > 0)
        ? Math.round(10 * Math.log10(1 / (cv * cv)) * 100) / 100
        : null;

      let signal: SignalCategory;
      if (cv != null && cv >= 0.35) {
        signal = "speculative";
      } else if (premiumPct != null && premiumPct >= 100 && (cv == null || cv < 0.25)) {
        signal = "premium_listing";
      } else if (days != null && days < 180) {
        signal = "fast_mover";
      } else if (days != null && days > 365) {
        signal = "stale_inventory";
      } else if (days != null && days < 250) {
        signal = "fast_mover";
      } else if (premiumPct != null && premiumPct >= 50 && (cv == null || cv < 0.30)) {
        signal = "premium_listing";
      } else {
        signal = "stale_inventory";
      }

      results.push({
        name: d.name, sport: d.sport, listed: d.listed,
        rawListed: rawListed != null ? Math.round(rawListed * 100) / 100 : null,
        gradedListed: gradedListed != null ? Math.round(gradedListed * 100) / 100 : null,
        premiumPct, cv, days, sn, signal,
      });
    }

    return results;
  }, [signalMode, listedData, mergedGradedListed, athleteSportMap, athleteHistory]);

  const signalGroups = useMemo(() => {
    const groups: Record<SignalCategory, SignalAthlete[]> = {
      premium_listing: [], fast_mover: [], speculative: [], stale_inventory: [],
    };
    for (const a of signalAthletes) groups[a.signal].push(a);
    // Sort: premium by premiumPct desc, fast by days asc, speculative by cv desc, stale by days desc
    groups.premium_listing.sort((a, b) => (b.premiumPct ?? 0) - (a.premiumPct ?? 0));
    groups.fast_mover.sort((a, b) => (a.days ?? Infinity) - (b.days ?? Infinity));
    groups.speculative.sort((a, b) => (b.cv ?? 0) - (a.cv ?? 0));
    groups.stale_inventory.sort((a, b) => (b.days ?? 0) - (a.days ?? 0));
    return groups;
  }, [signalAthletes]);

  // Top 10 athletes by Taguchi S/N ratio for the Signal Strength card
  const signalStrengthTop = useMemo(() => {
    const SN_CAP = 40;
    return [...signalAthletes]
      .filter((a) => a.sn != null && Number.isFinite(a.sn) && a.cv != null && a.cv >= 0.01)
      .map((a) => ({ ...a, sn: Math.min(a.sn!, SN_CAP) }))
      .sort((a, b) => (b.sn ?? 0) - (a.sn ?? 0))
      .slice(0, 10);
  }, [signalAthletes]);

  /* ── Sport Aggregation helper ── */
  function buildSportAgg(
    listed: Record<string, ListedRecord>,
    sold: Record<string, SoldRecord>,
    sportMap: Record<string, string>,
  ) {
    const agg: Record<string, { listed: number; sold: number; listedCount: number; soldCount: number; totalCount: number }> = {};
    const addSport = (sport: string) => {
      if (!agg[sport]) agg[sport] = { listed: 0, sold: 0, listedCount: 0, soldCount: 0, totalCount: 0 };
    };

    const allKeys = new Set([...Object.keys(listed), ...Object.keys(sold)]);
    for (const key of allKeys) {
      if (key === "_meta") continue;
      const normKey = key.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[.\-']/g, "").replace(/\s+/g, " ").toLowerCase().trim();
      const sport = sportMap[key] || sportMap[normKey];
      if (!sport) continue; // skip athletes not in the roster
      addSport(sport);
      const lp = getListedPrice(listed[key] as ListedRecord);
      const sp = getSoldPrice(sold[key] as SoldRecord);
      if (lp != null) { agg[sport].listed += lp; agg[sport].listedCount += 1; }
      if (sp != null) { agg[sport].sold += sp; agg[sport].soldCount += 1; }
      agg[sport].totalCount += 1;
    }

    const entries = Object.entries(agg)
      .map(([sport, v]) => ({
        sport,
        avgListed: v.listedCount > 0 ? Math.round((v.listed / v.listedCount) * 100) / 100 : 0,
        avgSold: v.soldCount > 0 ? Math.round((v.sold / v.soldCount) * 100) / 100 : 0,
        totalListed: Math.round(v.listed * 100) / 100,
        totalSold: Math.round(v.sold * 100) / 100,
        count: v.totalCount,
      }))
      // Hide sports with no price data at all
      .filter(e => e.avgListed > 0 || e.avgSold > 0)
      .sort((a, b) => b.count - a.count);

    const allListed = entries.reduce((s, e) => s + e.totalListed, 0);
    const allSold = entries.reduce((s, e) => s + e.totalSold, 0);
    const allCount = entries.reduce((s, e) => s + e.count, 0);
    const allListedCount = Object.values(agg).reduce((s, v) => s + v.listedCount, 0);
    const allSoldCount = Object.values(agg).reduce((s, v) => s + v.soldCount, 0);

    entries.push({
      sport: "All",
      avgListed: allListedCount > 0 ? Math.round((allListed / allListedCount) * 100) / 100 : 0,
      avgSold: allSoldCount > 0 ? Math.round((allSold / allSoldCount) * 100) / 100 : 0,
      totalListed: Math.round(allListed * 100) / 100,
      totalSold: Math.round(allSold * 100) / 100,
      count: allCount,
    });

    return entries;
  }

  const rawSportAgg = useMemo(() => buildSportAgg(listedData, soldData, athleteSportMap), [listedData, soldData, athleteSportMap]);
  const gradedSportAgg = useMemo(() => buildSportAgg(mergedGradedListed, filteredGradedSold, athleteSportMap), [mergedGradedListed, filteredGradedSold, athleteSportMap]);

  // Build a lookup for graded by sport name
  const gradedSportMap = useMemo(() => {
    const m: Record<string, typeof rawSportAgg[0]> = {};
    gradedSportAgg.forEach(s => { m[s.sport] = s; });
    return m;
  }, [gradedSportAgg]);

  const hasData = rawComparison.length > 0;

  return (
    <div className="min-h-screen">
      <SEOHead
        title="Market Intel – Listed vs Sold Price Analytics"
        description="Compare listed vs sold prices for 550+ Venezuelan athletes' trading cards. Scatter plots, price gaps, supply & demand charts, and investment signal scores with last update timestamps."
        path="/data"
      />
      <VzlaNavbar />
      <VzlaSideBanner />
      <main className="page-shell" role="main">
        {/* ── Hero ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="pt-8 pb-4"
        >
          <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-1">
            Market Intel
          </h1>
          <p className="text-muted-foreground text-sm max-w-2xl leading-relaxed mb-3">
            Listed vs sold price analytics for Venezuelan athletes trading cards. Data powered by eBay.
          </p>
          <div className="text-muted-foreground text-xs max-w-2xl leading-relaxed space-y-2 mb-2">
            <p>
              This dashboard compares what cards are <strong className="text-foreground">listed for</strong> against what they actually <strong className="text-foreground">sell for</strong> on eBay — revealing where the market is overpricing, underpricing, or fairly valuing each athlete's cards. Prices are calculated using the <strong className="text-foreground">Taguchi Winsorized Mean</strong>, which removes extreme outliers for accuracy, from live eBay market scans across 550+ Venezuelan athletes.
            </p>
            <p>
              Use the scatter plots to spot arbitrage opportunities, the price gap charts to find the biggest spreads, and the investment signal grid to identify undervalued, volatile, or overpriced cards at a glance.
            </p>
          </div>
          <div className="mt-3 flex items-center gap-3 flex-wrap">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-card/80 backdrop-blur-sm px-4 py-1.5">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs text-muted-foreground font-medium">Last update</span>
            </div>
            <div className="ml-auto">
              <SocialShare
                url="https://vzlasportselite.com/data"
                title="Market Intel – Venezuelan Athletes Trading Cards Price Analytics"
                compact
              />
            </div>
          </div>
        </motion.div>

        {!hasData ? (
          <div className="glass-panel p-16 text-center my-8">
            <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto mb-4" />
            <div className="text-muted-foreground text-sm">Loading market data…</div>
          </div>
        ) : (
          <>
            {/* ── Scatter: Listed Raw vs Listed Graded ── */}
            <section className="my-8" aria-label="Listed Raw vs Listed Graded scatter chart">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
                <h2 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
                  <span className="w-1 h-5 rounded-full bg-primary inline-block" />
                  Listed Raw vs Listed Graded
                </h2>
              </div>
              <p className="text-xs text-muted-foreground mb-1 ml-3">
                Each dot is an athlete with both raw and graded listings. The further above the diagonal, the bigger the graded premium.
              </p>
              <p className="text-xs text-muted-foreground mb-4 ml-3">
                <strong className="text-foreground">Dots above the line</strong> = graded cards command a premium over raw, typical for stars and rookies.{" "}
                <strong className="text-foreground">Dots below the line</strong> = raw is asking more than graded, an unusual signal worth a closer look.{" "}
                Axes use a logarithmic scale so cheaper athletes spread out instead of stacking near zero.
              </p>
              <div className="glass-panel p-4 md:p-6">
                <div className="mb-4 flex items-center gap-2 flex-wrap">
                  <div className="relative flex-1 min-w-[220px] max-w-md">
                    <input
                      type="text"
                      value={scatterSearch}
                      onChange={(e) => setScatterSearch(e.target.value)}
                      placeholder="Search any athlete (e.g. Salvador Perez)…"
                      className="w-full rounded-full border border-border/50 bg-card/80 backdrop-blur-sm px-4 py-2 pr-9 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all"
                      aria-label="Search athletes in scatter"
                    />
                    {scatterSearch && (
                      <button
                        onClick={() => setScatterSearch("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-sm w-6 h-6 flex items-center justify-center rounded-full hover:bg-secondary transition-colors"
                        aria-label="Clear search"
                      >
                        ×
                      </button>
                    )}
                  </div>
                  {scatterSearch && (
                    <span className="text-[10px] text-muted-foreground">
                      Highlighting matches for "{scatterSearch}"
                    </span>
                  )}
                </div>
                <div className="w-full h-[400px] md:h-[500px] relative" ref={scatterWrapRef}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 10, right: 10, bottom: 40, left: 0 }} onClick={handleScatterClick}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                      <XAxis
                        type="number" dataKey="sold" name="Raw Listed" unit="$"
                        scale="log"
                        domain={[scatterAxisBounds.xMin, scatterAxisBounds.xMax]}
                        allowDataOverflow
                        ticks={scatterAxisBounds.xTicks}
                        tickFormatter={(v) => `$${v}`}
                        label={{ value: "Avg Raw Listed ($, log scale)", position: "insideBottom", offset: -10, style: { fill: "hsl(var(--muted-foreground))", fontSize: 11 } }}
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                      />
                      <YAxis
                        type="number" dataKey="listed" name="Graded Listed" unit="$"
                        scale="log"
                        domain={[scatterAxisBounds.yMin, scatterAxisBounds.yMax]}
                        allowDataOverflow
                        ticks={scatterAxisBounds.yTicks}
                        tickFormatter={(v) => `$${v}`}
                        label={{ value: "Avg Graded Listed ($, log scale)", angle: -90, position: "insideLeft", offset: 10, style: { fill: "hsl(var(--muted-foreground))", fontSize: 11 } }}
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                      />
                      <Tooltip content={() => null} />
                      <Scatter
                        data={[
                          { listed: Math.max(scatterAxisBounds.xMin, scatterAxisBounds.yMin), sold: Math.max(scatterAxisBounds.xMin, scatterAxisBounds.yMin) },
                          { listed: Math.min(scatterAxisBounds.xMax, scatterAxisBounds.yMax), sold: Math.min(scatterAxisBounds.xMax, scatterAxisBounds.yMax) },
                        ]}
                        line={{ stroke: "hsl(var(--muted-foreground))", strokeWidth: 1, strokeDasharray: "6 4" }}
                        shape={() => null} legendType="none" isAnimationActive={false}
                      />
                      <Scatter data={listedVsListedScatter} isAnimationActive={false} cursor="pointer">
                        {listedVsListedScatter.map((entry, idx) => {
                          const q = scatterSearch.trim().toLowerCase();
                          const isMatch = !q || entry.name.toLowerCase().includes(q);
                          return (
                            <Cell
                              key={idx}
                              fill={getSportColor(entry.sport)}
                              fillOpacity={q ? (isMatch ? 0.95 : 0.08) : 0.75}
                              stroke={q && isMatch ? "hsl(var(--foreground))" : "none"}
                              strokeWidth={q && isMatch ? 1.5 : 0}
                              r={q && isMatch ? 8 : (typeof window !== 'undefined' && window.innerWidth < 768 ? 6 : 5)}
                            />
                          );
                        })}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                  {pinnedDot && <PinnedScatterTooltip data={pinnedDot} onClose={closePinned} />}
                </div>
                <div className="flex flex-wrap gap-4 mt-3 justify-center">
                  {Object.entries(SPORT_COLORS)
                    .filter(([sport]) => listedRawVsGradedData.some(d => d.sport === sport))
                    .map(([sport, color]) => (
                      <button
                        key={sport}
                        onClick={() => setScatterSportFilter(prev => prev === sport ? null : sport)}
                        className={`flex items-center gap-1.5 text-[10px] transition-all cursor-pointer rounded-full px-2 py-0.5 ${
                          scatterSportFilter === sport
                            ? "bg-primary/15 text-foreground font-bold ring-1 ring-primary/30"
                            : scatterSportFilter
                              ? "text-muted-foreground/40 hover:text-muted-foreground"
                              : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <div
                          className="w-2.5 h-2.5 rounded-full transition-opacity"
                          style={{ backgroundColor: color, opacity: scatterSportFilter && scatterSportFilter !== sport ? 0.3 : 1 }}
                        />
                        {sport}
                      </button>
                    ))}
                </div>
              </div>
            </section>

            {/* ── Top 10 Graded Premiums ── */}
            <section className="my-8" aria-label="Top graded premiums">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
                <h2 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
                  <span className="w-1 h-5 rounded-full bg-primary inline-block" />
                  Biggest Graded Premiums
                </h2>
              </div>
              <p className="text-xs text-muted-foreground mb-1 ml-3">
                Top 10 athletes with the largest gap between graded and raw listed prices.
              </p>
              <p className="text-xs text-muted-foreground mb-4 ml-3">
                <span className="inline-flex items-center gap-1"><span className="inline-block w-3 h-0.5 rounded" style={{ backgroundColor: "hsl(142, 71%, 45%)" }} /> <strong className="text-foreground">Green bars</strong> = graded listings ask more than raw, the typical grading premium.</span>{" "}
                <span className="inline-flex items-center gap-1"><span className="inline-block w-3 h-0.5 rounded" style={{ backgroundColor: "hsl(0, 72%, 50%)" }} /> <strong className="text-foreground">Red bars</strong> = raw listings ask more than graded, an unusual signal worth a closer look.</span>{" "}
                Larger bars signal where the grading premium is most pronounced.
              </p>
              <div className="glass-panel p-4 md:p-6">
                <div className="w-full h-[360px] md:h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topSpread} layout="vertical" margin={{ top: 22, right: 30, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                      <XAxis
                        type="number"
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                        label={{ value: "Premium ($)", position: "insideBottom", offset: -5, style: { fill: "hsl(var(--muted-foreground))", fontSize: 11 } }}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={150}
                        interval={0}
                        tickMargin={8}
                        padding={{ top: 16, bottom: 8 }}
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                      />
                      <Tooltip content={<PriceTooltip />} />
                      <Bar
                        dataKey="spread"
                        isAnimationActive={false}
                        radius={[0, 4, 4, 0]}
                        cursor="pointer"
                        onClick={(data: any) => {
                          if (data?.name) {
                            window.open(buildEbaySearchUrl(data.name, data.sport), "_blank", "noopener,noreferrer");
                          }
                        }}
                      >
                        {topSpread.map((entry, idx) => (
                          <Cell key={idx} fill={entry.spread > 0 ? "hsl(142, 71%, 45%)" : "hsl(0, 72%, 50%)"} fillOpacity={0.8} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex gap-6 justify-center mt-3">
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: "hsl(142, 71%, 45%)" }} />
                    Graded &gt; Raw (premium)
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: "hsl(0, 72%, 50%)" }} />
                    Raw &gt; Graded (anomaly)
                  </div>
                </div>
              </div>
            </section>


            {/* ── Investment Signal Score ── */}
            <section className="my-8" aria-label="Investment signal score">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
                <h2 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
                  <span className="w-1 h-5 rounded-full bg-primary inline-block" />
                  Investment Signal Score
                </h2>
                <ModeToggle value={signalMode} onChange={setSignalMode} />
              </div>
              <p className="text-xs text-muted-foreground mb-4 ml-3">
                Athletes classified by listing data only: graded premium over raw, Taguchi S/N ratio, Stability score, and days on market. S/N = 10 · log₁₀(mean² / variance).
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(Object.keys(SIGNAL_META) as SignalCategory[]).map((cat) => {
                  const meta = SIGNAL_META[cat];
                  const group = signalGroups[cat];
                  return (
                    <motion.div
                      key={cat}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35 }}
                      className="glass-panel p-4 hover:border-primary/20 transition-colors"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{meta.emoji}</span>
                        <span className="font-display font-bold text-sm text-foreground">{meta.label}</span>
                        <span className="ml-auto text-[10px] font-mono text-muted-foreground rounded-full border border-border px-2 py-0.5">{group.length}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mb-3">{meta.desc}</p>
                      {group.length === 0 ? (
                        <p className="text-xs text-muted-foreground/50 italic">No athletes in this category</p>
                      ) : (
                        <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                          {group.slice(0, 8).map((a) => {
                            const hist = athleteHistory[a.name];
                            const key = signalMode === "graded" ? "graded" : "raw";
                            const sparkValues = hist && hist.length >= 7
                              ? hist.map((h: any) => h?.[key]?.price ?? null).filter((v: any): v is number => v != null && Number.isFinite(v))
                              : null;
                            const sparkDates = hist && hist.length >= 7
                              ? hist.filter((h: any) => h?.[key]?.price != null && Number.isFinite(h[key].price)).map((h: any) => h?.date ?? "")
                              : null;
                            const hasSparkline = sparkValues != null && sparkValues.length >= 7;
                            return (
                            <a
                              key={a.name}
                              href={buildEbaySearchUrl(a.name, a.sport)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 hover:bg-accent/50 transition-colors group"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">{a.name}</div>
                                <div className="text-[9px] text-muted-foreground">{a.sport}</div>
                              </div>
                              {hasSparkline && (
                                <div className="shrink-0">
                                  <Sparkline data={sparkValues} dates={sparkDates!} width={56} height={18} />
                                </div>
                              )}
                              <div className="text-right shrink-0">
                                {(() => {
                                  if (cat === "premium_listing") {
                                    const pct = a.premiumPct;
                                    return (
                                      <div className={`text-xs font-mono font-bold ${pct != null && pct >= 0 ? "text-green-400" : "text-red-400"}`}>
                                        {pct != null ? `${pct >= 0 ? "+" : ""}${pct.toFixed(0)}%` : "—"}
                                      </div>
                                    );
                                  }
                                  if (cat === "speculative") {
                                    return (
                                      <div className="text-xs font-mono font-bold text-purple-400">
                                        {a.cv != null ? `CV ${(a.cv * 100).toFixed(0)}%` : "—"}
                                      </div>
                                    );
                                  }
                                  // fast_mover & stale_inventory: lead with days
                                  return (
                                    <div className={`text-xs font-mono font-bold ${cat === "fast_mover" ? "text-yellow-400" : "text-red-400"}`}>
                                      {a.days != null ? `${Math.round(a.days)}d` : "—"}
                                    </div>
                                  );
                                })()}
                                <div className="text-[9px] text-muted-foreground">
                                  {a.cv != null && cat !== "speculative" ? `Stability ${(a.cv * 100).toFixed(0)}%` : ""}
                                  {a.cv != null && a.days != null && cat !== "speculative" && cat !== "fast_mover" && cat !== "stale_inventory" ? " · " : ""}
                                  {cat === "speculative" && a.days != null ? `${Math.round(a.days)}d` : ""}
                                  {(cat === "fast_mover" || cat === "stale_inventory") && a.cv != null ? `Stability ${(a.cv * 100).toFixed(0)}%` : ""}
                                </div>
                              </div>
                            </a>
                            );
                          })}
                          {group.length > 8 && (
                            <div className="text-[10px] text-muted-foreground/60 text-center pt-1">
                              +{group.length - 8} more
                            </div>
                          )}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>

              {/* ── Signal Strength Card ── */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                className="glass-panel p-4 hover:border-primary/20 transition-colors mt-4"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">📡</span>
                  <span className="font-display font-bold text-sm text-foreground">Signal Strength</span>
                  <span className="ml-auto text-[10px] font-mono text-muted-foreground rounded-full border border-border px-2 py-0.5">{signalStrengthTop.length}</span>
                </div>
                <p className="text-[10px] text-muted-foreground mb-3">Athletes with the most stable and predictable pricing on eBay</p>
                {signalStrengthTop.length === 0 ? (
                  <p className="text-xs text-muted-foreground/50 italic">No athletes with S/N data</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 max-h-[280px] overflow-y-auto pr-1">
                    {signalStrengthTop.map((a) => (
                      <a
                        key={a.name}
                        href={buildEbaySearchUrl(a.name, a.sport)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 hover:bg-accent/50 transition-colors group"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">{a.name}</div>
                          <div className="text-[9px] text-muted-foreground">{a.sport}</div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-xs font-mono font-bold text-foreground">
                            S/N {a.sn!.toFixed(1)}
                          </div>
                          <div className="text-[9px] text-muted-foreground">
                            {a.cv != null ? `Stability ${(a.cv * 100).toFixed(0)}%` : ""}
                            {a.cv != null && a.days != null ? " · " : ""}
                            {a.days != null ? `${Math.round(a.days)}d` : ""}
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>
                )}
                <p className="text-[9px] text-muted-foreground/60 text-center mt-3">
                  S/N = 10 · log₁₀(mean² / variance). Higher = more reliable.
                </p>
              </motion.div>
            </section>


            {/* ── Gemrate Grading Data ── */}
            <GemrateChart />

            {/* ── PSA Pop vs Sold ── */}
            <PSAPopVsSoldChart gradedSoldData={filteredGradedSold} athleteSportMap={athleteSportMap} />

            {/* ── Sales Volume Trends (Gemrate) ── */}
            <Suspense fallback={null}>
              <SalesTrendsTable />
            </Suspense>
          </>
        )}


        <VzlaFooter />
      </main>
      <VzlaEbayFooter />
    </div>
  );
};

/* ── Most Listings on eBay ── */
const LISTINGS_BAR_COLOR = "hsl(45, 93%, 47%)";

const MostListingsChart = ({ listedData, gradedListedData, athleteSportMap }: {
  listedData: Record<string, any>;
  gradedListedData: Record<string, any>;
  athleteSportMap: Record<string, string>;
}) => {
  const [listingsMode, setListingsMode] = useState<CardMode>("raw");

  const top10 = useMemo(() => {
    const buildEntries = (src: Record<string, any>) => {
      const entries: { name: string; sport: string; listingCount: number; avgListed: number | null }[] = [];
      if (!src || typeof src !== "object") return entries;
      for (const [name, rec] of Object.entries(src)) {
        if (name === "_meta" || !rec) continue;
        const r = rec as any;
        const n =
          r.nListing ??
          r.marketplaces?.EBAY_US?.nListing ??
          r.marketplaces?.EBAY_CA?.nListing ??
          r.n ??
          0;
        if (!n || n <= 0) continue;
        const normKey = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[.\-']/g, "").replace(/\s+/g, " ").toLowerCase().trim();
        const sport = athleteSportMap[name] || athleteSportMap[normKey];
        if (!sport) continue;
        const avgListed = r.taguchiListing ?? r.avgListing ?? r.trimmedListing ?? r.avg ?? null;
        entries.push({ name, sport, listingCount: n, avgListed });
      }
      return entries;
    };

    if (listingsMode === "both") {
      const mergedMap = new Map<string, { name: string; sport: string; listingCount: number; avgListed: number | null }>();
      for (const src of [listedData, gradedListedData]) {
        for (const entry of buildEntries(src)) {
          const existing = mergedMap.get(entry.name);
          if (existing) {
            existing.listingCount += entry.listingCount;
          } else {
            mergedMap.set(entry.name, { ...entry });
          }
        }
      }
      return [...mergedMap.values()].sort((a, b) => b.listingCount - a.listingCount).slice(0, 10);
    }

    const src = listingsMode === "graded" ? gradedListedData : listedData;
    return buildEntries(src).sort((a, b) => b.listingCount - a.listingCount).slice(0, 10);
  }, [listedData, gradedListedData, athleteSportMap, listingsMode]);

  const isEmpty = top10.length === 0;
  const updatedAt = (listingsMode === "graded" ? gradedListedData : listedData)?._meta?.updatedAt;
  const formattedDate = updatedAt
    ? new Date(updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : null;

  return (
    <section className="my-8" aria-label="Most listed athletes on eBay">
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
          <span className="w-1 h-5 rounded-full bg-vzla-yellow inline-block" />
          🔥 Most Listings – Top 10
        </h2>
        <ModeToggle value={listingsMode} onChange={setListingsMode} />
      </div>
      <p className="text-xs text-muted-foreground mb-4 ml-3">
        Athletes with the highest {listingsMode === "graded" ? "graded" : listingsMode === "both" ? "total" : "raw"} active listing volume on eBay (after filters).
        {formattedDate && <span className="ml-1 opacity-70">Updated {formattedDate}.</span>}
      </p>
      <div className="glass-panel p-4 md:p-6">
        {isEmpty ? (
          <div className="py-12 text-center">
            <div className="text-3xl mb-3">🔥</div>
            <p className="text-sm text-muted-foreground">No listing data available yet.</p>
          </div>
        ) : (
          <div className="w-full h-[450px] md:h-[550px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={top10} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                <XAxis
                  type="number"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                  label={{ value: "Active Listings", position: "insideBottom", offset: -5, style: { fill: "hsl(var(--muted-foreground))", fontSize: 11 } }}
                />
                <YAxis type="category" dataKey="name" width={150} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <Tooltip
                  content={({ payload }: any) => {
                    if (!payload?.length) return null;
                    const d = payload[0]?.payload;
                    if (!d) return null;
                    return (
                      <div className="rounded-xl border border-border/50 bg-background/95 backdrop-blur-lg p-3 text-xs shadow-2xl">
                        <div className="font-display font-bold text-foreground mb-1">{d.name}</div>
                        <div className="text-muted-foreground text-[10px] mb-1.5">{d.sport}</div>
                        <span className="text-muted-foreground">Active Listings: <strong className="text-foreground">{d.listingCount.toLocaleString()}</strong></span>
                        {d.avgListed != null && (
                          <div className="text-muted-foreground mt-1">Avg Listed: <strong className="text-foreground">${d.avgListed.toFixed(2)}</strong></div>
                        )}
                        <div className="text-[9px] text-muted-foreground/60 mt-1.5">Click bar to search on eBay</div>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="listingCount" name="Listings" fill={LISTINGS_BAR_COLOR} radius={[0, 4, 4, 0]} isAnimationActive={false} cursor="pointer"
                  onClick={(data: any) => {
                    if (data?.name) window.open(buildEbaySearchUrl(data.name, data.sport), "_blank", "noopener,noreferrer");
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        <p className="text-[9px] text-muted-foreground/60 text-center mt-3">
          Based on eBay active listings after name & junk filters. Updated in batches.
        </p>
      </div>
    </section>
  );
};



interface GemrateAthlete {
  name: string;
  sport: string;
  graders: Record<string, { cards: number; gems: number; grades: number; gemRate: number }>;
  totals: { cards: number; gems: number; grades: number; gemRate: number };
}

interface GemrateData {
  _meta?: { updatedAt?: string; graders?: string[] };
  athletes: Record<string, GemrateAthlete>;
}

const PSA_COLOR = "hsl(200, 80%, 50%)";
const BECKETT_COLOR = "hsl(340, 75%, 55%)";
const SGC_COLOR = "hsl(45, 85%, 50%)";

type GraderFilter = "all" | "psa" | "beckett" | "sgc";

const GemrateChart = () => {
  const [gemrateData, setGemrateData] = useState<GemrateData | null>(null);
  const [beckettData, setBeckettData] = useState<GemrateData | null>(null);
  const [sgcData, setSgcData] = useState<GemrateData | null>(null);
  const [graderFilter, setGraderFilter] = useState<GraderFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    (async () => {
      let d = await fetchJson("https://raw.githubusercontent.com/jaydiare/ui-polish-pal/main/data/gemrate.json");
      if (!d || !d.athletes) d = await fetchJson("data/gemrate.json");
      if (d && d.athletes) setGemrateData(d);

      let b = await fetchJson("https://raw.githubusercontent.com/jaydiare/ui-polish-pal/main/data/gemrate_beckett.json");
      if (!b || !b.athletes) b = await fetchJson("data/gemrate_beckett.json");
      if (b && b.athletes) setBeckettData(b);

      let s = await fetchJson("https://raw.githubusercontent.com/jaydiare/ui-polish-pal/main/data/gemrate_sgc.json");
      if (!s || !s.athletes) s = await fetchJson("data/gemrate_sgc.json");
      if (s && s.athletes) setSgcData(s);
    })();
  }, []);

  const top10 = useMemo(() => {
    const psaAthletes = gemrateData?.athletes || {};
    const beckettAthletes = beckettData?.athletes || {};
    const sgcAthletes = sgcData?.athletes || {};

    // Build a unified list of all athletes from all sources
    const allNames = new Set<string>();
    for (const a of Object.values(psaAthletes)) if (a.name) allNames.add(a.name);
    for (const a of Object.values(beckettAthletes)) if (a.name) allNames.add(a.name);
    for (const a of Object.values(sgcAthletes)) if (a.name) allNames.add(a.name);

    if (allNames.size === 0) return [];

    const rows = Array.from(allNames).map((name) => {
      const psaRec = Object.values(psaAthletes).find((a) => a.name === name);
      const beckettRec = beckettAthletes[name];
      const sgcRec = sgcAthletes[name];
      const psaGrades = psaRec?.graders?.PSA?.grades ?? psaRec?.totals?.grades ?? 0;
      const beckettGrades = beckettRec?.totals?.grades ?? 0;
      const sgcGrades = sgcRec?.graders?.SGC?.grades ?? sgcRec?.totals?.grades ?? 0;

      return {
        name,
        sport: psaRec?.sport ?? beckettRec?.sport ?? sgcRec?.sport ?? "",
        PSA: psaGrades,
        Beckett: beckettGrades,
        SGC: sgcGrades,
        total: psaGrades + beckettGrades + sgcGrades,
        gemRate: psaRec?.totals?.gemRate ?? null,
        beckettGemRate: beckettRec?.totals?.gemRate ?? null,
        sgcGemRate: sgcRec?.totals?.gemRate ?? null,
      };
    });

    // Sort by the relevant metric based on filter
    const sortKey = graderFilter === "psa" ? "PSA" : graderFilter === "beckett" ? "Beckett" : graderFilter === "sgc" ? "SGC" : "total";
    const filtered = rows.filter((r) => r[sortKey] > 0).sort((a, b) => b[sortKey] - a[sortKey]);
    const top = filtered.slice(0, 10);

    // If searching, pin any matching athletes (outside top 10) into the chart
    const q = searchQuery.trim().toLowerCase();
    if (!q) return top;
    const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const matches = filtered.filter((r) => norm(r.name).includes(norm(q)));
    const topNames = new Set(top.map((r) => r.name));
    const extras = matches.filter((r) => !topNames.has(r.name)).slice(0, 5);
    return [...top, ...extras].sort((a, b) => b[sortKey] - a[sortKey]);
  }, [gemrateData, beckettData, sgcData, graderFilter, searchQuery]);

  const isEmpty = !gemrateData && !beckettData && !sgcData;

  const updatedAt = gemrateData?._meta?.updatedAt
    ? new Date(gemrateData._meta.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : null;

  return (
    <section className="my-8" aria-label="Gemrate grading data">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
        <h2 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
          <span className="w-1 h-5 rounded-full bg-primary inline-block" />
          Graded Cards – Top 10
        </h2>
        <div className="inline-flex items-center rounded-full border border-border/50 bg-card/80 backdrop-blur-sm p-0.5">
          <button
            onClick={() => setGraderFilter("psa")}
            className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wide transition-all ${graderFilter === "psa" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}
          >
            🔵 PSA
          </button>
          <button
            onClick={() => setGraderFilter("beckett")}
            className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wide transition-all ${graderFilter === "beckett" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}
          >
            🟣 BGS
          </button>
          <button
            onClick={() => setGraderFilter("sgc")}
            className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wide transition-all ${graderFilter === "sgc" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}
          >
            🟡 SGC
          </button>
          <button
            onClick={() => setGraderFilter("all")}
            className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wide transition-all ${graderFilter === "all" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}
          >
            ⚖️ All
          </button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mb-4 ml-3">
        {graderFilter === "all" && "Total graded cards by PSA, Beckett & SGC for Venezuelan athletes."}
        {graderFilter === "psa" && "Top 10 athletes by PSA graded card count."}
        {graderFilter === "beckett" && "Top 10 athletes by Beckett graded card count."}
        {graderFilter === "sgc" && "Top 10 athletes by SGC graded card count."}
        {updatedAt && <span className="ml-1 opacity-70">Updated {updatedAt}.</span>}
        <span className="ml-1 opacity-60">
          Data via{" "}
          <a href="https://www.gemrate.com" target="_blank" rel="noopener noreferrer" className="underline hover:opacity-80">
            gemrate.com
          </a>
        </span>
      </p>
      <div className="mb-3 flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search any athlete (e.g. Salvador Perez)…"
            className="w-full rounded-full border border-border/50 bg-card/80 backdrop-blur-sm px-4 py-2 pr-9 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all"
            aria-label="Search graded athletes"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-sm w-6 h-6 flex items-center justify-center rounded-full hover:bg-secondary transition-colors"
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>
        {searchQuery && (
          <span className="text-[10px] text-muted-foreground">
            Showing Top 10 + matches for "{searchQuery}"
          </span>
        )}
      </div>
      <div className="glass-panel p-4 md:p-6">
        {isEmpty ? (
          <div className="py-12 text-center">
            <div className="text-3xl mb-3">📊</div>
            <p className="text-sm text-muted-foreground">Grading data will appear here once the quarterly update runs.</p>
            <a href="https://www.gemrate.com" target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline mt-2 inline-block">Visit gemrate.com →</a>
          </div>
        ) : top10.length === 0 ? (
          <div className="py-12 text-center">
            <div className="text-3xl mb-3">🔍</div>
            <p className="text-sm text-muted-foreground">No athletes match "{searchQuery}" with grading data.</p>
          </div>
        ) : (
          <>
            <div className="w-full h-[450px] md:h-[550px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart key={graderFilter} data={top10} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 40 }} stackOffset="none">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis
                    type="number"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                  />
                  <YAxis type="category" dataKey="name" width={150} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <Tooltip
                    content={({ payload }: any) => {
                      if (!payload?.length) return null;
                      const d = payload[0]?.payload;
                      if (!d) return null;
                      const showPsa = graderFilter === "all" || graderFilter === "psa";
                      const showBeckett = graderFilter === "all" || graderFilter === "beckett";
                      const showSgc = graderFilter === "all" || graderFilter === "sgc";
                      const totalLabel = graderFilter === "psa" ? "PSA Total" : graderFilter === "beckett" ? "BGS Total" : graderFilter === "sgc" ? "SGC Total" : "Total";
                      const totalVal = graderFilter === "psa" ? d.PSA : graderFilter === "beckett" ? d.Beckett : graderFilter === "sgc" ? d.SGC : d.total;
                      return (
                        <div className="rounded-xl border border-border/50 bg-background/95 backdrop-blur-lg p-3 text-xs shadow-2xl">
                          <div className="font-display font-bold text-foreground mb-1">{d.name}</div>
                          <div className="text-muted-foreground text-[10px] mb-1.5">{d.sport}</div>
                          <div className="flex flex-col gap-0.5">
                            {showPsa && d.PSA > 0 && (
                              <span className="text-muted-foreground flex items-center gap-1">
                                <span className="w-2 h-2 rounded-sm inline-block" style={{ background: PSA_COLOR }} />
                                PSA: <strong className="text-foreground">{d.PSA.toLocaleString()}</strong>
                                {d.gemRate != null && <span className="opacity-60">({d.gemRate}% gem)</span>}
                              </span>
                            )}
                            {showBeckett && d.Beckett > 0 && (
                              <span className="text-muted-foreground flex items-center gap-1">
                                <span className="w-2 h-2 rounded-sm inline-block" style={{ background: BECKETT_COLOR }} />
                                Beckett: <strong className="text-foreground">{d.Beckett.toLocaleString()}</strong>
                                {d.beckettGemRate != null && <span className="opacity-60">({d.beckettGemRate}% gem)</span>}
                              </span>
                            )}
                            {showSgc && d.SGC > 0 && (
                              <span className="text-muted-foreground flex items-center gap-1">
                                <span className="w-2 h-2 rounded-sm inline-block" style={{ background: SGC_COLOR }} />
                                SGC: <strong className="text-foreground">{d.SGC.toLocaleString()}</strong>
                                {d.sgcGemRate != null && <span className="opacity-60">({d.sgcGemRate}% gem)</span>}
                              </span>
                            )}
                            <span className="text-muted-foreground border-t border-border/30 pt-0.5 mt-0.5">
                              {totalLabel}: <strong className="text-foreground">{totalVal.toLocaleString()}</strong>
                            </span>
                          </div>
                          <div className="text-[9px] text-muted-foreground/60 mt-1.5">Click bar to search graded cards on eBay</div>
                        </div>
                      );
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    wrapperStyle={{ fontSize: 11, paddingTop: 12 }}
                    formatter={(value: string) => <span className="text-muted-foreground text-xs">{value}</span>}
                  />
                  {(graderFilter === "all" || graderFilter === "psa") && (
                    <Bar dataKey="PSA" name="PSA Grades" stackId="graders" fill={PSA_COLOR} radius={graderFilter === "psa" ? [0, 4, 4, 0] : [0, 0, 0, 0]} isAnimationActive={false} cursor="pointer"
                      onClick={(data: any) => { if (data?.name) window.open(buildEbayGradedSearchUrl(data.name, data.sport), "_blank", "noopener,noreferrer"); }} />
                  )}
                  {(graderFilter === "all" || graderFilter === "beckett") && (
                    <Bar dataKey="Beckett" name="Beckett Grades" stackId="graders" fill={BECKETT_COLOR} radius={graderFilter === "beckett" ? [0, 4, 4, 0] : [0, 0, 0, 0]} isAnimationActive={false} cursor="pointer"
                      onClick={(data: any) => { if (data?.name) window.open(buildEbayGradedSearchUrl(data.name, data.sport), "_blank", "noopener,noreferrer"); }} />
                  )}
                  {(graderFilter === "all" || graderFilter === "sgc") && (
                    <Bar dataKey="SGC" name="SGC Grades" stackId="graders" fill={SGC_COLOR} radius={graderFilter === "sgc" || graderFilter === "all" ? [0, 4, 4, 0] : [0, 0, 0, 0]} isAnimationActive={false} cursor="pointer"
                      onClick={(data: any) => { if (data?.name) window.open(buildEbayGradedSearchUrl(data.name, data.sport), "_blank", "noopener,noreferrer"); }} />
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
        <p className="text-[9px] text-muted-foreground/60 text-center mt-3">
          Data sourced from <a href="https://www.gemrate.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">gemrate.com</a>. Updated quarterly.
        </p>
      </div>
    </section>
  );
};

/* ── PSA Pop vs Graded Sold Bubble Chart ── */
const PSAPopVsSoldChart = ({ gradedSoldData, athleteSportMap }: {
  gradedSoldData: Record<string, any>;
  athleteSportMap: Record<string, string>;
}) => {
  const [gemrateData, setGemrateData] = useState<GemrateData | null>(null);
  const [sportFilter, setSportFilter] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      let d = await fetchJson("https://raw.githubusercontent.com/jaydiare/ui-polish-pal/main/data/gemrate.json");
      if (!d || !d.athletes) d = await fetchJson("data/gemrate.json");
      if (d && d.athletes) setGemrateData(d);
    })();
  }, []);

  const allBubbleData = useMemo(() => {
    if (!gemrateData?.athletes) return [];
    const items: { name: string; sport: string; psaPop: number; soldCount: number; avgSold: number; z: number }[] = [];

    for (const [, athlete] of Object.entries(gemrateData.athletes)) {
      const psaPop = athlete.graders?.PSA?.grades ?? athlete.totals?.grades ?? 0;
      if (psaPop <= 0) continue;

      const soldRec = gradedSoldData[athlete.name] as any;
      const soldCount = soldRec?.nSoldUsed ?? soldRec?.nScraped ?? 0;
      if (soldCount <= 0) continue;

      const avgSold = soldRec?.taguchiSold ?? soldRec?.avg ?? null;
      if (avgSold == null || !Number.isFinite(avgSold) || avgSold <= 0) continue;

      const normKey = athlete.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[.\-']/g, "").replace(/\s+/g, " ").toLowerCase().trim();
      const sport = athleteSportMap[athlete.name] || athleteSportMap[normKey];
      if (!sport) continue;

      items.push({ name: athlete.name, sport, psaPop, soldCount, avgSold: Math.round(avgSold * 100) / 100, z: avgSold });
    }

    return items;
  }, [gemrateData, gradedSoldData, athleteSportMap]);

  // Medians computed on full dataset (before filtering)
  const { medianPop, medianSold } = useMemo(() => {
    if (!allBubbleData.length) return { medianPop: 0, medianSold: 0 };
    const byPop = [...allBubbleData].sort((a, b) => a.psaPop - b.psaPop);
    const bySold = [...allBubbleData].sort((a, b) => a.soldCount - b.soldCount);
    return {
      medianPop: byPop[Math.floor(byPop.length / 2)]?.psaPop ?? 0,
      medianSold: bySold[Math.floor(bySold.length / 2)]?.soldCount ?? 0,
    };
  }, [allBubbleData]);

  // Only show scarce + in-demand (low pop, high sold), then apply sport filter
  const bubbleData = useMemo(() => {
    const scarce = allBubbleData.filter(d => d.psaPop <= medianPop && d.soldCount >= medianSold);
    if (sportFilter) return scarce.filter(d => d.sport === sportFilter);
    return scarce;
  }, [allBubbleData, medianPop, medianSold, sportFilter]);

  const [pinnedDot, setPinnedDot] = useState<{ name: string; sport: string; psaPop: number; soldCount: number; avgSold: number; cx: number; cy: number } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const handleClick = useCallback((state: any) => {
    if (!state?.activePayload?.length) { setPinnedDot(null); return; }
    const d = state.activePayload[0]?.payload;
    if (!d?.name) { setPinnedDot(null); return; }
    setPinnedDot({ ...d, cx: state.chartX ?? 0, cy: state.chartY ?? 0 });
  }, []);

  const closePinned = useCallback(() => setPinnedDot(null), []);

  useEffect(() => {
    if (!pinnedDot) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) closePinned();
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => { document.removeEventListener("mousedown", handler); document.removeEventListener("touchstart", handler); };
  }, [pinnedDot, closePinned]);

  if (!bubbleData.length && !allBubbleData.length) return null;


  // Sports present in the scarce dataset (for legend)
  const scarceAll = allBubbleData.filter(d => d.psaPop <= medianPop && d.soldCount >= medianSold);
  const availableSports = Array.from(new Set(scarceAll.map(d => d.sport))).sort();

  return (
    <section className="my-8" aria-label="PSA scarce + in-demand bubble chart">
      <h2 className="font-display font-bold text-lg text-foreground mb-1 flex items-center gap-2">
        <span className="w-1 h-5 rounded-full bg-primary inline-block" />
        🔥 Scarce + In-Demand PSA Cards
      </h2>
      <p className="text-xs text-muted-foreground mb-1 ml-3">
        Low PSA population but high sold volume — the sweet spot for collectors.
      </p>
      <p className="text-xs text-muted-foreground mb-4 ml-3">
        These athletes have <strong className="text-foreground">fewer graded cards than the median</strong> yet <strong className="text-foreground">sell more than the median</strong>.
        Click any sport below to filter.
      </p>
      <div className="glass-panel p-4 md:p-6">
        {bubbleData.length === 0 ? (
          <div className="py-12 text-center">
            <div className="text-3xl mb-3">🔍</div>
            <p className="text-sm text-muted-foreground">No scarce + in-demand cards found for {sportFilter}.</p>
            <button onClick={() => setSportFilter(null)} className="text-xs text-primary underline mt-2">Show all sports</button>
          </div>
        ) : (
          <div className="w-full h-[420px] md:h-[480px] relative" ref={wrapRef}>
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 40, left: 10 }} onClick={handleClick}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                <XAxis
                  type="number" dataKey="psaPop" name="PSA Pop"
                  label={{ value: "PSA Population (total graded)", position: "insideBottom", offset: -10, style: { fill: "hsl(var(--muted-foreground))", fontSize: 11 } }}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                />
                <YAxis
                  type="number" dataKey="soldCount" name="Sold"
                  label={{ value: "eBay Sold Count", angle: -90, position: "insideLeft", offset: 10, style: { fill: "hsl(var(--muted-foreground))", fontSize: 11 } }}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                />
                <Tooltip content={() => null} />
                <Scatter data={bubbleData} isAnimationActive={false} cursor="pointer">
                  {bubbleData.map((entry, idx) => (
                    <Cell
                      key={idx}
                      fill={getSportColor(entry.sport)}
                      fillOpacity={0.85}
                      stroke={getSportColor(entry.sport)}
                      strokeWidth={1}
                      r={6}
                    />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
            {pinnedDot && (
              <div
                className="absolute z-50 rounded-xl border border-border/50 bg-background/95 backdrop-blur-lg p-3 text-xs shadow-2xl"
                style={{ left: Math.min(pinnedDot.cx + 12, 220), top: Math.max(pinnedDot.cy - 10, 0), pointerEvents: "auto", minWidth: 170 }}
              >
                <a href={buildEbayGradedSearchUrl(pinnedDot.name, pinnedDot.sport)} target="_blank" rel="noopener noreferrer"
                  className="font-display font-bold text-foreground hover:text-primary transition-colors underline decoration-dotted underline-offset-2">
                  {pinnedDot.name} ↗
                </a>
                <div className="text-muted-foreground text-[10px] mb-1.5">{pinnedDot.sport}</div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-muted-foreground">PSA Pop: <strong className="text-foreground">{pinnedDot.psaPop.toLocaleString()}</strong></span>
                  <span className="text-muted-foreground">Sold Count: <strong className="text-foreground">{pinnedDot.soldCount.toLocaleString()}</strong></span>
                  <span className="text-muted-foreground">Avg Sold: <strong className="text-foreground">${pinnedDot.avgSold.toFixed(2)}</strong></span>
                  <span className="text-red-400 font-bold mt-1">🔥 Low pop, high demand</span>
                </div>
                <div className="text-[9px] text-muted-foreground/60 mt-1.5">Tap name to search PSA graded on eBay</div>
              </div>
            )}
          </div>
        )}
        {/* Interactive sport legend + bubble size reference */}
        <div className="flex flex-wrap items-center gap-3 mt-3 justify-center">
          <button
            onClick={() => { setSportFilter(null); setPinnedDot(null); }}
            className={`flex items-center gap-1.5 text-[10px] transition-all cursor-pointer rounded-full px-2 py-0.5 ${
              !sportFilter
                ? "bg-primary/15 text-foreground font-bold ring-1 ring-primary/30"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            All ({scarceAll.length})
          </button>
          {availableSports.map(sport => {
            const count = scarceAll.filter(d => d.sport === sport).length;
            const color = getSportColor(sport);
            return (
              <button
                key={sport}
                onClick={() => { setSportFilter(prev => prev === sport ? null : sport); setPinnedDot(null); }}
                className={`flex items-center gap-1.5 text-[10px] transition-all cursor-pointer rounded-full px-2 py-0.5 ${
                  sportFilter === sport
                    ? "bg-primary/15 text-foreground font-bold ring-1 ring-primary/30"
                    : sportFilter
                      ? "text-muted-foreground/40 hover:text-muted-foreground"
                      : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <div
                  className="w-2.5 h-2.5 rounded-full transition-opacity"
                  style={{ backgroundColor: color, opacity: sportFilter && sportFilter !== sport ? 0.3 : 1 }}
                />
                {sport} ({count})
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Data;
