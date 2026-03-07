import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import SEOHead from "@/components/SEOHead";
import SocialShare from "@/components/SocialShare";
import VzlaNavbar from "@/components/VzlaNavbar";
import VzlaFooter from "@/components/VzlaFooter";
import VzlaEbayFooter from "@/components/VzlaEbayFooter";
import VzlaSupplyDemand from "@/components/VzlaSupplyDemand";
import Sparkline from "@/components/Sparkline";
import { buildEbaySearchUrl, buildEbayGradedSearchUrl } from "@/lib/vzla-helpers";
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
interface SoldRecord { avg?: number; taguchiSold?: number }
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
  const v = rec.taguchiSold ?? rec.avg ?? null;
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
        <span className="text-muted-foreground">Listed: <strong className="text-foreground">${d.listed.toFixed(2)}</strong></span>
        <span className="text-muted-foreground">Sold: <strong className="text-foreground">${d.sold.toFixed(2)}</strong></span>
        <span className="text-muted-foreground">Spread: <strong className={d.spread > 0 ? "text-red-400" : "text-green-400"}>
          {d.spread > 0 ? "+" : ""}${d.spread.toFixed(2)}
        </strong></span>
      </div>
      <div className="text-[9px] text-muted-foreground/60 mt-1.5">Click name to search eBay</div>
    </div>
  );
};

/* ── Pinned tooltip for scatter chart ── */
interface PinnedData {
  name: string; sport: string; listed: number; sold: number; spread: number; cx: number; cy: number;
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
        <span className="text-muted-foreground">Listed: <strong className="text-foreground">${data.listed.toFixed(2)}</strong></span>
        <span className="text-muted-foreground">Sold: <strong className="text-foreground">${data.sold.toFixed(2)}</strong></span>
        <span className="text-muted-foreground">Spread: <strong className={data.spread > 0 ? "text-red-400" : "text-green-400"}>
          {data.spread > 0 ? "+" : ""}${data.spread.toFixed(2)}
        </strong></span>
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
    const normKey = key.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    const sport = athleteSportMap[key] || athleteSportMap[normKey] || (listedData[key] as any)?.sport || "Other";
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
  const [pinnedDot, setPinnedDot] = useState<PinnedData | null>(null);
  const scatterWrapRef = useRef<HTMLDivElement>(null);
  const [athleteHistory, setAthleteHistory] = useState<Record<string, any[]>>({});
  // Per-section toggles
  const [scatterMode, setScatterMode] = useState<CardMode>("raw");
  const [scatterSportFilter, setScatterSportFilter] = useState<string | null>(null);
  const [gapsMode, setGapsMode] = useState<CardMode>("raw");
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
      if (athletes && Array.isArray(athletes)) {
        const map: Record<string, string> = {};
        const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
        for (const a of athletes) {
          if (a?.name && a?.sport) {
            map[a.name] = a.sport;
            map[norm(a.name)] = a.sport;
          }
        }
        setAthleteSportMap(map);
      }
      if (history && typeof history === "object") setAthleteHistory(history);
    });
  }, []);

  /* ── Comparison data per mode ── */
  const rawComparison = useMemo(() => buildComparison(listedData, soldData, athleteSportMap), [listedData, soldData, athleteSportMap]);
  const gradedComparison = useMemo(() => buildComparison(gradedListedData, gradedSoldData, athleteSportMap), [gradedListedData, gradedSoldData, athleteSportMap]);

  const rawStats = useMemo(() => buildStats(rawComparison), [rawComparison]);
  const gradedStats = useMemo(() => buildStats(gradedComparison), [gradedComparison]);

  /* ── Per-section active data ── */
  const scatterDataAll = scatterMode === "graded" ? gradedComparison : rawComparison;
  const scatterDataBoth = scatterMode === "both";
  const scatterData = scatterSportFilter
    ? scatterDataAll.filter(d => d.sport === scatterSportFilter)
    : scatterDataAll;
  const gapsComparison = gapsMode === "graded" ? gradedComparison : rawComparison;
  const supplyComparison = supplyMode === "graded" ? gradedComparison : rawComparison;

  // For "both" mode in gaps: merge raw & graded, picking whichever has larger absolute spread per athlete
  const gapsComparisonBoth = useMemo(() => {
    if (gapsMode !== "both") return gapsComparison;
    const map = new Map<string, typeof rawComparison[0]>();
    for (const d of rawComparison) {
      map.set(d.name, { ...d });
    }
    for (const d of gradedComparison) {
      const existing = map.get(d.name);
      if (!existing || Math.abs(d.spread) > Math.abs(existing.spread)) {
        map.set(d.name, { ...d });
      }
    }
    return [...map.values()];
  }, [gapsMode, rawComparison, gradedComparison, gapsComparison]);

  const topSpread = useMemo(() =>
    [...gapsComparisonBoth].sort((a, b) => Math.abs(b.spread) - Math.abs(a.spread)).slice(0, 10),
    [gapsComparisonBoth]);

  /* ── Investment Signal Score ── */
  type SignalCategory = "undervalued_stable" | "fast_mover" | "speculative" | "overpriced_slow";

  interface SignalAthlete {
    name: string;
    sport: string;
    listed: number;
    sold: number;
    spreadPct: number;
    cv: number | null;
    days: number | null;
    signal: SignalCategory;
  }

  const SIGNAL_META: Record<SignalCategory, { label: string; emoji: string; color: string; desc: string }> = {
    undervalued_stable: { label: "Undervalued & Stable", emoji: "🟢", color: "hsl(142, 71%, 45%)", desc: "Sold > listed price with tight market consistency" },
    fast_mover: { label: "Fast Mover", emoji: "⚡", color: "hsl(45, 93%, 47%)", desc: "Low days on market — high liquidity" },
    speculative: { label: "Speculative", emoji: "🎲", color: "hsl(280, 70%, 55%)", desc: "High price volatility — potential flip opportunity" },
    overpriced_slow: { label: "Overpriced & Slow", emoji: "🔴", color: "hsl(0, 72%, 50%)", desc: "Listed well above sold, slow to move" },
  };

  const signalAthletes = useMemo(() => {
    let allComparison: typeof rawComparison;
    if (signalMode === "raw") {
      allComparison = rawComparison;
    } else if (signalMode === "graded") {
      allComparison = gradedComparison;
    } else {
      // "both": merge, preferring raw when athlete exists in both
      allComparison = [...rawComparison];
      const seen = new Set(rawComparison.map(d => d.name));
      for (const d of gradedComparison) {
        if (!seen.has(d.name)) { allComparison.push(d); seen.add(d.name); }
      }
    }

    const results: SignalAthlete[] = [];
    for (const d of allComparison) {
      const rec = (signalMode === "graded" ? gradedListedData[d.name] : listedData[d.name]) as any;
      const cv: number | null = rec?.marketStabilityCV ?? rec?.marketplaces?.EBAY_US?.marketStabilityCV ?? null; // Market Stability Score
      const days: number | null = rec?.avgDaysOnMarket ?? rec?.marketplaces?.EBAY_US?.avgDaysOnMarket ?? null;
      const spreadPct = d.sold > 0 ? ((d.listed - d.sold) / d.sold) * 100 : 0;

      let signal: SignalCategory;
      if (cv != null && cv >= 0.35) {
        signal = "speculative";
      } else if (spreadPct < -5 && (cv == null || cv < 0.20)) {
        signal = "undervalued_stable";
      } else if (days != null && days < 180 && spreadPct <= 10) {
        signal = "fast_mover";
      } else if (spreadPct > 15 && (days == null || days > 300)) {
        signal = "overpriced_slow";
      } else if (spreadPct < 0 && (cv == null || cv < 0.25)) {
        signal = "undervalued_stable";
      } else if (days != null && days < 250) {
        signal = "fast_mover";
      } else if (spreadPct > 5) {
        signal = "overpriced_slow";
      } else {
        signal = "fast_mover"; // default bucket
      }

      results.push({ name: d.name, sport: d.sport, listed: d.listed, sold: d.sold, spreadPct, cv, days, signal });
    }

    return results;
  }, [signalMode, rawComparison, gradedComparison, listedData, gradedListedData]);

  const signalGroups = useMemo(() => {
    const groups: Record<SignalCategory, SignalAthlete[]> = {
      undervalued_stable: [], fast_mover: [], speculative: [], overpriced_slow: [],
    };
    for (const a of signalAthletes) groups[a.signal].push(a);
    // Sort each group by absolute spread
    for (const key of Object.keys(groups) as SignalCategory[]) {
      groups[key].sort((a, b) => Math.abs(b.spreadPct) - Math.abs(a.spreadPct));
    }
    return groups;
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
      const normKey = key.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
      const sport = sportMap[key] || sportMap[normKey] || (listed[key] as any)?.sport || "Other";
      addSport(sport);
      const lp = getListedPrice(listed[key] as ListedRecord);
      const sp = getSoldPrice(sold[key] as SoldRecord);
      if (lp != null) { agg[sport].listed += lp; agg[sport].listedCount += 1; }
      if (sp != null) { agg[sport].sold += sp; agg[sport].soldCount += 1; }
      agg[sport].totalCount += 1;
    }

    const entries = Object.entries(agg)
      .filter(([s]) => s === "Baseball" || s === "Soccer")
      .map(([sport, v]) => ({
        sport,
        avgListed: v.listedCount > 0 ? Math.round((v.listed / v.listedCount) * 100) / 100 : 0,
        avgSold: v.soldCount > 0 ? Math.round((v.sold / v.soldCount) * 100) / 100 : 0,
        totalListed: Math.round(v.listed * 100) / 100,
        totalSold: Math.round(v.sold * 100) / 100,
        count: v.totalCount,
      }))
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
  const gradedSportAgg = useMemo(() => buildSportAgg(gradedListedData, gradedSoldData, athleteSportMap), [gradedListedData, gradedSoldData, athleteSportMap]);

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
        description="Compare listed vs sold prices for 550+ Venezuelan athletes' trading cards. Scatter plots, price gaps, supply & demand charts, and investment signal scores updated daily."
        path="/data"
      />
      <VzlaNavbar />
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
          <p className="text-muted-foreground text-sm max-w-xl">
            Listed vs sold price analytics for Venezuelan athletes trading cards. Data powered by eBay market scans.
          </p>
          <div className="mt-3 flex items-center gap-3 flex-wrap">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-card/80 backdrop-blur-sm px-4 py-1.5">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs text-muted-foreground font-medium">Updated Daily</span>
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
            {/* ── KPI Cards — dual raw/graded ── */}
            {rawStats && (
              <section className="grid grid-cols-2 md:grid-cols-4 gap-3 my-6" aria-label="Market summary">
                {/* Athletes Matched */}
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="glass-panel p-4 shimmer">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">👥</span>
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Athletes Matched</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="text-[9px] text-muted-foreground uppercase tracking-wider mb-0.5">Raw</div>
                      <div className="text-xl font-display font-bold text-foreground">{rawStats.matched}</div>
                    </div>
                    <div>
                      <div className="text-[9px] text-muted-foreground uppercase tracking-wider mb-0.5">Graded</div>
                      <div className="text-xl font-display font-bold text-foreground">{gradedStats?.matched ?? "—"}</div>
                    </div>
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1">with both listed & sold data</div>
                </motion.div>

                {/* Avg Spread */}
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.08 }} className="glass-panel p-4 shimmer">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">📊</span>
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Avg Spread</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="text-[9px] text-muted-foreground uppercase tracking-wider mb-0.5">Raw</div>
                      <div className={`text-lg font-display font-bold ${rawStats.avgSpread > 0 ? "text-red-400" : "text-green-400"}`}>
                        {rawStats.avgSpread > 0 ? "+" : ""}${rawStats.avgSpread.toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[9px] text-muted-foreground uppercase tracking-wider mb-0.5">Graded</div>
                      {gradedStats ? (
                        <div className={`text-lg font-display font-bold ${gradedStats.avgSpread > 0 ? "text-red-400" : "text-green-400"}`}>
                          {gradedStats.avgSpread > 0 ? "+" : ""}${gradedStats.avgSpread.toFixed(2)}
                        </div>
                      ) : (
                        <div className="text-lg font-display font-bold text-muted-foreground/40">—</div>
                      )}
                    </div>
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1">listed vs sold gap</div>
                </motion.div>

                {/* Overpriced */}
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.16 }} className="glass-panel p-4 shimmer">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">🔴</span>
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Overpriced</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="text-[9px] text-muted-foreground uppercase tracking-wider mb-0.5">Raw</div>
                      <div className="text-xl font-display font-bold text-foreground">{rawStats.overpriced}</div>
                    </div>
                    <div>
                      <div className="text-[9px] text-muted-foreground uppercase tracking-wider mb-0.5">Graded</div>
                      <div className="text-xl font-display font-bold text-foreground">{gradedStats?.overpriced ?? "—"}</div>
                    </div>
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1">listed &gt; sold</div>
                </motion.div>

                {/* Underpriced */}
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.24 }} className="glass-panel p-4 shimmer">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">🟢</span>
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Underpriced</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="text-[9px] text-muted-foreground uppercase tracking-wider mb-0.5">Raw</div>
                      <div className="text-xl font-display font-bold text-foreground">{rawStats.underpriced}</div>
                    </div>
                    <div>
                      <div className="text-[9px] text-muted-foreground uppercase tracking-wider mb-0.5">Graded</div>
                      <div className="text-xl font-display font-bold text-foreground">{gradedStats?.underpriced ?? "—"}</div>
                    </div>
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1">sold &gt; listed (deals)</div>
                </motion.div>
              </section>
            )}

            {/* ── Sport Breakdown Cards — dual raw/graded ── */}
            <section className="my-8" aria-label="Sport breakdown">
              <h2 className="font-display font-bold text-lg text-foreground mb-4 flex items-center gap-2">
                <span className="w-1 h-5 rounded-full bg-primary inline-block" />
                By Sport
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {rawSportAgg.filter(s => s.sport === "All" || (s.avgListed > 0 && s.avgSold > 0)).map((s, i) => {
                  const g = gradedSportMap[s.sport];
                  const hasGraded = g && g.totalListed > 0 && g.totalSold > 0;
                  const rawSpread = s.totalListed - s.totalSold;
                  const rawPct = s.totalSold > 0 ? ((rawSpread / s.totalSold) * 100).toFixed(1) : "0";
                  const gradedSpread = hasGraded ? g.totalListed - g.totalSold : 0;
                  const gradedPct = hasGraded ? ((gradedSpread / g.totalSold) * 100).toFixed(1) : null;
                  return (
                    <motion.div
                      key={s.sport}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, delay: i * 0.06 }}
                      className="glass-panel p-4 hover:border-primary/20 transition-colors"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-lg border border-border"
                          style={{ backgroundColor: `${getSportColor(s.sport)}15` }}
                        >
                          {SPORT_ICONS[s.sport] || "🏅"}
                        </div>
                        <div>
                          <div className="font-display font-bold text-sm text-foreground">{s.sport}</div>
                          <div className="text-[10px] text-muted-foreground">{s.count} athletes</div>
                        </div>
                      </div>

                      {/* Avg Listed: Raw vs Graded */}
                      <div className="mb-2">
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Avg Listed</div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <div className="text-[9px] text-muted-foreground uppercase tracking-wider mb-0.5">Raw</div>
                            <div className="font-mono font-bold text-foreground text-sm">${s.avgListed.toFixed(2)}</div>
                          </div>
                          <div>
                            <div className="text-[9px] text-muted-foreground uppercase tracking-wider mb-0.5">Graded</div>
                            <div className="font-mono font-bold text-foreground text-sm">{hasGraded ? `$${g.avgListed.toFixed(2)}` : "—"}</div>
                          </div>
                        </div>
                      </div>

                      {/* Avg Sold: Raw vs Graded */}
                      <div className="mb-3">
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Avg Sold</div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <div className="text-[9px] text-muted-foreground uppercase tracking-wider mb-0.5">Raw</div>
                            <div className="font-mono font-bold text-foreground text-sm">${s.avgSold.toFixed(2)}</div>
                          </div>
                          <div>
                            <div className="text-[9px] text-muted-foreground uppercase tracking-wider mb-0.5">Graded</div>
                            <div className="font-mono font-bold text-foreground text-sm">{hasGraded ? `$${g.avgSold.toFixed(2)}` : "—"}</div>
                          </div>
                        </div>
                      </div>

                      {/* Mini bars — Raw */}
                      <div className="space-y-1.5">
                        <div className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider">Raw Totals</div>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] text-muted-foreground w-10 shrink-0">Listed</span>
                          <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, (s.totalListed / Math.max(s.totalListed, s.totalSold, 1)) * 100)}%`, backgroundColor: "hsl(45, 93%, 47%)" }} />
                          </div>
                          <span className="text-[9px] font-mono text-muted-foreground w-14 text-right">${s.totalListed.toFixed(0)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] text-muted-foreground w-10 shrink-0">Sold</span>
                          <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, (s.totalSold / Math.max(s.totalListed, s.totalSold, 1)) * 100)}%`, backgroundColor: "hsl(210, 80%, 55%)" }} />
                          </div>
                          <span className="text-[9px] font-mono text-muted-foreground w-14 text-right">${s.totalSold.toFixed(0)}</span>
                        </div>
                      </div>

                      {/* Mini bars — Graded */}
                      {hasGraded && (
                        <div className="space-y-1.5 mt-2">
                          <div className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider">Graded Totals</div>
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] text-muted-foreground w-10 shrink-0">Listed</span>
                            <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                              <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, (g.totalListed / Math.max(g.totalListed, g.totalSold, 1)) * 100)}%`, backgroundColor: "hsl(45, 93%, 47%)" }} />
                            </div>
                            <span className="text-[9px] font-mono text-muted-foreground w-14 text-right">${g.totalListed.toFixed(0)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] text-muted-foreground w-10 shrink-0">Sold</span>
                            <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                              <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, (g.totalSold / Math.max(g.totalListed, g.totalSold, 1)) * 100)}%`, backgroundColor: "hsl(210, 80%, 55%)" }} />
                            </div>
                            <span className="text-[9px] font-mono text-muted-foreground w-14 text-right">${g.totalSold.toFixed(0)}</span>
                          </div>
                        </div>
                      )}

                      {/* Market spread: Raw vs Graded */}
                      <div className="mt-3 pt-2 border-t border-border/50">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] text-muted-foreground">Spread</span>
                          <div className="flex items-center gap-3">
                            <div className="text-center">
                              <div className="text-[8px] text-muted-foreground uppercase">Raw</div>
                              <span className={`text-xs font-bold ${rawSpread > 0 ? "text-red-400" : "text-green-400"}`}>
                                {rawSpread > 0 ? "+" : ""}{rawPct}%
                              </span>
                            </div>
                            <div className="text-center">
                              <div className="text-[8px] text-muted-foreground uppercase">Graded</div>
                              <span className={`text-xs font-bold ${gradedPct ? (gradedSpread > 0 ? "text-red-400" : "text-green-400") : "text-muted-foreground/40"}`}>
                                {gradedPct ? `${gradedSpread > 0 ? "+" : ""}${gradedPct}%` : "—"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </section>

            {/* ── Scatter: Listed vs Sold ── */}
            <section className="my-8" aria-label="Listed vs Sold scatter chart">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
                <h2 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
                  <span className="w-1 h-5 rounded-full bg-primary inline-block" />
                  Listed vs Sold
                </h2>
                <ModeToggle value={scatterMode} onChange={(v) => { setScatterMode(v); setPinnedDot(null); setScatterSportFilter(null); }} />
              </div>
              <p className="text-xs text-muted-foreground mb-1 ml-3">
                Each dot is an athlete. Above the diagonal = listed higher than sold (overpriced).
              </p>
              <p className="text-xs text-muted-foreground mb-4 ml-3">
                <strong className="text-foreground">Dots above the line</strong> = sellers are asking more than buyers actually pay — potential overpricing.{" "}
                <strong className="text-foreground">Dots below the line</strong> = cards are selling for more than the listed average — potential deals worth targeting.{" "}
                The further a dot is from the diagonal, the bigger the price mismatch.
              </p>
              <div className="glass-panel p-4 md:p-6">
                <div className="w-full h-[400px] md:h-[450px] relative" ref={scatterWrapRef}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 10, right: 10, bottom: 40, left: 0 }} onClick={handleScatterClick}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                      <XAxis
                        type="number" dataKey="sold" name="Sold" unit="$"
                        label={{ value: "Avg Sold ($)", position: "insideBottom", offset: -10, style: { fill: "hsl(var(--muted-foreground))", fontSize: 11 } }}
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                      />
                      <YAxis
                        type="number" dataKey="listed" name="Listed" unit="$"
                        label={{ value: "Avg Listed ($)", angle: -90, position: "insideLeft", offset: 10, style: { fill: "hsl(var(--muted-foreground))", fontSize: 11 } }}
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                      />
                      <Tooltip content={() => null} />
                      <Scatter
                        data={(() => {
                          const allData = scatterDataBoth ? [...rawComparison, ...gradedComparison] : scatterData;
                          const maxVal = allData.length ? Math.max(...allData.map(d => Math.max(d.listed, d.sold))) : 10;
                          return [{ listed: 0, sold: 0 }, { listed: maxVal, sold: maxVal }];
                        })()}
                        line={{ stroke: "hsl(var(--muted-foreground))", strokeWidth: 1, strokeDasharray: "6 4" }}
                        shape={() => null} legendType="none" isAnimationActive={false}
                      />
                      {scatterDataBoth ? (
                        <>
                          <Scatter data={rawComparison} isAnimationActive={false} cursor="pointer" name="Raw">
                            {rawComparison.map((_entry, idx) => (
                              <Cell key={idx} fill="hsl(45, 93%, 47%)" fillOpacity={0.7} r={typeof window !== 'undefined' && window.innerWidth < 768 ? 6 : 5} />
                            ))}
                          </Scatter>
                          <Scatter data={gradedComparison} isAnimationActive={false} cursor="pointer" name="Graded">
                            {gradedComparison.map((_entry, idx) => (
                              <Cell key={idx} fill="hsl(280, 70%, 55%)" fillOpacity={0.7} r={typeof window !== 'undefined' && window.innerWidth < 768 ? 6 : 5} />
                            ))}
                          </Scatter>
                        </>
                      ) : (
                        <Scatter data={scatterData} isAnimationActive={false} cursor="pointer">
                          {scatterData.map((entry, idx) => (
                            <Cell key={idx} fill={getSportColor(entry.sport)} fillOpacity={0.8} r={typeof window !== 'undefined' && window.innerWidth < 768 ? 6 : 5} />
                          ))}
                        </Scatter>
                      )}
                    </ScatterChart>
                  </ResponsiveContainer>
                  {pinnedDot && <PinnedScatterTooltip data={pinnedDot} onClose={closePinned} />}
                </div>
                <div className="flex flex-wrap gap-4 mt-3 justify-center">
                  {scatterDataBoth ? (
                    <>
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "hsl(45, 93%, 47%)" }} />
                        Raw
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "hsl(280, 70%, 55%)" }} />
                        Graded
                      </div>
                    </>
                  ) : (
                    Object.entries(SPORT_COLORS)
                      .filter(([sport]) => scatterDataAll.some(d => d.sport === sport))
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
                    ))
                  )}
                </div>
              </div>
            </section>

            {/* ── Top 10 Price Spreads ── */}
            <section className="my-8" aria-label="Top price spreads">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
                <h2 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
                  <span className="w-1 h-5 rounded-full bg-primary inline-block" />
                  Biggest Price Gaps
                </h2>
                <ModeToggle value={gapsMode} onChange={setGapsMode} />
              </div>
              <p className="text-xs text-muted-foreground mb-1 ml-3">
                Top 10 athletes with the largest listed-to-sold price spread.
              </p>
              <p className="text-xs text-muted-foreground mb-4 ml-3">
                <span className="inline-flex items-center gap-1"><span className="inline-block w-3 h-0.5 rounded" style={{ backgroundColor: "hsl(0, 72%, 50%)" }} /> <strong className="text-foreground">Red bars</strong> = listed price is higher than sold (overpriced — sellers asking more than buyers pay).</span>{" "}
                <span className="inline-flex items-center gap-1"><span className="inline-block w-3 h-0.5 rounded" style={{ backgroundColor: "hsl(142, 71%, 45%)" }} /> <strong className="text-foreground">Green bars</strong> = sold price is higher than listed (deals — cards selling above ask).</span>{" "}
                Larger gaps signal bigger arbitrage opportunities or market inefficiencies.
              </p>
              <div className="glass-panel p-4 md:p-6">
                <div className="w-full h-[360px] md:h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topSpread} layout="vertical" margin={{ top: 22, right: 30, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                      <XAxis
                        type="number"
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                        label={{ value: "Spread ($)", position: "insideBottom", offset: -5, style: { fill: "hsl(var(--muted-foreground))", fontSize: 11 } }}
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
                          <Cell key={idx} fill={entry.spread > 0 ? "hsl(0, 72%, 50%)" : "hsl(142, 71%, 45%)"} fillOpacity={0.8} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex gap-6 justify-center mt-3">
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: "hsl(0, 72%, 50%)" }} />
                    Overpriced (listed &gt; sold)
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: "hsl(142, 71%, 45%)" }} />
                    Deals (sold &gt; listed)
                  </div>
                </div>
              </div>
            </section>

            {/* ── Supply & Demand ── */}
            <section className="my-8" aria-label="Supply and demand">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
                <h2 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
                  <span className="w-1 h-5 rounded-full bg-primary inline-block" />
                  Supply & Demand
                </h2>
                <ModeToggle value={supplyMode} onChange={setSupplyMode} />
              </div>
              <VzlaSupplyDemand comparisonData={supplyMode === "both" ? [...rawComparison, ...gradedComparison] : supplyComparison} hideTitle />
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
                Athletes classified by price spread, Stability score, and days on market. Data-driven — not guessing.
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
                                <div className={`text-xs font-mono font-bold ${a.spreadPct > 0 ? "text-red-400" : "text-green-400"}`}>
                                  {a.spreadPct > 0 ? "+" : ""}{a.spreadPct.toFixed(0)}%
                                </div>
                                <div className="text-[9px] text-muted-foreground">
                                  {a.cv != null ? `Stability ${(a.cv * 100).toFixed(0)}%` : ""}
                                  {a.cv != null && a.days != null ? " · " : ""}
                                  {a.days != null ? `${Math.round(a.days)}d` : ""}
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
            </section>

            {/* ── Signal Strength Top 10 ── */}
            <SignalStrengthChart
              listedData={listedData}
              gradedListedData={gradedListedData}
              athleteSportMap={athleteSportMap}
              athleteHistory={athleteHistory}
            />

            {/* ── Most Sold on eBay ── */}
            <MostSoldChart soldData={soldData} gradedSoldData={gradedSoldData} athleteSportMap={athleteSportMap} />

            {/* ── Gemrate Grading Data ── */}
            <GemrateChart />

            {/* ── PSA Pop vs Sold ── */}
            <PSAPopVsSoldChart gradedSoldData={gradedSoldData} athleteSportMap={athleteSportMap} />
          </>
        )}

        <VzlaFooter />
      </main>
      <VzlaEbayFooter />
    </div>
  );
};

/* ── Most Sold on eBay ── */
const SOLD_BAR_COLOR = "hsl(45, 93%, 47%)";

const MostSoldChart = ({ soldData, gradedSoldData, athleteSportMap }: {
  soldData: Record<string, any>;
  gradedSoldData: Record<string, any>;
  athleteSportMap: Record<string, string>;
}) => {
  const [soldMode, setSoldMode] = useState<CardMode>("raw");

  const top10 = useMemo(() => {
    const buildEntries = (src: Record<string, any>) => {
      const entries: { name: string; sport: string; soldCount: number; avgSold: number | null }[] = [];
      if (!src || typeof src !== "object") return entries;
      for (const [name, rec] of Object.entries(src)) {
        if (name === "_meta" || !rec) continue;
        const r = rec as any;
        const n = r.nSoldUsed ?? r.nScraped ?? 0;
        if (n <= 0) continue;
        const normKey = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
        const sport = athleteSportMap[name] || athleteSportMap[normKey] || "Other";
        const avgSold = r.taguchiSold ?? r.avg ?? null;
        entries.push({ name, sport, soldCount: n, avgSold });
      }
      return entries;
    };

    if (soldMode === "both") {
      const mergedMap = new Map<string, { name: string; sport: string; soldCount: number; avgSold: number | null }>();
      for (const src of [soldData, gradedSoldData]) {
        for (const entry of buildEntries(src)) {
          const existing = mergedMap.get(entry.name);
          if (existing) {
            existing.soldCount += entry.soldCount;
          } else {
            mergedMap.set(entry.name, { ...entry });
          }
        }
      }
      return [...mergedMap.values()].sort((a, b) => b.soldCount - a.soldCount).slice(0, 10);
    }

    const src = soldMode === "graded" ? gradedSoldData : soldData;
    return buildEntries(src).sort((a, b) => b.soldCount - a.soldCount).slice(0, 10);
  }, [soldData, gradedSoldData, athleteSportMap, soldMode]);

  const isEmpty = top10.length === 0;
  const updatedAt = (soldMode === "graded" ? gradedSoldData : soldData)?._meta?.updatedAt;
  const formattedDate = updatedAt
    ? new Date(updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : null;

  return (
    <section className="my-8" aria-label="Most sold athletes on eBay">
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
          <span className="w-1 h-5 rounded-full bg-vzla-yellow inline-block" />
          🔥 Most Sold – Top 10
        </h2>
        <ModeToggle value={soldMode} onChange={setSoldMode} />
      </div>
      <p className="text-xs text-muted-foreground mb-4 ml-3">
        Athletes with the highest {soldMode === "graded" ? "graded" : soldMode === "both" ? "total" : "raw"} verified sold volume on eBay (after filters).
        {formattedDate && <span className="ml-1 opacity-70">Updated {formattedDate}.</span>}
      </p>
      <div className="glass-panel p-4 md:p-6">
        {isEmpty ? (
          <div className="py-12 text-center">
            <div className="text-3xl mb-3">🔥</div>
            <p className="text-sm text-muted-foreground">No sold data available yet.</p>
          </div>
        ) : (
          <div className="w-full h-[450px] md:h-[550px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={top10} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                <XAxis
                  type="number"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                  label={{ value: "Verified Sold", position: "insideBottom", offset: -5, style: { fill: "hsl(var(--muted-foreground))", fontSize: 11 } }}
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
                        <span className="text-muted-foreground">Verified Sold: <strong className="text-foreground">{d.soldCount.toLocaleString()}</strong></span>
                        {d.avgSold != null && (
                          <div className="text-muted-foreground mt-1">Avg Sold: <strong className="text-foreground">${d.avgSold.toFixed(2)}</strong></div>
                        )}
                        <div className="text-[9px] text-muted-foreground/60 mt-1.5">Click bar to search on eBay</div>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="soldCount" name="Sold" fill={SOLD_BAR_COLOR} radius={[0, 4, 4, 0]} isAnimationActive={false} cursor="pointer"
                  onClick={(data: any) => {
                    if (data?.name) window.open(buildEbaySearchUrl(data.name, data.sport), "_blank", "noopener,noreferrer");
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        <p className="text-[9px] text-muted-foreground/60 text-center mt-3">
          Based on eBay sold listings after name & junk filters. Updated in batches.
        </p>
      </div>
    </section>
  );
};

/* ── Signal Strength Top 10 ── */
const SN_BAR_COLOR = "hsl(280, 70%, 55%)";

const SignalStrengthChart = ({ listedData, gradedListedData, athleteSportMap, athleteHistory }: {
  listedData: Record<string, ListedRecord>;
  gradedListedData: Record<string, ListedRecord>;
  athleteSportMap: Record<string, string>;
  athleteHistory: Record<string, any[]>;
}) => {
  const [snMode, setSnMode] = useState<CardMode>("raw");
  const [pinnedBar, setPinnedBar] = useState<{ name: string; sport: string; sn: number; mean: number; cv: number } | null>(null);
  const snWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pinnedBar) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      if (snWrapRef.current && !snWrapRef.current.contains(e.target as Node)) setPinnedBar(null);
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => { document.removeEventListener("mousedown", handler); document.removeEventListener("touchstart", handler); };
  }, [pinnedBar]);

  const top10 = useMemo(() => {
    const buildEntries = (src: Record<string, ListedRecord>) => {
      const entries: { name: string; sport: string; sn: number; mean: number; cv: number }[] = [];
      if (!src || typeof src !== "object") return entries;
      for (const [name, rec] of Object.entries(src)) {
        if (name === "_meta" || !rec) continue;
        const r = rec as any;
        const mean = r.taguchiListing ?? r.avgListing ?? r.trimmedListing ?? r.avg ?? r.average ?? null;
        const cv = r.marketStabilityCV ?? r.marketplaces?.EBAY_US?.marketStabilityCV ?? null;
        if (mean == null || cv == null || !Number.isFinite(mean) || !Number.isFinite(cv) || mean <= 0 || cv <= 0) continue;
        // S/N = 10 * log10(mean / sd) = 10 * log10(1 / CV)
        const sn = 10 * Math.log10(1 / cv);
        if (!Number.isFinite(sn)) continue;
        const normKey = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
        const sport = athleteSportMap[name] || athleteSportMap[normKey] || (r.sport as string) || "Other";
        entries.push({ name, sport, sn: Math.round(sn * 100) / 100, mean: Math.round(mean * 100) / 100, cv: Math.round(cv * 1000) / 1000 });
      }
      return entries;
    };

    if (snMode === "both") {
      const mergedMap = new Map<string, { name: string; sport: string; sn: number; mean: number; cv: number }>();
      for (const src of [listedData, gradedListedData]) {
        for (const entry of buildEntries(src)) {
          const existing = mergedMap.get(entry.name);
          if (!existing || entry.sn > existing.sn) {
            mergedMap.set(entry.name, entry);
          }
        }
      }
      return [...mergedMap.values()].sort((a, b) => b.sn - a.sn).slice(0, 10);
    }

    const src = snMode === "graded" ? gradedListedData : listedData;
    return buildEntries(src).sort((a, b) => b.sn - a.sn).slice(0, 10);
  }, [listedData, gradedListedData, athleteSportMap, snMode]);

  const isEmpty = top10.length === 0;

  return (
    <section className="my-8" aria-label="Signal strength top 10">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
        <h2 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
          <span className="w-1 h-5 rounded-full bg-primary inline-block" />
          📡 Signal Strength – Top 10
        </h2>
        <ModeToggle value={snMode} onChange={setSnMode} />
      </div>
      <p className="text-xs text-muted-foreground mb-1 ml-3">
        Investment quality indicator: <strong className="text-foreground">S/N = 10 · log(mean / sd)</strong>. Higher = stronger, more reliable market.
      </p>
      <p className="text-xs text-muted-foreground mb-4 ml-3">
        Athletes with <strong className="text-foreground">high signal strength</strong> have consistent pricing and strong market presence — ideal for confident buys.{" "}
        <strong className="text-foreground">Low scores</strong> indicate speculative, volatile markets.
      </p>
      <div className="glass-panel p-4 md:p-6">
        {isEmpty ? (
          <div className="py-12 text-center">
            <div className="text-3xl mb-3">📡</div>
            <p className="text-sm text-muted-foreground">Signal strength data requires both price mean and Stability score. Loading…</p>
          </div>
        ) : (
          <div className="w-full h-[450px] md:h-[550px] relative" ref={snWrapRef}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={top10} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                <XAxis
                  type="number"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                  label={{ value: "Signal-to-Noise (dB)", position: "insideBottom", offset: -5, style: { fill: "hsl(var(--muted-foreground))", fontSize: 11 } }}
                />
                <YAxis type="category" dataKey="name" width={150} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <Tooltip
                  content={({ payload }: any) => {
                    if (pinnedBar) return null;
                    if (!payload?.length) return null;
                    const d = payload[0]?.payload;
                    if (!d) return null;
                    return (
                      <div className="rounded-xl border border-border/50 bg-background/95 backdrop-blur-lg p-3 text-xs shadow-2xl">
                        <div className="font-display font-bold text-foreground mb-1">{d.name}</div>
                        <div className="text-muted-foreground text-[10px] mb-1.5">{d.sport}</div>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-muted-foreground">S/N Ratio: <strong className="text-foreground">{d.sn.toFixed(2)} dB</strong></span>
                          <span className="text-muted-foreground">Mean Price: <strong className="text-foreground">${d.mean.toFixed(2)}</strong></span>
                          <span className="text-muted-foreground">Market Score: <strong className="text-foreground">{(d.cv * 100).toFixed(1)}%</strong></span>
                        </div>
                        <div className="text-[9px] text-muted-foreground/60 mt-1.5">Click bar to pin details</div>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="sn" name="Signal Strength" fill={SN_BAR_COLOR} radius={[0, 4, 4, 0]} isAnimationActive={false} cursor="pointer"
                  onClick={(data: any) => {
                    if (data?.name) setPinnedBar(data);
                  }}
                >
                  {top10.map((entry, idx) => (
                    <Cell key={idx} fill={getSportColor(entry.sport)} fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            {pinnedBar && (
              <div className="absolute top-4 right-4 z-50 rounded-xl border border-border/50 bg-background/95 backdrop-blur-lg p-4 text-xs shadow-2xl max-w-[220px]">
                <button onClick={() => setPinnedBar(null)} className="absolute top-1.5 right-2 text-muted-foreground hover:text-foreground text-sm">✕</button>
                <div className="font-display font-bold text-foreground mb-1">{pinnedBar.name}</div>
                <div className="text-muted-foreground text-[10px] mb-1.5">{pinnedBar.sport}</div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-muted-foreground">S/N Ratio: <strong className="text-foreground">{pinnedBar.sn.toFixed(2)} dB</strong></span>
                  <span className="text-muted-foreground">Mean Price: <strong className="text-foreground">${pinnedBar.mean.toFixed(2)}</strong></span>
                  <span className="text-muted-foreground">Market Score: <strong className="text-foreground">{(pinnedBar.cv * 100).toFixed(1)}%</strong></span>
                </div>
                <a
                  href={buildEbaySearchUrl(pinnedBar.name, pinnedBar.sport)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-primary underline text-[10px] font-semibold hover:text-primary/80"
                >
                  🔎 Search on eBay →
                </a>
              </div>
            )}
          </div>
        )}
        <p className="text-[9px] text-muted-foreground/60 text-center mt-3">
          S/N = 10 · log₁₀(mean / std dev). Based on Taguchi signal-to-noise methodology. Higher values = more reliable investment.
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

const GemrateChart = () => {
  const [gemrateData, setGemrateData] = useState<GemrateData | null>(null);

  useEffect(() => {
    (async () => {
      let d = await fetchJson("https://raw.githubusercontent.com/jaydiare/ui-polish-pal/main/data/gemrate.json");
      if (!d || !d.athletes) {
        d = await fetchJson("data/gemrate.json");
      }
      if (d && d.athletes) setGemrateData(d);
    })();
  }, []);

  const top10 = useMemo(() => {
    if (!gemrateData?.athletes) return [];
    return Object.values(gemrateData.athletes)
      .filter((a) => a.totals && a.totals.grades > 0)
      .sort((a, b) => b.totals.grades - a.totals.grades)
      .slice(0, 10)
      .map((a) => ({
        name: a.name,
        sport: a.sport,
        PSA: a.graders?.PSA?.grades || a.totals.grades,
        total: a.totals.grades,
        gemRate: a.totals.gemRate,
      }));
  }, [gemrateData]);

  const isEmpty = !gemrateData || top10.length === 0;

  const updatedAt = gemrateData?._meta?.updatedAt
    ? new Date(gemrateData._meta.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : null;

  return (
    <section className="my-8" aria-label="Gemrate grading data">
      <h2 className="font-display font-bold text-lg text-foreground mb-1 flex items-center gap-2">
        <span className="w-1 h-5 rounded-full bg-primary inline-block" />
        Graded Cards – Top 10
      </h2>
      <p className="text-xs text-muted-foreground mb-4 ml-3">
        Total graded cards by PSA for Venezuelan athletes.
        {updatedAt && <span className="ml-1 opacity-70">Updated {updatedAt}.</span>}
      </p>
      <div className="glass-panel p-4 md:p-6">
        {isEmpty ? (
          <div className="py-12 text-center">
            <div className="text-3xl mb-3">📊</div>
            <p className="text-sm text-muted-foreground">Grading data will appear here once the quarterly update runs.</p>
            <a href="https://www.gemrate.com" target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline mt-2 inline-block">Visit gemrate.com →</a>
          </div>
        ) : (
          <>
            <div className="w-full h-[450px] md:h-[550px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={top10} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis
                    type="number"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                    label={{ value: "Total PSA Grades", position: "insideBottom", offset: -5, style: { fill: "hsl(var(--muted-foreground))", fontSize: 11 } }}
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
                          <div className="flex flex-col gap-0.5">
                            <span className="text-muted-foreground">PSA Grades: <strong className="text-foreground">{d.PSA.toLocaleString()}</strong></span>
                            <span className="text-muted-foreground">Gem Rate: <strong className="text-foreground">{d.gemRate}%</strong></span>
                          </div>
                          <div className="text-[9px] text-muted-foreground/60 mt-1.5">Click bar to search graded cards on eBay</div>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="PSA" name="PSA Grades" fill={PSA_COLOR} radius={[0, 4, 4, 0]} isAnimationActive={false} cursor="pointer"
                    onClick={(data: any) => { if (data?.name) window.open(buildEbayGradedSearchUrl(data.name, data.sport), "_blank", "noopener,noreferrer"); }} />
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

      const normKey = athlete.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
      const sport = athleteSportMap[athlete.name] || athleteSportMap[normKey] || athlete.sport || "Other";

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
