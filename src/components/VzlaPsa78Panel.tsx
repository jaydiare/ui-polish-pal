import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Award, TrendingUp } from "lucide-react";

// Same Git-as-database raw URL pattern used elsewhere on /index
const GITHUB_RAW = "https://raw.githubusercontent.com/jaydiare/ui-polish-pal/main/data";
const LOCAL_FALLBACK = "/data/ebay-psa78-sold-avg.json";

interface GradeBucket {
  keyword?: string;
  nScraped?: number;
  nSoldUsed?: number;
  taguchiSold?: number | null;
  medianSold?: number | null;
  marketStabilityCV?: number | null;
  currency?: string;
  lastKnownSold?: number | null;
  lastKnownSoldAt?: string | null;
}

interface AthleteRow {
  psa7?: GradeBucket;
  psa8?: GradeBucket;
}

interface Psa78Data {
  _meta?: {
    updatedAt?: string;
    targetGrades?: number[];
  };
  [name: string]: AthleteRow | Psa78Data["_meta"];
}

interface Row {
  name: string;
  psa7: number | null;
  psa8: number | null;
  psa7N: number;
  psa8N: number;
  premium: number | null; // PSA 8 / PSA 7 ratio
}

const fmtUSD = (v: number | null | undefined) =>
  v == null ? "—" : `USD $${v.toFixed(2)}`;

function Skeleton() {
  return (
    <section className="glass-panel p-5 mb-6 animate-pulse" aria-label="Loading PSA 7 & PSA 8 sold comps">
      <div className="flex items-center gap-2 mb-4">
        <div className="h-4 w-4 rounded bg-muted" />
        <div className="h-4 w-56 rounded bg-muted" />
        <div className="ml-auto h-3 w-32 rounded bg-muted" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[0, 1].map((i) => (
          <div key={i} className="rounded-lg bg-secondary/60 p-3 space-y-2">
            <div className="h-3 w-20 rounded bg-muted" />
            {Array.from({ length: 5 }).map((_, j) => (
              <div key={j} className="flex items-center gap-3">
                <div className="h-3 w-32 rounded bg-muted" />
                <div className="h-3 w-16 rounded bg-muted ml-auto" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

export default function VzlaPsa78Panel() {
  const [data, setData] = useState<Psa78Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const tryFetch = async (url: string) => {
        try {
          const res = await fetch(url, { cache: "no-store" });
          if (!res.ok) return null;
          return (await res.json()) as Psa78Data;
        } catch {
          return null;
        }
      };
      const remote = await tryFetch(`${GITHUB_RAW}/ebay-psa78-sold-avg.json`);
      const local = remote ?? (await tryFetch(LOCAL_FALLBACK));
      if (cancelled) return;
      if (!local) setErrored(true);
      setData(local);
      setLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const { rows, updatedAt } = useMemo(() => {
    if (!data) return { rows: [] as Row[], updatedAt: null as string | null };
    const out: Row[] = [];
    let updatedAt: string | null = null;
    for (const [name, value] of Object.entries(data)) {
      if (name === "_meta") {
        updatedAt = (value as Psa78Data["_meta"])?.updatedAt ?? null;
        continue;
      }
      const row = value as AthleteRow;
      const psa7 = row.psa7?.taguchiSold ?? null;
      const psa8 = row.psa8?.taguchiSold ?? null;
      const psa7N = row.psa7?.nSoldUsed ?? 0;
      const psa8N = row.psa8?.nSoldUsed ?? 0;
      // Skip athletes with no data in either bucket
      if (psa7 == null && psa8 == null) continue;
      const premium = psa7 && psa8 ? psa8 / psa7 : null;
      out.push({ name, psa7, psa8, psa7N, psa8N, premium });
    }
    return { rows: out, updatedAt };
  }, [data]);

  const topPsa8 = useMemo(
    () => [...rows].filter((r) => r.psa8 != null).sort((a, b) => (b.psa8 ?? 0) - (a.psa8 ?? 0)).slice(0, 8),
    [rows]
  );
  const topPsa7 = useMemo(
    () => [...rows].filter((r) => r.psa7 != null).sort((a, b) => (b.psa7 ?? 0) - (a.psa7 ?? 0)).slice(0, 8),
    [rows]
  );
  const topPremium = useMemo(
    () =>
      [...rows]
        .filter((r) => r.premium != null && r.premium > 1)
        .sort((a, b) => (b.premium ?? 0) - (a.premium ?? 0))
        .slice(0, 5),
    [rows]
  );

  if (loading) return <Skeleton />;

  if (errored || rows.length === 0) {
    return (
      <section className="glass-panel p-5 mb-6" aria-label="PSA 7 & PSA 8 sold comps">
        <div className="flex items-center gap-2 mb-2">
          <Award className="h-4 w-4 text-primary" aria-hidden="true" />
          <h2 className="text-sm font-semibold tracking-wide uppercase">PSA 7 & PSA 8 Sold Comps</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          No PSA 7/8 sold data available yet. The eBay sold-comps pipeline runs on a schedule, check back after the next batch completes.
        </p>
      </section>
    );
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="glass-panel p-5 mb-6"
      aria-label="PSA 7 and PSA 8 sold comps"
    >
      <header className="flex items-center gap-2 mb-4 flex-wrap">
        <Award className="h-4 w-4 text-primary" aria-hidden="true" />
        <h2 className="text-sm font-semibold tracking-wide uppercase">PSA 7 & PSA 8 Sold Comps</h2>
        {updatedAt && (
          <span className="ml-auto text-[11px] text-muted-foreground">
            Updated {new Date(updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
        )}
      </header>

      <p className="text-xs text-muted-foreground mb-4 text-pretty">
        Recent eBay sold averages for mid-grade slabs across the gemrate-flagged roster. Prices use Taguchi winsorized means and include shipping.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Top PSA 8 */}
        <div className="rounded-lg bg-secondary/60 p-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center justify-center text-[10px] font-bold rounded px-1.5 py-0.5 bg-primary/20 text-primary">
              PSA 8
            </span>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Top recent comps</h3>
          </div>
          <ul className="space-y-1.5" role="list">
            {topPsa8.map((r) => (
              <li key={`p8-${r.name}`} className="flex items-center gap-3 text-xs">
                <span className="truncate font-medium">{r.name}</span>
                <span className="ml-auto tabular-nums">{fmtUSD(r.psa8)}</span>
                <span className="text-[10px] text-muted-foreground tabular-nums w-8 text-right">n={r.psa8N}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Top PSA 7 */}
        <div className="rounded-lg bg-secondary/60 p-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center justify-center text-[10px] font-bold rounded px-1.5 py-0.5 bg-muted text-foreground">
              PSA 7
            </span>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Top recent comps</h3>
          </div>
          <ul className="space-y-1.5" role="list">
            {topPsa7.map((r) => (
              <li key={`p7-${r.name}`} className="flex items-center gap-3 text-xs">
                <span className="truncate font-medium">{r.name}</span>
                <span className="ml-auto tabular-nums">{fmtUSD(r.psa7)}</span>
                <span className="text-[10px] text-muted-foreground tabular-nums w-8 text-right">n={r.psa7N}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {topPremium.length > 0 && (
        <div className="rounded-lg bg-secondary/40 p-3">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Biggest PSA 8 vs PSA 7 premium
            </h3>
          </div>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5" role="list">
            {topPremium.map((r) => (
              <li key={`prem-${r.name}`} className="flex items-center gap-3 text-xs">
                <span className="truncate font-medium">{r.name}</span>
                <span className="ml-auto tabular-nums text-primary font-semibold">
                  {((r.premium ?? 1) * 100 - 100).toFixed(0)}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-[10px] text-muted-foreground mt-3">
        Source: eBay public sold listings, gemrate-flagged athletes only. n = sold listings used after filters.
      </p>
    </motion.section>
  );
}
