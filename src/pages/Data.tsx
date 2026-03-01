import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import VzlaNavbar from "@/components/VzlaNavbar";
import VzlaFooter from "@/components/VzlaFooter";
import VzlaEbayFooter from "@/components/VzlaEbayFooter";
import VzlaSupplyDemand from "@/components/VzlaSupplyDemand";
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

const Data = () => {
  const [listedData, setListedData] = useState<Record<string, ListedRecord>>({});
  const [soldData, setSoldData] = useState<Record<string, SoldRecord>>({});
  const [athleteSportMap, setAthleteSportMap] = useState<Record<string, string>>({});
  const [pinnedDot, setPinnedDot] = useState<PinnedData | null>(null);
  const scatterWrapRef = useRef<HTMLDivElement>(null);

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
      fetchJson("data/athletes.json"),
    ]).then(([listed, sold, athletes]) => {
      if (listed) setListedData(listed);
      if (athletes && Array.isArray(athletes)) {
        const map: Record<string, string> = {};
        const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
        for (const a of athletes) {
          if (a?.name && a?.sport) {
            map[a.name] = a.sport;          // exact key
            map[norm(a.name)] = a.sport;    // normalized key
          }
        }
        setAthleteSportMap(map);
      }
      if (sold) setSoldData(sold);
    });
  }, []);

  /* ── Comparison Data ── */
  const comparisonData = useMemo(() => {
    const items: { name: string; sport: string; listed: number; sold: number; spread: number }[] = [];
    const allKeys = new Set([...Object.keys(listedData), ...Object.keys(soldData)]);
    for (const key of allKeys) {
      if (key === "_meta") continue;
      const lp = getListedPrice(listedData[key] as ListedRecord);
      const sp = getSoldPrice(soldData[key] as SoldRecord);
      if (lp == null || sp == null) continue;
      // Filter extreme outliers where ratio > 10x (likely bad data from graded/auto cards)
      const ratio = Math.max(lp, sp) / Math.max(Math.min(lp, sp), 0.01);
      if (ratio > 10) continue;
      const normKey = key.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
      const sport = athleteSportMap[key] || athleteSportMap[normKey] || (listedData[key] as any)?.sport || "Other";
      items.push({ name: key, sport, listed: Math.round(lp * 100) / 100, sold: Math.round(sp * 100) / 100, spread: Math.round((lp - sp) * 100) / 100 });
    }
    return items;
  }, [listedData, soldData, athleteSportMap]);

  /* ── KPI Stats ── */
  const stats = useMemo(() => {
    if (!comparisonData.length) return null;
    const totalListed = comparisonData.reduce((s, d) => s + d.listed, 0);
    const totalSold = comparisonData.reduce((s, d) => s + d.sold, 0);
    const avgSpread = comparisonData.reduce((s, d) => s + d.spread, 0) / comparisonData.length;
    const overpriced = comparisonData.filter(d => d.spread > 0).length;
    const underpriced = comparisonData.filter(d => d.spread < 0).length;
    return { totalListed, totalSold, avgSpread, overpriced, underpriced, matched: comparisonData.length };
  }, [comparisonData]);

  /* ── Top Spreads ── */
  const topSpread = useMemo(() =>
    [...comparisonData].sort((a, b) => Math.abs(b.spread) - Math.abs(a.spread)).slice(0, 20),
    [comparisonData]);

  /* ── Sport Aggregation (includes listed-only athletes + "All" card) ── */
  const sportAgg = useMemo(() => {
    const agg: Record<string, { listed: number; sold: number; listedCount: number; soldCount: number; totalCount: number }> = {};
    const addSport = (sport: string) => {
      if (!agg[sport]) agg[sport] = { listed: 0, sold: 0, listedCount: 0, soldCount: 0, totalCount: 0 };
    };

    // Include all athletes from listedData (even without sold data)
    const allKeys = new Set([...Object.keys(listedData), ...Object.keys(soldData)]);
    for (const key of allKeys) {
      if (key === "_meta") continue;
      const normKey = key.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
      const sport = athleteSportMap[key] || athleteSportMap[normKey] || (listedData[key] as any)?.sport || "Other";
      addSport(sport);
      const lp = getListedPrice(listedData[key] as ListedRecord);
      const sp = getSoldPrice(soldData[key] as SoldRecord);
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

    // Add "All" summary card
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
  }, [listedData, soldData, athleteSportMap]);

  const hasData = comparisonData.length > 0;

  return (
    <div className="min-h-screen">
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
          <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-border/50 bg-card/80 backdrop-blur-sm px-4 py-1.5">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs text-muted-foreground font-medium">Updated Daily</span>
          </div>
        </motion.div>

        {!hasData ? (
          <div className="glass-panel p-16 text-center my-8">
            <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto mb-4" />
            <div className="text-muted-foreground text-sm">Loading market data…</div>
          </div>
        ) : (
          <>
            {/* ── KPI Cards ── */}
            {stats && (
              <section className="grid grid-cols-2 md:grid-cols-4 gap-3 my-6" aria-label="Market summary">
                {[
                  { label: "Athletes Matched", value: stats.matched.toString(), icon: "👥", sub: "with both listed & sold data" },
                  { label: "Avg Spread", value: `${stats.avgSpread > 0 ? "+" : ""}$${stats.avgSpread.toFixed(2)}`, icon: "📊", sub: stats.avgSpread > 0 ? "listed higher on avg" : "sold higher on avg", color: stats.avgSpread > 0 ? "text-red-400" : "text-green-400" },
                  { label: "Overpriced", value: stats.overpriced.toString(), icon: "🔴", sub: "listed > sold" },
                  { label: "Underpriced", value: stats.underpriced.toString(), icon: "🟢", sub: "sold > listed (deals)" },
                ].map((kpi, i) => (
                  <motion.div
                    key={kpi.label}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: i * 0.08 }}
                    className="glass-panel p-4 shimmer"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{kpi.icon}</span>
                      <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">{kpi.label}</span>
                    </div>
                    <div className={`text-2xl font-display font-bold tracking-tight ${kpi.color || "text-foreground"}`}>
                      {kpi.value}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-1">{kpi.sub}</div>
                  </motion.div>
                ))}
              </section>
            )}

            {/* ── Sport Breakdown Cards (always visible) ── */}
            <section className="my-8" aria-label="Sport breakdown">
              <h2 className="font-display font-bold text-lg text-foreground mb-4 flex items-center gap-2">
                <span className="w-1 h-5 rounded-full bg-primary inline-block" />
                By Sport
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {sportAgg.map((s, i) => {
                  const spread = s.totalListed - s.totalSold;
                  const pct = s.totalSold > 0 ? ((spread / s.totalSold) * 100).toFixed(1) : "0";
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

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Avg Listed</div>
                          <div className="font-mono font-bold text-foreground text-sm">${s.avgListed.toFixed(2)}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Avg Sold</div>
                          <div className="font-mono font-bold text-foreground text-sm">${s.avgSold.toFixed(2)}</div>
                        </div>
                      </div>

                      {/* Mini bar comparison */}
                      <div className="mt-3 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] text-muted-foreground w-10 shrink-0">Listed</span>
                          <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${Math.min(100, (s.totalListed / Math.max(s.totalListed, s.totalSold)) * 100)}%`,
                                backgroundColor: "hsl(45, 93%, 47%)",
                              }}
                            />
                          </div>
                          <span className="text-[9px] font-mono text-muted-foreground w-14 text-right">${s.totalListed.toFixed(0)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] text-muted-foreground w-10 shrink-0">Sold</span>
                          <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${Math.min(100, (s.totalSold / Math.max(s.totalListed, s.totalSold)) * 100)}%`,
                                backgroundColor: "hsl(210, 80%, 55%)",
                              }}
                            />
                          </div>
                          <span className="text-[9px] font-mono text-muted-foreground w-14 text-right">${s.totalSold.toFixed(0)}</span>
                        </div>
                      </div>

                      <div className="mt-3 pt-2 border-t border-border/50 flex justify-between items-center">
                        <span className="text-[10px] text-muted-foreground">Market spread</span>
                        <span className={`text-xs font-bold ${spread > 0 ? "text-red-400" : "text-green-400"}`}>
                          {spread > 0 ? "+" : ""}{pct}%
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </section>

            {/* ── Scatter: Listed vs Sold ── */}
            <section className="my-8" aria-label="Listed vs Sold scatter chart">
              <h2 className="font-display font-bold text-lg text-foreground mb-1 flex items-center gap-2">
                <span className="w-1 h-5 rounded-full bg-primary inline-block" />
                Listed vs Sold
              </h2>
              <p className="text-xs text-muted-foreground mb-4 ml-3">
                Each dot is an athlete. Above the diagonal = listed higher than sold (overpriced).
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
                          const maxVal = Math.max(...comparisonData.map(d => Math.max(d.listed, d.sold)));
                          return [{ listed: 0, sold: 0 }, { listed: maxVal, sold: maxVal }];
                        })()}
                        line={{ stroke: "hsl(var(--muted-foreground))", strokeWidth: 1, strokeDasharray: "6 4" }}
                        shape={() => null} legendType="none" isAnimationActive={false}
                      />
                      <Scatter data={comparisonData} isAnimationActive={false} cursor="pointer">
                        {comparisonData.map((entry, idx) => (
                          <Cell key={idx} fill={getSportColor(entry.sport)} fillOpacity={0.8} r={typeof window !== 'undefined' && window.innerWidth < 768 ? 6 : 5} />
                        ))}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                  {pinnedDot && <PinnedScatterTooltip data={pinnedDot} onClose={closePinned} />}
                </div>
              <div className="flex flex-wrap gap-4 mt-3 justify-center">
                  {Object.entries(SPORT_COLORS)
                    .filter(([sport]) => comparisonData.some(d => d.sport === sport))
                    .map(([sport, color]) => (
                    <div key={sport} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                      {sport}
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* ── Top 20 Price Spreads ── */}
            <section className="my-8" aria-label="Top price spreads">
              <h2 className="font-display font-bold text-lg text-foreground mb-1 flex items-center gap-2">
                <span className="w-1 h-5 rounded-full bg-primary inline-block" />
                Biggest Price Gaps
              </h2>
              <p className="text-xs text-muted-foreground mb-4 ml-3">
                Top 20 athletes with the largest listed-to-sold price spread.
              </p>
              <div className="glass-panel p-4 md:p-6">
                <div className="w-full h-[450px] md:h-[550px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topSpread} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                      <XAxis
                        type="number"
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                        label={{ value: "Spread ($)", position: "insideBottom", offset: -5, style: { fill: "hsl(var(--muted-foreground))", fontSize: 11 } }}
                      />
                      <YAxis type="category" dataKey="name" width={110} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9 }} />
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
            <VzlaSupplyDemand comparisonData={comparisonData} />

            {/* ── Gemrate Grading Data ── */}
            <GemrateChart />
          </>
        )}

        <VzlaFooter />
      </main>
      <VzlaEbayFooter />
    </div>
  );
};

/* ── Gemrate Grading Bar Chart ── */
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

const GRADER_COLORS: Record<string, string> = {
  PSA: "hsl(200, 80%, 50%)",
  Beckett: "hsl(340, 75%, 55%)",
  SGC: "hsl(45, 90%, 50%)",
};

const GemrateChart = () => {
  const [gemrateData, setGemrateData] = useState<GemrateData | null>(null);

  useEffect(() => {
    fetchJson("data/gemrate.json").then((d) => {
      if (d && d.athletes) setGemrateData(d);
    });
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
        PSA: a.graders?.PSA?.grades || 0,
        Beckett: a.graders?.Beckett?.grades || 0,
        SGC: a.graders?.SGC?.grades || 0,
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
        Total graded cards by PSA, Beckett &amp; SGC for Venezuelan athletes.
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
                <BarChart data={top10} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis
                    type="number"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                    label={{ value: "Total Grades", position: "insideBottom", offset: -5, style: { fill: "hsl(var(--muted-foreground))", fontSize: 11 } }}
                  />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9 }} />
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
                            <span className="text-muted-foreground">PSA: <strong className="text-foreground">{d.PSA.toLocaleString()}</strong></span>
                            <span className="text-muted-foreground">Beckett: <strong className="text-foreground">{d.Beckett.toLocaleString()}</strong></span>
                            <span className="text-muted-foreground">SGC: <strong className="text-foreground">{d.SGC.toLocaleString()}</strong></span>
                            <span className="text-muted-foreground mt-1">Gem Rate: <strong className="text-foreground">{d.gemRate}%</strong></span>
                          </div>
                          <div className="text-[9px] text-muted-foreground/60 mt-1.5">Click bar to search graded cards on eBay</div>
                        </div>
                      );
                    }}
                  />
                  <Legend verticalAlign="top" wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="PSA" stackId="grades" fill={GRADER_COLORS.PSA} radius={[0, 0, 0, 0]} isAnimationActive={false} cursor="pointer"
                    onClick={(data: any) => { if (data?.name) window.open(buildEbayGradedSearchUrl(data.name, data.sport), "_blank", "noopener,noreferrer"); }} />
                  <Bar dataKey="Beckett" stackId="grades" fill={GRADER_COLORS.Beckett} radius={[0, 0, 0, 0]} isAnimationActive={false} cursor="pointer"
                    onClick={(data: any) => { if (data?.name) window.open(buildEbayGradedSearchUrl(data.name, data.sport), "_blank", "noopener,noreferrer"); }} />
                  <Bar dataKey="SGC" stackId="grades" fill={GRADER_COLORS.SGC} radius={[0, 4, 4, 0]} isAnimationActive={false} cursor="pointer"
                    onClick={(data: any) => { if (data?.name) window.open(buildEbayGradedSearchUrl(data.name, data.sport), "_blank", "noopener,noreferrer"); }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex gap-6 justify-center mt-3">
              {Object.entries(GRADER_COLORS).map(([grader, color]) => (
                <div key={grader} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color }} />
                  {grader}
                </div>
              ))}
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

export default Data;
