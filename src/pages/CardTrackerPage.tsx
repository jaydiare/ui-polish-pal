import { useState, useEffect, useMemo, useRef, Component, type ReactNode } from "react";
import { Download } from "lucide-react";
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

/* ── CSV Download Helper ── */
function downloadCsv(filename: string, headers: string[], rows: (string | number | null)[][]) {
  const escape = (v: any) => {
    if (v == null) return "";
    const s = String(v);
    return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.map(escape).join(","), ...rows.map((r) => r.map(escape).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

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

/* ── Error Boundary ── */
class SectionErrorBoundary extends Component<{ label: string; children: ReactNode }, { hasError: boolean; error: string }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: "" };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message };
  }
  componentDidCatch(error: Error, info: any) {
    console.error(`[${this.props.label}] render error:`, error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="glass-panel p-6 rounded-xl mb-8 text-center">
          <p className="text-sm text-destructive font-semibold mb-1">Failed to render {this.props.label}</p>
          <p className="text-xs text-muted-foreground">{this.state.error}</p>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ── Page ── */
const CardTrackerPage = () => {
  const [data, setData] = useState<TrackerData | null>(null);
  const [scpData, setScpData] = useState<ScpHistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const range = Infinity;
  const dataMode: DataMode = "listed";
  const cardMode: CardMode = "raw";
  const selectedGrade = "10";
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
          <SectionErrorBoundary label="Athlete Reference Cards">
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
          </SectionErrorBoundary>
        )}

        {/* SportsCardsPro Long-Term History */}
        {scpData && (scpData["us250-acuna"] || scpData["us200-torres"]) && (
          <LazySection placeholder="Loading price history chart…">
            <SectionErrorBoundary label="SCP Price History Chart">
              <ScpHistorySection scpData={scpData} scpRange={scpRange} setScpRange={setScpRange} />
            </SectionErrorBoundary>
          </LazySection>
        )}

        {/* Snapshot Tables */}
        {CARD_KEYS.map((cardKey) => {
          const card = data[cardKey];
          if (!card || !card.snapshots) return null;
          const snaps = filterSnapshots(card.snapshots);
          return (
            <LazySection key={cardKey} placeholder={`Loading ${card.cardTitle}…`}>
              <SectionErrorBoundary label={card.cardTitle}>
                <CardSnapshotTable
                  card={card}
                  snapshots={snaps}
                  dataMode={dataMode}
                  cardMode={cardMode}
                  selectedGrade={selectedGrade}
                />
              </SectionErrorBoundary>
            </LazySection>
          );
        })}

        <VzlaFooter />
      </main>
      <VzlaEbayFooter />
    </div>
  );
};


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

  const handleDownloadCsv = () => {
    const headers = ["Date", "Avg Price", "Median", "CV", "S/N", "N", "Min", "Max"];
    const rows = reversed.map((snap) => {
      const stats = getStatsFromSnap(snap, dataMode, cardMode, selectedGrade);
      return [
        snap.date,
        stats?.taguchiMean ?? null,
        stats?.median ?? null,
        stats?.cv != null ? (stats.cv * 100).toFixed(1) : null,
        stats?.sn ?? null,
        stats?.n ?? null,
        stats?.min ?? null,
        stats?.max ?? null,
      ];
    });
    const safeName = card.cardTitle.replace(/[^a-zA-Z0-9]/g, "_").replace(/_+/g, "_");
    downloadCsv(`${safeName}_${modeLabel}_${cardLabel}.csv`, headers, rows);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="glass-panel p-4 md:p-6 rounded-xl mb-8"
    >
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-base font-display font-bold text-foreground">{card.cardTitle}</h3>
        <button
          onClick={handleDownloadCsv}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
          title="Download as CSV"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          CSV
        </button>
      </div>
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

/* ── Lazy section wrapper: renders children only when scrolled into view ── */
function LazySection({ children, placeholder }: { children: ReactNode; placeholder?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); obs.disconnect(); }
    }, { rootMargin: "200px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref}>
      {visible ? children : (
        <div className="glass-panel p-6 rounded-xl mb-8 text-center">
          <p className="text-sm text-muted-foreground">{placeholder || "Loading…"}</p>
        </div>
      )}
    </div>
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

  // Build combined chart data with mobile downsampling
  const chartData = useMemo(() => {
    const dateMap = new Map<string, any>();
    const cutoff = scpRange === Infinity ? null : new Date();
    if (cutoff) cutoff.setDate(cutoff.getDate() - scpRange);
    const cutoffStr = cutoff ? cutoff.toISOString().split("T")[0] : "";

    for (const grade of selectedScpGrades) {
      const acunaHist = acunaScp?.history?.[grade]?.data;
      if (acunaHist) {
        for (const pt of acunaHist) {
          if (cutoffStr && pt.date < cutoffStr) continue;
          const entry = dateMap.get(pt.date) || { date: pt.date };
          entry[`acuna_${grade}`] = pt.price;
          dateMap.set(pt.date, entry);
        }
      }
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

    let sorted = Array.from(dateMap.values()).sort((a: any, b: any) =>
      a.date.localeCompare(b.date)
    );

    // Downsample on mobile to prevent memory crashes (keep max ~200 points)
    const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
    const MAX_POINTS = isMobile ? 150 : 600;
    if (sorted.length > MAX_POINTS) {
      const step = Math.ceil(sorted.length / MAX_POINTS);
      sorted = sorted.filter((_, i) => i % step === 0 || i === sorted.length - 1);
    }

    return sorted;
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

        {/* CSV Download */}
        <button
          onClick={() => {
            const headers = ["Date", ...selectedScpGrades.flatMap((g) => {
              const cols: string[] = [];
              if (acunaScp?.history?.[g]) cols.push(`Acuña ${gradeLabel(g)}`);
              if (torresScp?.history?.[g]) cols.push(`Torres ${gradeLabel(g)}`);
              return cols;
            })];
            const rows = chartData.map((row: any) => [
              row.date,
              ...selectedScpGrades.flatMap((g) => {
                const vals: (number | null)[] = [];
                if (acunaScp?.history?.[g]) vals.push(row[`acuna_${g}`] ?? null);
                if (torresScp?.history?.[g]) vals.push(row[`torres_${g}`] ?? null);
                return vals;
              }),
            ]);
            downloadCsv(`SCP_History_${selectedScpGrades.join("_")}.csv`, headers, rows);
          }}
          className="px-3 py-1.5 text-xs font-medium rounded-md bg-accent text-accent-foreground hover:bg-accent/80 transition-colors flex items-center gap-1"
          title="Download current view as CSV"
        >
          <Download className="w-3 h-3" /> CSV
        </button>
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
