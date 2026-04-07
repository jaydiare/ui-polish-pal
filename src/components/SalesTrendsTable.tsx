import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";

interface SalesTrendAthlete {
  name: string;
  sport: string;
  category: string;
  mostGradedYear: string | null;
  firstGradedYear: string | null;
  monthlyVolumes: Record<string, number | null>;
  ytd2026?: string;
  ytd2025?: string;
}

interface SalesTrendsData {
  _meta: { updatedAt: string; athleteCount: number };
  athletes: SalesTrendAthlete[];
}

const SPORT_ICONS: Record<string, string> = {
  Baseball: "⚾", Soccer: "⚽", Basketball: "🏀", Football: "🏈",
};

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_KEYS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

function buildEbayListingsUrl(name: string, sport: string): string {
  const query = encodeURIComponent(`${name} ${sport} card`);
  return `https://www.ebay.com/sch/i.html?_nkw=${query}&_sacat=261328&LH_BIN=1&mkevt=1&mkcid=1&mkrid=706-53473-19255-0&campid=5339142305&toolid=10001&customid=sales-trends-listings`;
}

function buildEbayResearchUrl(name: string, sport: string): string {
  const query = encodeURIComponent(`${name} ${sport} card`);
  return `https://www.ebay.com/sch/i.html?_nkw=${query}&_sacat=261328&LH_Complete=1&LH_Sold=1&mkevt=1&mkcid=1&mkrid=706-53473-19255-0&campid=5339142305&toolid=10001&customid=sales-trends-research`;
}

function formatCurrency(val: number | null): string {
  if (val == null) return "—";
  return `$${val.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatChange(val: number | null): { text: string; className: string } {
  if (val == null) return { text: "—", className: "text-muted-foreground" };
  const prefix = val > 0 ? "+" : "";
  const color = val > 0 ? "text-green-500" : val < 0 ? "text-red-500" : "text-muted-foreground";
  return { text: `${prefix}$${Math.abs(val).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`, className: color };
}

function formatPct(val: number | null): { text: string; className: string } {
  if (val == null) return { text: "—", className: "text-muted-foreground" };
  const prefix = val > 0 ? "+" : "";
  const color = val > 0 ? "text-green-500" : val < 0 ? "text-red-500" : "text-muted-foreground";
  return { text: `${prefix}${val.toFixed(0)}%`, className: color };
}

const SalesTrendsTable = () => {
  const [data, setData] = useState<SalesTrendsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<string>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [sportFilter, setSportFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    (async () => {
      try {
        // Try GitHub raw first, fallback to local
        let res = await fetch("https://raw.githubusercontent.com/jaydiare/ui-polish-pal/main/data/gemrate-sales-trends.json", { cache: "no-store" });
        if (!res.ok) res = await fetch("data/gemrate-sales-trends.json", { cache: "no-store" });
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, []);

  // Determine available months from the data
  const availableMonths = useMemo(() => {
    if (!data?.athletes?.length) return [];
    const months: string[] = [];
    const year = new Date().getFullYear();
    for (const mk of MONTH_KEYS) {
      const key = `${mk}_${year}`;
      if (data.athletes.some(a => a.monthlyVolumes?.[key] != null)) {
        months.push(key);
      }
    }
    return months;
  }, [data]);

  const sortedAthletes = useMemo(() => {
    if (!data?.athletes) return [];
    let list = [...data.athletes];

    if (sportFilter) list = list.filter(a => a.sport === sportFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(a => a.name.toLowerCase().includes(q));
    }

    list.sort((a, b) => {
      let cmp = 0;
      if (sortField === "name") cmp = a.name.localeCompare(b.name);
      else if (sortField === "sport") cmp = a.sport.localeCompare(b.sport);
      else if (sortField === "firstGradedYear") cmp = (Number(a.firstGradedYear) || 0) - (Number(b.firstGradedYear) || 0);
      else if (sortField === "mostGradedYear") cmp = (Number(a.mostGradedYear) || 0) - (Number(b.mostGradedYear) || 0);
      else {
        // Monthly volume sort
        const va = a.monthlyVolumes?.[sortField] ?? -Infinity;
        const vb = b.monthlyVolumes?.[sortField] ?? -Infinity;
        cmp = (va as number) - (vb as number);
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return list;
  }, [data, sortField, sortDir, sportFilter, searchQuery]);

  const availableSports = useMemo(() => {
    if (!data?.athletes) return [];
    return Array.from(new Set(data.athletes.map(a => a.sport))).sort();
  }, [data]);

  const handleSort = (field: string) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("desc"); }
  };

  const SortIcon = ({ field }: { field: string }) => (
    <span className="ml-1 text-[9px]">
      {sortField === field ? (sortDir === "asc" ? "▲" : "▼") : "⇅"}
    </span>
  );

  if (loading) return null;
  if (!data?.athletes?.length) return null;

  return (
    <section className="my-8" aria-label="Gemrate sales trends">
      <h2 className="font-display font-bold text-lg text-foreground mb-1 flex items-center gap-2">
        <span className="w-1 h-5 rounded-full bg-primary inline-block" />
        📈 Sales Volume Trends
      </h2>
      <p className="text-xs text-muted-foreground mb-4 ml-3">
        Monthly eBay sales volume data from{" "}
        <a href="https://www.gemrate.com/sales-trends" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">
          gemrate.com
        </a>
        . Updated monthly. Click eBay links to browse listings or research sold prices.
      </p>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="flex items-center gap-1.5">
          {availableSports.map(sport => (
            <button
              key={sport}
              onClick={() => setSportFilter(prev => prev === sport ? null : sport)}
              className={`text-sm px-2 py-0.5 rounded-full transition-all ${
                sportFilter === sport
                  ? "bg-primary/15 ring-1 ring-primary/30"
                  : "hover:bg-muted"
              }`}
            >
              {SPORT_ICONS[sport] || "🏅"}
            </button>
          ))}
          {sportFilter && (
            <button onClick={() => setSportFilter(null)} className="text-[10px] text-muted-foreground hover:text-foreground ml-1">
              ✕ Clear
            </button>
          )}
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Quick filter..."
          className="ml-auto text-xs border border-border/50 bg-card/80 rounded-lg px-3 py-1.5 w-40 focus:outline-none focus:ring-1 focus:ring-primary/30"
        />
      </div>

      <div className="glass-panel overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border/30">
              <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground cursor-pointer hover:text-foreground whitespace-nowrap" onClick={() => handleSort("name")}>
                Player <SortIcon field="name" />
              </th>
              {availableMonths.map(mk => {
                const parts = mk.split("_");
                const label = `${MONTH_LABELS[MONTH_KEYS.indexOf(parts[0])]} ${parts[1]}`;
                return (
                  <th key={mk} className="text-right px-2 py-2.5 font-semibold text-muted-foreground cursor-pointer hover:text-foreground whitespace-nowrap" onClick={() => handleSort(mk)}>
                    {label} <SortIcon field={mk} />
                  </th>
                );
              })}
              <th className="text-center px-2 py-2.5 font-semibold text-muted-foreground whitespace-nowrap">
                eBay Research
              </th>
              <th className="text-center px-2 py-2.5 font-semibold text-muted-foreground whitespace-nowrap">
                eBay Listings
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedAthletes.map((a, i) => (
              <motion.tr
                key={a.name}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: Math.min(i * 0.02, 0.5) }}
                className="border-b border-border/10 hover:bg-muted/30 transition-colors"
              >
                <td className="px-3 py-2 font-medium text-foreground whitespace-nowrap">
                  <span className="mr-1.5">{SPORT_ICONS[a.sport] || "🏅"}</span>
                  {a.name}
                </td>
                {availableMonths.map(mk => {
                  const val = a.monthlyVolumes?.[mk];
                  return (
                    <td key={mk} className="text-right px-2 py-2 text-foreground tabular-nums">
                      {formatCurrency(val)}
                    </td>
                  );
                })}
                <td className="text-center px-2 py-2">
                  <a
                    href={buildEbayResearchUrl(a.name, a.sport)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:text-primary/80 font-medium underline underline-offset-2 decoration-dotted"
                  >
                    Link
                  </a>
                </td>
                <td className="text-center px-2 py-2">
                  <a
                    href={buildEbayListingsUrl(a.name, a.sport)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:text-primary/80 font-medium underline underline-offset-2 decoration-dotted"
                  >
                    Link
                  </a>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
        {sortedAthletes.length === 0 && (
          <div className="py-8 text-center text-muted-foreground text-sm">
            No athletes found matching your filters.
          </div>
        )}
      </div>
      <p className="text-[9px] text-muted-foreground/60 text-center mt-3">
        Sales data via <a href="https://www.gemrate.com/sales-trends" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">gemrate.com/sales-trends</a>. Updated monthly.
      </p>
    </section>
  );
};

export default SalesTrendsTable;
