import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from "recharts";
import SEOHead from "@/components/SEOHead";
import VzlaNavbar from "@/components/VzlaNavbar";
import VzlaFooter from "@/components/VzlaFooter";
import VzlaEbayFooter from "@/components/VzlaEbayFooter";
import AthleteCard from "@/components/AthleteCard";
import { useAthleteData } from "@/hooks/useAthleteData";
import type { Athlete } from "@/data/athletes";

/* ── SCP History Types ── */
interface ScpDataPoint {
  date: string;
  price: number;
}
interface ScpGradeSeries {
  label: string;
  dataPoints: number;
  firstDate: string;
  lastDate: string;
  data: ScpDataPoint[];
}
interface ScpCardEntry {
  name: string;
  cardTitle: string;
  productId: string;
  currentPrices: Record<string, number> | null;
  history: Record<string, ScpGradeSeries>;
}
interface ScpHistoryData {
  _meta: any;
  "us250-acuna"?: ScpCardEntry;
  "us200-torres"?: ScpCardEntry;
}

const SCP_GRADE_COLORS: Record<string, string> = {
  ungraded: "hsl(var(--muted-foreground))",
  "7": "#9b87f5",
  "8": "#6E59A5",
  "9": "#1EAEDB",
  "9.5": "#F97316",
  "10": "hsl(var(--vzla-yellow))",
};
const SCP_RANGE_OPTIONS = [
  { label: "1y", days: 365 },
  { label: "2y", days: 730 },
  { label: "5y", days: 1825 },
  { label: "All", days: Infinity },
];

/* ── Types ── */
interface CardStats {
  taguchiMean: number | null;
  median: number | null;
  cv: number | null;
  sn: number | null;
  n: number;
  min: number;
  max: number;
}

interface GradedData {
  overall: CardStats | null;
  byGrade: Record<string, CardStats>;
}

interface Snapshot {
  date: string;
  // New structure: listed + sold
  listed?: { raw: CardStats | null; graded: GradedData | null };
  sold?: { raw: CardStats | null; graded: GradedData | null };
  // Legacy compat
  raw?: CardStats | null;
  graded?: GradedData | null;
}

interface CardEntry {
  name: string;
  sport: string;
  cardTitle: string;
  snapshots: Snapshot[];
}

interface TrackerData {
  _meta: any;
  "us250-acuna": CardEntry;
  "us200-torres": CardEntry;
}

type DataMode = "listed" | "sold";
type CardMode = "raw" | "graded";

const CARD_KEYS = ["us250-acuna", "us200-torres"] as const;
const RANGE_OPTIONS = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
  { label: "All", days: Infinity },
];

const GITHUB_RAW = "https://raw.githubusercontent.com/jaydiare/ui-polish-pal/main/data";

/* Helper: get stats from snapshot respecting both new and legacy structure */
function getStatsFromSnap(snap: Snapshot, dataMode: DataMode, cardMode: CardMode, grade: string): CardStats | null {
  // Try new structure first
  const branch = dataMode === "listed" ? snap.listed : snap.sold;
  if (branch) {
    if (cardMode === "raw") return branch.raw ?? null;
    return branch.graded?.byGrade?.[grade] ?? branch.graded?.overall ?? null;
  }
  // Legacy fallback (only for listed)
  if (dataMode === "listed") {
    if (cardMode === "raw") return snap.raw ?? null;
    return snap.graded?.byGrade?.[grade] ?? snap.graded?.overall ?? null;
  }
  return null;
}

function getChartValue(snap: Snapshot, dataMode: DataMode, cardMode: CardMode, grade: string): number | null {
  const stats = getStatsFromSnap(snap, dataMode, cardMode, grade);
  return stats?.taguchiMean ?? null;
}

/* ── Page ── */
const CardTrackerPage = () => {
  const [data, setData] = useState<TrackerData | null>(null);
  const [scpData, setScpData] = useState<ScpHistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState(30);
  const [dataMode, setDataMode] = useState<DataMode>("listed");
  const [cardMode, setCardMode] = useState<CardMode>("raw");
  const [selectedGrade, setSelectedGrade] = useState("10");
  const [scpRange, setScpRange] = useState(1825); // 5 years default

  const {
    athletes, byName, byKey, gradedByName, gradedByKey,
    ebaySoldRaw, ebayGradedSoldRaw, athleteHistory,
  } = useAthleteData();

  useEffect(() => {
    (async () => {
      try {
        let r = await fetch(`${GITHUB_RAW}/card-tracker.json`, { cache: "no-store" });
        if (!r.ok) r = await fetch("/data/card-tracker.json");
        if (r.ok) { setData(await r.json()); }
      } catch { /* fallback silently */ }

      // Fetch SCP history
      try {
        let r2 = await fetch(`${GITHUB_RAW}/scp-history.json`, { cache: "no-store" });
        if (!r2.ok) r2 = await fetch("/data/scp-history.json");
        if (r2.ok) { setScpData(await r2.json()); }
      } catch { /* fallback silently */ }

      setLoading(false);
    })();
  }, []);

  const normalize = (s: string) =>
    s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  const refAthletes = useMemo(() => {
    const names = ["Ronald Acuna Jr.", "Gleyber Torres"];
    return names
      .map((n) => athletes.find((a) => normalize(a.name) === normalize(n)))
      .filter(Boolean) as Athlete[];
  }, [athletes]);

  const filterSnapshots = (snapshots: Snapshot[]) => {
    if (range === Infinity) return snapshots;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - range);
    const cutoffStr = cutoff.toISOString().split("T")[0];
    return snapshots.filter((s) => s.date >= cutoffStr);
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <VzlaNavbar />
        <main className="page-shell pt-8">
          <p className="text-muted-foreground text-center py-12">Loading tracker data…</p>
        </main>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen">
        <VzlaNavbar />
        <main className="page-shell pt-8 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Tracker data not available</h1>
          <Link to="/blog" className="text-vzla-yellow underline">← Back to Blog</Link>
        </main>
      </div>
    );
  }

  const acuna = data["us250-acuna"];
  const torres = data["us200-torres"];

  return (
    <div className="min-h-screen">
      <SEOHead
        title="Acuña & Torres RC Tracker"
        description="Daily price tracking for 2018 Topps Update Ronald Acuña Jr. #US250 and Gleyber Torres #US200 rookie cards — raw and PSA graded, listed and sold."
        path="/blog/acuna-torres-tracker"
        type="article"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: "Acuña & Torres RC Tracker",
          description: "Daily price tracking for two iconic 2018 Topps Update rookie cards.",
          datePublished: "2026-03-09",
          author: { "@type": "Organization", name: "VZLA Sports Elite" },
          mainEntityOfPage: "https://vzlasportselite.com/blog/acuna-torres-tracker",
        }}
      />
      <VzlaNavbar />
      <main className="page-shell pt-8">
        <Link to="/blog" className="text-sm text-muted-foreground hover:text-vzla-yellow transition-colors no-underline mb-4 inline-block">
          ← Back to Blog
        </Link>

        <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-2">
          Acuña & Torres RC Tracker
        </h1>
        <p className="text-muted-foreground text-sm mb-8">
          Daily price snapshots for 2018 Topps Update rookie cards — EBAY US & CA.
          Last updated: {data._meta?.lastUpdated ? new Date(data._meta.lastUpdated).toLocaleDateString() : "—"}
        </p>

        {/* Reference Athlete Cards */}
        {refAthletes.length > 0 && (
          <section className="mb-10">
            <h2 className="text-lg font-display font-bold text-foreground mb-4">Athlete Reference</h2>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-5">
              {refAthletes.map((a, i) => (
                <motion.div
                  key={a.name}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.1 }}
                >
                  <AthleteCard
                    athlete={a}
                    byName={byName}
                    byKey={byKey}
                    gradedByName={gradedByName}
                    gradedByKey={gradedByKey}
                    ebaySoldRaw={ebaySoldRaw}
                    ebayGradedSoldRaw={ebayGradedSoldRaw}
                    history={athleteHistory?.[a.name]}
                    priceMode="both"
                  />
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          {/* Time range */}
          <div className="flex gap-1 bg-secondary rounded-lg p-1">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.label}
                onClick={() => setRange(opt.days)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  range === opt.days
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Listed / Sold toggle */}
          <div className="flex gap-1 bg-secondary rounded-lg p-1">
            {(["listed", "sold"] as DataMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setDataMode(m)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors capitalize ${
                  dataMode === m
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          {/* Raw / Graded toggle */}
          <div className="flex gap-1 bg-secondary rounded-lg p-1">
            <button
              onClick={() => setCardMode("raw")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                cardMode === "raw"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Raw
            </button>
            <button
              onClick={() => setCardMode("graded")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                cardMode === "graded"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Graded (PSA)
            </button>
          </div>

          {/* PSA grade picker */}
          {cardMode === "graded" && (
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="bg-secondary text-foreground text-xs rounded-md px-3 py-1.5 border border-border"
            >
              {["10", "9.5", "9", "8.5", "8", "7.5", "7", "6.5", "6", "5.5", "5", "4.5", "4", "3.5", "3", "2.5", "2", "1.5", "1"].map((g) => (
                <option key={g} value={g}>PSA {g}</option>
              ))}
            </select>
          )}
        </div>

        {/* Line Chart */}
        <TrackerChart
          acuna={acuna}
          torres={torres}
          range={range}
          dataMode={dataMode}
          cardMode={cardMode}
          selectedGrade={selectedGrade}
          filterSnapshots={filterSnapshots}
        />

        {/* SportsCardsPro Long-Term History */}
        {scpData && (scpData["us250-acuna"] || scpData["us200-torres"]) && (
          <ScpHistorySection scpData={scpData} scpRange={scpRange} setScpRange={setScpRange} />
        )}

        {/* Snapshot Tables */}
        {CARD_KEYS.map((cardKey) => {
          const card = data[cardKey];
          if (!card || !card.snapshots) return null;
          const snaps = filterSnapshots(card.snapshots);
          return (
            <CardSnapshotTable
              key={cardKey}
              card={card}
              snapshots={snaps}
              dataMode={dataMode}
              cardMode={cardMode}
              selectedGrade={selectedGrade}
            />
          );
        })}

        <VzlaFooter />
      </main>
      <VzlaEbayFooter />
    </div>
  );
};

/* ── Chart Component ── */
function TrackerChart({
  acuna, torres, range, dataMode, cardMode, selectedGrade, filterSnapshots,
}: {
  acuna: CardEntry; torres: CardEntry; range: number;
  dataMode: DataMode; cardMode: CardMode; selectedGrade: string;
  filterSnapshots: (s: Snapshot[]) => Snapshot[];
}) {
  const chartData = useMemo(() => {
    const acunaSnaps = filterSnapshots(acuna.snapshots);
    const torresSnaps = filterSnapshots(torres.snapshots);
    const dateMap = new Map<string, any>();

    for (const s of acunaSnaps) {
      const entry = dateMap.get(s.date) || { date: s.date };
      entry.acuna = getChartValue(s, dataMode, cardMode, selectedGrade);
      dateMap.set(s.date, entry);
    }
    for (const s of torresSnaps) {
      const entry = dateMap.get(s.date) || { date: s.date };
      entry.torres = getChartValue(s, dataMode, cardMode, selectedGrade);
      dateMap.set(s.date, entry);
    }

    return Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [acuna, torres, range, dataMode, cardMode, selectedGrade, filterSnapshots]);

  if (!chartData.length) {
    return (
      <div className="glass-panel p-8 text-center mb-8">
        <p className="text-muted-foreground text-sm">
          No snapshot data yet. Data collection starts with the next daily run.
        </p>
      </div>
    );
  }

  const modeLabel = dataMode === "listed" ? "Listed" : "Sold";
  const cardLabel = cardMode === "raw" ? "Raw Card" : `PSA ${selectedGrade}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="glass-panel p-4 md:p-6 rounded-xl mb-8"
    >
      <h2 className="text-lg font-display font-bold text-foreground mb-4">
        {modeLabel} — {cardLabel} — Price Comparison
      </h2>
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="date"
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
            tickFormatter={(d) => d.slice(5)}
          />
          <YAxis
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
            tickFormatter={(v) => `$${v}`}
          />
          <Tooltip
            contentStyle={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 8,
              color: "hsl(var(--foreground))",
              fontSize: 12,
            }}
            formatter={(v: number) => v != null ? [`$${v.toFixed(2)}`, ""] : ["N/A", ""]}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="acuna"
            name="Acuña Jr. #US250"
            stroke="hsl(var(--vzla-yellow))"
            strokeWidth={2}
            dot={{ r: 3 }}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="torres"
            name="Torres #US200"
            stroke="hsl(var(--vzla-blue))"
            strokeWidth={2}
            dot={{ r: 3 }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </motion.div>
  );
}

/* ── Snapshot Table ── */
function CardSnapshotTable({
  card, snapshots, dataMode, cardMode, selectedGrade,
}: {
  card: CardEntry; snapshots: Snapshot[];
  dataMode: DataMode; cardMode: CardMode; selectedGrade: string;
}) {
  if (!snapshots.length) {
    return (
      <div className="glass-panel p-6 rounded-xl mb-8">
        <h3 className="text-base font-display font-bold text-foreground mb-2">{card.cardTitle}</h3>
        <p className="text-muted-foreground text-sm">No snapshots collected yet.</p>
      </div>
    );
  }

  const reversed = [...snapshots].reverse();
  const modeLabel = dataMode === "listed" ? "Listed" : "Sold";
  const cardLabel = cardMode === "raw" ? "Raw (Near Mint/Mint)" : `PSA ${selectedGrade}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="glass-panel p-4 md:p-6 rounded-xl mb-8"
    >
      <h3 className="text-base font-display font-bold text-foreground mb-1">{card.cardTitle}</h3>
      <p className="text-xs text-muted-foreground mb-4">
        {modeLabel} — {cardLabel} — {snapshots.length} snapshot{snapshots.length !== 1 ? "s" : ""}
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 px-2 text-muted-foreground font-medium">Date</th>
              <th className="text-right py-2 px-2 text-muted-foreground font-medium">Avg Price</th>
              <th className="text-right py-2 px-2 text-muted-foreground font-medium">Median</th>
              <th className="text-right py-2 px-2 text-muted-foreground font-medium">CV</th>
              <th className="text-right py-2 px-2 text-muted-foreground font-medium">S/N</th>
              <th className="text-right py-2 px-2 text-muted-foreground font-medium">N</th>
              <th className="text-right py-2 px-2 text-muted-foreground font-medium">Min</th>
              <th className="text-right py-2 px-2 text-muted-foreground font-medium">Max</th>
            </tr>
          </thead>
          <tbody>
            {reversed.map((snap) => {
              const stats = getStatsFromSnap(snap, dataMode, cardMode, selectedGrade);
              return (
                <tr key={snap.date} className="border-b border-border/50 hover:bg-secondary/40 transition-colors">
                  <td className="py-2 px-2 text-foreground font-mono">{snap.date}</td>
                  <td className="py-2 px-2 text-right text-vzla-yellow font-bold">
                    {stats?.taguchiMean != null ? `$${stats.taguchiMean.toFixed(2)}` : "—"}
                  </td>
                  <td className="py-2 px-2 text-right text-foreground">
                    {stats?.median != null ? `$${stats.median.toFixed(2)}` : "—"}
                  </td>
                  <td className="py-2 px-2 text-right text-foreground">
                    {stats?.cv != null ? `${(stats.cv * 100).toFixed(1)}%` : "—"}
                  </td>
                  <td className="py-2 px-2 text-right text-foreground">
                    {stats?.sn != null ? stats.sn.toFixed(1) : "—"}
                  </td>
                  <td className="py-2 px-2 text-right text-muted-foreground">
                    {stats?.n ?? "—"}
                  </td>
                  <td className="py-2 px-2 text-right text-muted-foreground">
                    {stats?.min != null ? `$${stats.min.toFixed(2)}` : "—"}
                  </td>
                  <td className="py-2 px-2 text-right text-muted-foreground">
                    {stats?.max != null ? `$${stats.max.toFixed(2)}` : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

/* ── SportsCardsPro Long-Term History Section ── */
function ScpHistorySection({
  scpData, scpRange, setScpRange,
}: {
  scpData: ScpHistoryData;
  scpRange: number;
  setScpRange: (d: number) => void;
}) {
  const [selectedScpGrades, setSelectedScpGrades] = useState<string[]>(["ungraded", "10"]);

  const acunaScp = scpData["us250-acuna"];
  const torresScp = scpData["us200-torres"];

  // Collect all available grades across both cards
  const allGrades = useMemo(() => {
    const grades = new Set<string>();
    for (const card of [acunaScp, torresScp]) {
      if (card?.history) {
        for (const g of Object.keys(card.history)) grades.add(g);
      }
    }
    return Array.from(grades).sort((a, b) => {
      const order = ["ungraded", "7", "8", "9", "9.5", "10"];
      return order.indexOf(a) - order.indexOf(b);
    });
  }, [acunaScp, torresScp]);

  const toggleGrade = (g: string) => {
    setSelectedScpGrades((prev) =>
      prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]
    );
  };

  // Build combined chart data
  const chartData = useMemo(() => {
    const dateMap = new Map<string, Record<string, number | null>>();
    const cutoff = scpRange === Infinity ? null : new Date();
    if (cutoff) cutoff.setDate(cutoff.getDate() - scpRange);
    const cutoffStr = cutoff ? cutoff.toISOString().split("T")[0] : "";

    for (const grade of selectedScpGrades) {
      // Acuña data
      const acunaHist = acunaScp?.history?.[grade]?.data;
      if (acunaHist) {
        for (const pt of acunaHist) {
          if (cutoffStr && pt.date < cutoffStr) continue;
          const entry = dateMap.get(pt.date) || { date: pt.date };
          entry[`acuna_${grade}`] = pt.price;
          dateMap.set(pt.date, entry);
        }
      }
      // Torres data
      const torresHist = torresScp?.history?.[grade]?.data;
      if (torresHist) {
        for (const pt of torresHist) {
          if (cutoffStr && pt.date < cutoffStr) continue;
          const entry = dateMap.get(pt.date) || { date: pt.date };
          entry[`torres_${grade}`] = pt.price;
          dateMap.set(pt.date, entry);
        }
      }
    }

    return Array.from(dateMap.values()).sort((a, b) =>
      (a.date as string).localeCompare(b.date as string)
    );
  }, [acunaScp, torresScp, selectedScpGrades, scpRange]);

  if (!chartData.length && allGrades.length === 0) return null;

  const gradeLabel = (g: string) =>
    g === "ungraded" ? "Raw" : g === "10" ? "PSA 10" : `Grade ${g}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="glass-panel p-4 md:p-6 rounded-xl mb-8"
    >
      <h2 className="text-lg font-display font-bold text-foreground mb-1">
        📈 Long-Term Price History
      </h2>
      <p className="text-xs text-muted-foreground mb-4">
        Historical sold prices from SportsCardsPro — up to 5 years of data.
        {scpData._meta?.fetchedAt && (
          <span className="ml-2">
            Fetched: {new Date(scpData._meta.fetchedAt).toLocaleDateString()}
          </span>
        )}
      </p>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {/* Time range */}
        <div className="flex gap-1 bg-secondary rounded-lg p-1">
          {SCP_RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.label}
              onClick={() => setScpRange(opt.days)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                scpRange === opt.days
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Grade toggles */}
        <div className="flex flex-wrap gap-1">
          {allGrades.map((g) => (
            <button
              key={g}
              onClick={() => toggleGrade(g)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-colors ${
                selectedScpGrades.includes(g)
                  ? "border-primary bg-primary/20 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {gradeLabel(g)}
            </button>
          ))}
        </div>
      </div>

      {chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={360}>
          <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="date"
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
              tickFormatter={(d) => {
                const parts = d.split("-");
                return `${parts[1]}/${parts[0].slice(2)}`;
              }}
              interval="preserveStartEnd"
              minTickGap={40}
            />
            <YAxis
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              tickFormatter={(v) => `$${v}`}
            />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
                color: "hsl(var(--foreground))",
                fontSize: 11,
              }}
              formatter={(v: number, name: string) => {
                if (v == null) return ["N/A", ""];
                const parts = name.split("_");
                const player = parts[0] === "acuna" ? "Acuña" : "Torres";
                const grade = gradeLabel(parts.slice(1).join("_"));
                return [`$${v.toFixed(2)}`, `${player} ${grade}`];
              }}
              labelFormatter={(d) => d}
            />
            <Legend
              formatter={(value: string) => {
                const parts = value.split("_");
                const player = parts[0] === "acuna" ? "Acuña" : "Torres";
                const grade = gradeLabel(parts.slice(1).join("_"));
                return `${player} ${grade}`;
              }}
            />
            {selectedScpGrades.flatMap((grade) => {
              const color = SCP_GRADE_COLORS[grade] || "hsl(var(--foreground))";
              const lines = [];
              if (acunaScp?.history?.[grade]) {
                lines.push(
                  <Line
                    key={`acuna_${grade}`}
                    type="monotone"
                    dataKey={`acuna_${grade}`}
                    name={`acuna_${grade}`}
                    stroke={color}
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                  />
                );
              }
              if (torresScp?.history?.[grade]) {
                lines.push(
                  <Line
                    key={`torres_${grade}`}
                    type="monotone"
                    dataKey={`torres_${grade}`}
                    name={`torres_${grade}`}
                    stroke={color}
                    strokeWidth={2}
                    strokeDasharray="5 3"
                    dot={false}
                    connectNulls
                  />
                );
              }
              return lines;
            })}
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <p className="text-muted-foreground text-sm text-center py-8">
          No historical data available yet. Run the SportsCardsPro fetch workflow to populate.
        </p>
      )}

      {/* Current prices from SCP */}
      {(acunaScp?.currentPrices || torresScp?.currentPrices) && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {[acunaScp, torresScp].filter(Boolean).map((card) => (
            <div key={card!.productId} className="bg-secondary/50 rounded-lg p-3">
              <h4 className="text-xs font-bold text-foreground mb-2">{card!.name} — SCP Current</h4>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {card!.currentPrices && Object.entries(card!.currentPrices)
                  .filter(([, v]) => v > 0)
                  .map(([k, v]) => (
                    <div key={k}>
                      <span className="text-muted-foreground capitalize">{k.replace(/_/g, " ")}</span>
                      <span className="block font-bold text-vzla-yellow">${v.toFixed(2)}</span>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

export default CardTrackerPage;
