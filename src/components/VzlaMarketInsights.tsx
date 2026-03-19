import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, AlertTriangle, DollarSign, BarChart3, Calendar } from "lucide-react";

const GITHUB_RAW = "https://raw.githubusercontent.com/jaydiare/ui-polish-pal/main/data";

interface Mover {
  name: string;
  listedPrice: number;
  soldPrice: number | null;
  listedPriceChange: number | null;
}

interface AnalysisData {
  _meta: {
    generatedAt: string;
    period: { start: string; end: string };
    focusSport: string;
    llmUsed: boolean;
  };
  stats: {
    baseballAthletesAnalyzed: number;
    sportSummary: Record<string, { athleteCount: number; avgPrice: number; medianPrice: number; avgChange: number }>;
    topMovers: { gainers: Mover[]; losers: Mover[] };
    mostVolatile: Mover[];
    cheapestListed: Mover[];
    anomalies: Mover[];
  };
  narrative?: {
    headline: string;
    summary: string;
    insights: string[];
    watchlist: { name: string; reason: string }[];
  };
}

export default function VzlaMarketInsights() {
  const [data, setData] = useState<AnalysisData | null>(null);

  useEffect(() => {
    // Fetch the directory listing isn't possible, so we try the latest known file
    // The workflow copies latest to a fixed path
    fetch(`${GITHUB_RAW}/analysis-latest.json`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .catch(() => {});
  }, []);

  if (!data) return null;

  const { stats, narrative, _meta } = data;
  const baseball = stats.sportSummary?.Baseball;
  const gainers = stats.topMovers?.gainers?.slice(0, 5) ?? [];
  const cheapest = stats.cheapestListed?.slice(0, 5) ?? [];
  const volatile = stats.mostVolatile?.slice(0, 3) ?? [];
  const anomalyCount = stats.anomalies?.length ?? 0;

  const periodLabel = `${formatDate(_meta.period.start)} – ${formatDate(_meta.period.end)}`;

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="mb-8"
    >
      <div className="glass-panel p-6 md:p-8 rounded-xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="w-5 h-5 text-vzla-yellow" />
              <h2 className="text-lg md:text-xl font-display font-bold text-foreground">
                {narrative?.headline ?? "Bi-Weekly Market Report"}
              </h2>
            </div>
            {narrative?.summary && (
              <p className="text-sm text-muted-foreground max-w-2xl">{narrative.summary}</p>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
            <Calendar className="w-3.5 h-3.5" />
            {periodLabel}
          </div>
        </div>

        {/* Key stats row */}
        {baseball && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <StatChip label="Athletes" value={String(baseball.athleteCount)} />
            <StatChip label="Avg Price" value={`$${baseball.avgPrice.toFixed(2)}`} />
            <StatChip label="Median" value={`$${baseball.medianPrice.toFixed(2)}`} />
            <StatChip
              label="Avg Change"
              value={`${baseball.avgChange > 0 ? "+" : ""}${baseball.avgChange.toFixed(1)}%`}
              color={baseball.avgChange >= 0 ? "text-emerald-400" : "text-red-400"}
            />
          </div>
        )}

        {/* Narrative insights */}
        {narrative?.insights && narrative.insights.length > 0 && (
          <div className="mb-6 space-y-2">
            {narrative.insights.map((insight, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="text-vzla-yellow mt-0.5">•</span>
                <span>{insight}</span>
              </div>
            ))}
          </div>
        )}

        {/* Columns grid */}
        <div className="grid gap-4 md:grid-cols-3">
          {/* Top Gainers */}
          <div className="rounded-lg bg-background/50 border border-border p-4">
            <div className="flex items-center gap-1.5 mb-3">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-foreground">Top Gainers</h3>
            </div>
            <ul className="space-y-2">
              {gainers.map((m) => (
                <MoverRow key={m.name} name={m.name} price={m.listedPrice} change={m.listedPriceChange} positive />
              ))}
            </ul>
          </div>

          {/* Most Volatile */}
          <div className="rounded-lg bg-background/50 border border-border p-4">
            <div className="flex items-center gap-1.5 mb-3">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-foreground">Most Volatile</h3>
              {anomalyCount > 0 && (
                <span className="ml-auto text-[10px] text-muted-foreground">{anomalyCount} anomalies</span>
              )}
            </div>
            <ul className="space-y-2">
              {volatile.map((m) => (
                <li key={m.name} className="flex items-center justify-between text-xs">
                  <span className="text-foreground truncate mr-2">{m.name}</span>
                  <span className="text-amber-400 font-mono shrink-0">CV {((m as any).cv ?? 0).toFixed(2)}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Value Picks */}
          <div className="rounded-lg bg-background/50 border border-border p-4">
            <div className="flex items-center gap-1.5 mb-3">
              <DollarSign className="w-4 h-4 text-vzla-yellow" />
              <h3 className="text-sm font-bold text-foreground">Value Picks</h3>
            </div>
            <ul className="space-y-2">
              {cheapest.map((m) => (
                <li key={m.name} className="flex items-center justify-between text-xs">
                  <span className="text-foreground truncate mr-2">{m.name}</span>
                  <span className="text-vzla-yellow font-mono font-bold shrink-0">${m.listedPrice.toFixed(2)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Watchlist */}
        {narrative?.watchlist && narrative.watchlist.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="text-xs text-muted-foreground">👀 Watch:</span>
            {narrative.watchlist.map((w) => (
              <span key={w.name} className="text-xs px-2 py-0.5 rounded-full bg-secondary border border-border text-foreground" title={w.reason}>
                {w.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </motion.section>
  );
}

function StatChip({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="text-center p-2.5 rounded-lg bg-background/50 border border-border">
      <div className={`text-base font-display font-bold ${color ?? "text-foreground"}`}>{value}</div>
      <div className="text-[10px] text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}

function MoverRow({ name, price, change, positive }: { name: string; price: number; change: number | null; positive?: boolean }) {
  return (
    <li className="flex items-center justify-between text-xs">
      <span className="text-foreground truncate mr-2">{name}</span>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-muted-foreground font-mono">${price.toFixed(2)}</span>
        {change != null && (
          <span className={`font-mono font-bold ${positive ? "text-emerald-400" : "text-red-400"}`}>
            {change > 0 ? "+" : ""}{change.toFixed(0)}%
          </span>
        )}
      </div>
    </li>
  );
}

function formatDate(d: string) {
  const [y, m, day] = d.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[Number(m) - 1]} ${Number(day)}`;
}
