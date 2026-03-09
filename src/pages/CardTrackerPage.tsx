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
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState(30);
  const [dataMode, setDataMode] = useState<DataMode>("listed");
  const [cardMode, setCardMode] = useState<CardMode>("raw");
  const [selectedGrade, setSelectedGrade] = useState("10");

  const {
    athletes, byName, byKey, gradedByName, gradedByKey,
    ebaySoldRaw, ebayGradedSoldRaw, athleteHistory,
  } = useAthleteData();

  useEffect(() => {
    fetch(`${GITHUB_RAW}/card-tracker.json`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
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
          description: "Daily price tracking with Taguchi analysis for two iconic 2018 Topps Update rookie cards.",
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
          Daily price snapshots with Taguchi analysis for 2018 Topps Update rookie cards — EBAY US & CA.
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

        {/* Snapshot Tables */}
        {CARD_KEYS.map((cardKey) => {
          const card = data[cardKey];
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
              <th className="text-right py-2 px-2 text-muted-foreground font-medium">Taguchi Mean</th>
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

export default CardTrackerPage;
