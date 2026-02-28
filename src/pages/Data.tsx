import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import VzlaNavbar from "@/components/VzlaNavbar";
import VzlaFooter from "@/components/VzlaFooter";
import VzlaEbayFooter from "@/components/VzlaEbayFooter";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface SoldRecord {
  avg?: number;
  taguchiSold?: number;
}

interface ListedRecord {
  avgListing?: number;
  taguchiListing?: number;
  trimmedListing?: number;
  avg?: number;
  average?: number;
  sport?: string;
  marketplaces?: Record<string, { avgListing?: number; taguchiListing?: number }>;
}

function getListedPrice(rec: ListedRecord | undefined): number | null {
  if (!rec) return null;
  // Check merged marketplace averages first
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
  } catch {
    return null;
  }
}

const SPORT_COLORS: Record<string, string> = {
  Baseball: "hsl(45, 93%, 47%)",
  Soccer: "hsl(142, 71%, 45%)",
  Basketball: "hsl(25, 95%, 53%)",
  Football: "hsl(221, 83%, 53%)",
  Other: "hsl(270, 60%, 55%)",
};

function getSportColor(sport: string) {
  return SPORT_COLORS[sport] || SPORT_COLORS.Other;
}

const Data = () => {
  const [listedData, setListedData] = useState<Record<string, ListedRecord>>({});
  const [soldData, setSoldData] = useState<Record<string, SoldRecord>>({});

  useEffect(() => {
    Promise.all([
      fetchJson("https://raw.githubusercontent.com/jaydiare/ui-polish-pal/main/data/ebay-avg.json"),
      fetchJson("https://raw.githubusercontent.com/jaydiare/ui-polish-pal/main/data/ebay-sold-avg.json"),
    ]).then(([listed, sold]) => {
      if (listed) setListedData(listed);
      if (sold) setSoldData(sold);
    });
  }, []);

  // Build unified comparison data
  const comparisonData = useMemo(() => {
    const items: { name: string; sport: string; listed: number; sold: number; spread: number }[] = [];
    const allKeys = new Set([...Object.keys(listedData), ...Object.keys(soldData)]);

    for (const key of allKeys) {
      if (key === "_meta") continue;
      const lp = getListedPrice(listedData[key] as ListedRecord);
      const sp = getSoldPrice(soldData[key] as SoldRecord);
      if (lp == null || sp == null) continue;

      const sport = (listedData[key] as any)?.sport || "Other";
      items.push({
        name: key,
        sport,
        listed: Math.round(lp * 100) / 100,
        sold: Math.round(sp * 100) / 100,
        spread: Math.round((lp - sp) * 100) / 100,
      });
    }
    return items;
  }, [listedData, soldData]);

  // Top spread athletes (biggest listed-sold gap)
  const topSpread = useMemo(() => {
    return [...comparisonData]
      .sort((a, b) => Math.abs(b.spread) - Math.abs(a.spread))
      .slice(0, 20);
  }, [comparisonData]);

  // Sport aggregation
  const sportAgg = useMemo(() => {
    const agg: Record<string, { listed: number; sold: number; count: number }> = {};
    for (const item of comparisonData) {
      const s = item.sport || "Other";
      if (!agg[s]) agg[s] = { listed: 0, sold: 0, count: 0 };
      agg[s].listed += item.listed;
      agg[s].sold += item.sold;
      agg[s].count += 1;
    }
    return Object.entries(agg)
      .map(([sport, v]) => ({
        sport,
        avgListed: Math.round((v.listed / v.count) * 100) / 100,
        avgSold: Math.round((v.sold / v.count) * 100) / 100,
        totalListed: Math.round(v.listed * 100) / 100,
        totalSold: Math.round(v.sold * 100) / 100,
        count: v.count,
      }))
      .sort((a, b) => b.count - a.count);
  }, [comparisonData]);

  const hasData = comparisonData.length > 0;

  return (
    <div className="min-h-screen">
      <VzlaNavbar />
      <main className="page-shell" role="main">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="py-8"
        >
          <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-2">
            📊 Market Data
          </h1>
          <p className="text-muted-foreground text-sm mb-8">
            Compare active listing prices vs sold comps across {comparisonData.length} athletes with matched data.
          </p>

          {!hasData ? (
            <div className="glass-panel p-12 text-center">
              <div className="animate-pulse text-muted-foreground">Loading market data…</div>
            </div>
          ) : (
            <Tabs defaultValue="scatter" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="scatter">Listed vs Sold</TabsTrigger>
                <TabsTrigger value="spread">Top Spreads</TabsTrigger>
                <TabsTrigger value="sports">By Sport</TabsTrigger>
              </TabsList>

              {/* ── Scatter: Listed vs Sold ── */}
              <TabsContent value="scatter">
                <div className="glass-panel p-4 md:p-6">
                  <h2 className="font-display font-bold text-lg mb-1 text-foreground">Listed vs Sold Price</h2>
                  <p className="text-xs text-muted-foreground mb-4">
                    Dots above the diagonal = listed higher than sold (overpriced). Below = underpriced.
                  </p>
                  <div className="w-full h-[400px] md:h-[500px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart margin={{ top: 10, right: 20, bottom: 40, left: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis
                          type="number"
                          dataKey="sold"
                          name="Sold"
                          unit="$"
                          label={{ value: "Avg Sold ($)", position: "insideBottom", offset: -10, style: { fill: "hsl(var(--muted-foreground))", fontSize: 12 } }}
                          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                        />
                        <YAxis
                          type="number"
                          dataKey="listed"
                          name="Listed"
                          unit="$"
                          label={{ value: "Avg Listed ($)", angle: -90, position: "insideLeft", offset: 10, style: { fill: "hsl(var(--muted-foreground))", fontSize: 12 } }}
                          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                        />
                        <Tooltip
                          content={({ payload }) => {
                            if (!payload?.length) return null;
                            const d = payload[0]?.payload;
                            if (!d) return null;
                            return (
                              <div className="glass-panel p-3 text-xs shadow-xl border border-border/50">
                                <div className="font-display font-bold text-foreground">{d.name}</div>
                                <div className="text-muted-foreground">{d.sport}</div>
                                <div className="mt-1 flex flex-col gap-0.5">
                                  <span>Listed: <strong className="text-foreground">${d.listed.toFixed(2)}</strong></span>
                                  <span>Sold: <strong className="text-foreground">${d.sold.toFixed(2)}</strong></span>
                                  <span>Spread: <strong className={d.spread > 0 ? "text-red-400" : "text-green-400"}>
                                    {d.spread > 0 ? "+" : ""}${d.spread.toFixed(2)}
                                  </strong></span>
                                </div>
                              </div>
                            );
                          }}
                        />
                        {/* Reference diagonal line — created via a second scatter */}
                        <Scatter
                          data={(() => {
                            const maxVal = Math.max(...comparisonData.map(d => Math.max(d.listed, d.sold)));
                            return [{ listed: 0, sold: 0 }, { listed: maxVal, sold: maxVal }];
                          })()}
                          line={{ stroke: "hsl(var(--muted-foreground))", strokeWidth: 1, strokeDasharray: "6 4" }}
                          shape={() => null}
                          legendType="none"
                          isAnimationActive={false}
                        />
                        <Scatter
                          data={comparisonData}
                          isAnimationActive={false}
                        >
                          {comparisonData.map((entry, idx) => (
                            <Cell
                              key={idx}
                              fill={getSportColor(entry.sport)}
                              fillOpacity={0.7}
                              r={5}
                            />
                          ))}
                        </Scatter>
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-wrap gap-4 mt-4 justify-center">
                    {Object.entries(SPORT_COLORS).map(([sport, color]) => (
                      <div key={sport} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                        {sport}
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              {/* ── Bar: Top Spread ── */}
              <TabsContent value="spread">
                <div className="glass-panel p-4 md:p-6">
                  <h2 className="font-display font-bold text-lg mb-1 text-foreground">Top 20 Price Spreads</h2>
                  <p className="text-xs text-muted-foreground mb-4">
                    Largest gaps between listed and sold price. Red = listed higher, green = sold higher (deals).
                  </p>
                  <div className="w-full h-[500px] md:h-[600px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={topSpread}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis
                          type="number"
                          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                          label={{ value: "Spread ($)", position: "insideBottom", offset: -5, style: { fill: "hsl(var(--muted-foreground))", fontSize: 12 } }}
                        />
                        <YAxis
                          type="category"
                          dataKey="name"
                          width={120}
                          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                        />
                        <Tooltip
                          content={({ payload }) => {
                            if (!payload?.length) return null;
                            const d = payload[0]?.payload;
                            if (!d) return null;
                            return (
                              <div className="glass-panel p-3 text-xs shadow-xl border border-border/50">
                                <div className="font-display font-bold text-foreground">{d.name}</div>
                                <div className="text-muted-foreground">{d.sport}</div>
                                <div className="mt-1 flex flex-col gap-0.5">
                                  <span>Listed: <strong>${d.listed.toFixed(2)}</strong></span>
                                  <span>Sold: <strong>${d.sold.toFixed(2)}</strong></span>
                                  <span>Spread: <strong className={d.spread > 0 ? "text-red-400" : "text-green-400"}>
                                    {d.spread > 0 ? "+" : ""}${d.spread.toFixed(2)}
                                  </strong></span>
                                </div>
                              </div>
                            );
                          }}
                        />
                        <Bar dataKey="spread" isAnimationActive={false}>
                          {topSpread.map((entry, idx) => (
                            <Cell
                              key={idx}
                              fill={entry.spread > 0 ? "hsl(0, 72%, 50%)" : "hsl(142, 71%, 45%)"}
                              fillOpacity={0.8}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </TabsContent>

              {/* ── Sport Comparison ── */}
              <TabsContent value="sports">
                <div className="glass-panel p-4 md:p-6">
                  <h2 className="font-display font-bold text-lg mb-1 text-foreground">Accumulated by Sport</h2>
                  <p className="text-xs text-muted-foreground mb-4">
                    Total accumulated listed vs sold prices per sport category.
                  </p>
                  <div className="w-full h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={sportAgg} margin={{ top: 10, right: 30, bottom: 20, left: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis
                          dataKey="sport"
                          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                        />
                        <YAxis
                          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                          label={{ value: "Total ($)", angle: -90, position: "insideLeft", style: { fill: "hsl(var(--muted-foreground))", fontSize: 12 } }}
                        />
                        <Tooltip
                          content={({ payload }) => {
                            if (!payload?.length) return null;
                            const d = payload[0]?.payload;
                            if (!d) return null;
                            return (
                              <div className="glass-panel p-3 text-xs shadow-xl border border-border/50">
                                <div className="font-display font-bold text-foreground">{d.sport}</div>
                                <div className="mt-1 flex flex-col gap-0.5">
                                  <span>Total Listed: <strong className="text-foreground">${d.totalListed.toFixed(2)}</strong></span>
                                  <span>Total Sold: <strong className="text-foreground">${d.totalSold.toFixed(2)}</strong></span>
                                  <span>Avg Listed: <strong>${d.avgListed.toFixed(2)}</strong></span>
                                  <span>Avg Sold: <strong>${d.avgSold.toFixed(2)}</strong></span>
                                  <span className="text-muted-foreground">{d.count} athletes</span>
                                </div>
                              </div>
                            );
                          }}
                        />
                        <Legend
                          wrapperStyle={{ fontSize: 12, color: "hsl(var(--muted-foreground))" }}
                        />
                        <Bar dataKey="totalListed" name="Total Listed" fill="hsl(45, 93%, 47%)" fillOpacity={0.8} />
                        <Bar dataKey="totalSold" name="Total Sold" fill="hsl(210, 80%, 55%)" fillOpacity={0.8} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Summary table */}
                  <div className="mt-6 overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-2 px-3 text-muted-foreground font-semibold">Sport</th>
                          <th className="text-right py-2 px-3 text-muted-foreground font-semibold">Athletes</th>
                          <th className="text-right py-2 px-3 text-muted-foreground font-semibold">Avg Listed</th>
                          <th className="text-right py-2 px-3 text-muted-foreground font-semibold">Avg Sold</th>
                          <th className="text-right py-2 px-3 text-muted-foreground font-semibold">Total Listed</th>
                          <th className="text-right py-2 px-3 text-muted-foreground font-semibold">Total Sold</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sportAgg.map((s) => (
                          <tr key={s.sport} className="border-b border-border/50 hover:bg-secondary/30">
                            <td className="py-2 px-3 font-medium text-foreground">{s.sport}</td>
                            <td className="py-2 px-3 text-right text-muted-foreground">{s.count}</td>
                            <td className="py-2 px-3 text-right font-mono text-foreground">${s.avgListed.toFixed(2)}</td>
                            <td className="py-2 px-3 text-right font-mono text-foreground">${s.avgSold.toFixed(2)}</td>
                            <td className="py-2 px-3 text-right font-mono text-foreground">${s.totalListed.toFixed(2)}</td>
                            <td className="py-2 px-3 text-right font-mono text-foreground">${s.totalSold.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </motion.div>
        <VzlaFooter />
      </main>
      <VzlaEbayFooter />
    </div>
  );
};

export default Data;
