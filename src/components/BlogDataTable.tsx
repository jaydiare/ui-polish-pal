import { useMemo, useState, useCallback } from "react";
import { useAthleteData } from "@/hooks/useAthleteData";
import {
  getEbayAvgNumber,
  getMarketStabilityCV,
  getAvgDaysOnMarket,
  getEbayAvgFor,
  buildEbaySearchUrl,
} from "@/lib/vzla-helpers";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowUp, ArrowDown, ArrowUpDown, Download, Filter } from "lucide-react";

interface RowData {
  name: string;
  sport: string;
  
  rawListedPrice: number | null;
  rawSoldPrice: number | null;
  gradedListedPrice: number | null;
  gradedSoldPrice: number | null;
  stabilityCV: number | null;
  signalStrength: number | null;
  psaPop: number | null;
  daysOnMarket: number | null;
  indexLevel: number | null;
}

type SortKey = keyof RowData;
type SortDir = "asc" | "desc";

const VISIBLE_ROWS = 30;

function fmtPrice(v: number | null) {
  if (v == null) return "—";
  return `$${v.toFixed(2)}`;
}

function fmtPct(v: number | null) {
  if (v == null) return "—";
  return `${(v * 100).toFixed(0)}%`;
}

function fmtDays(v: number | null) {
  if (v == null) return "—";
  return `${Math.round(v)}d`;
}

function fmtIndex(v: number | null) {
  if (v == null) return "—";
  return v.toFixed(0);
}

export default function BlogDataTable() {
  const {
    athletes,
    byName,
    byKey,
    gradedByName,
    gradedByKey,
    ebaySoldRaw,
    ebayGradedSoldRaw,
    athleteHistory,
    gemratePopMap,
    lastUpdated,
  } = useAthleteData();

  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const rows = useMemo<RowData[]>(() => {
    return athletes.map((a) => {
      const soldRec = ebaySoldRaw?.[a.name];
      const gradedSoldRec = ebayGradedSoldRaw?.[a.name];

      const rawSold = soldRec?.taguchiSold ?? soldRec?.avg ?? null;
      const gradedSold = gradedSoldRec?.taguchiSold ?? gradedSoldRec?.avg ?? null;

      const rec = getEbayAvgFor(a, byName, byKey);

      // Days on market with obsDays fallback
      let dom = getAvgDaysOnMarket(a, byName, byKey);
      if ((dom == null || dom <= 0) && athleteHistory?.[a.name]) {
        const entries = athleteHistory[a.name];
        const last = entries?.[entries.length - 1];
        if (last?.obsDays != null && last.obsDays > 0) dom = last.obsDays;
      }

      // Gate graded data behind gemrate="yes"
      const isGemrateEligible = a.gemrate?.toLowerCase() === "yes";

      return {
        name: a.name,
        sport: a.sport,
        
        rawListedPrice: getEbayAvgNumber(a, byName, byKey),
        rawSoldPrice: rawSold != null && Number.isFinite(Number(rawSold)) && Number(rawSold) > 0 ? Number(rawSold) : null,
        gradedListedPrice: isGemrateEligible ? getEbayAvgNumber(a, gradedByName, gradedByKey) : null,
        gradedSoldPrice: isGemrateEligible && gradedSold != null && Number.isFinite(Number(gradedSold)) && Number(gradedSold) > 0 ? Number(gradedSold) : null,
        stabilityCV: getMarketStabilityCV(a, byName, byKey),
        signalStrength: (() => {
          const cv = getMarketStabilityCV(a, byName, byKey);
          if (cv == null || cv < 0.01) return null;
          const sn = 10 * Math.log10(1 / (cv * cv));
          return Math.min(Math.round(sn * 100) / 100, 40);
        })(),
        psaPop: (() => {
          const normName = a.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          const pop = gemratePopMap[a.name] ?? gemratePopMap[normName] ?? null;
          return pop != null && pop > 0 ? pop : null;
        })(),
        daysOnMarket: dom,
        indexLevel: rec?.indexLevel ?? null,
      };
    });
  }, [athletes, byName, byKey, gradedByName, gradedByKey, ebaySoldRaw, ebayGradedSoldRaw, athleteHistory, gemratePopMap]);

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "string" && typeof bv === "string") {
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      const an = Number(av);
      const bn = Number(bv);
      return sortDir === "asc" ? an - bn : bn - an;
    });
    return copy;
  }, [rows, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown className="inline ml-1 w-3 h-3 opacity-40" />;
    return sortDir === "asc" ? (
      <ArrowUp className="inline ml-1 w-3 h-3 text-vzla-yellow" />
    ) : (
      <ArrowDown className="inline ml-1 w-3 h-3 text-vzla-yellow" />
    );
  };

  const columns: { key: SortKey; label: string; fmt: (v: any) => string; render?: (v: any, row: RowData) => React.ReactNode; align?: string }[] = [
    { key: "name", label: "Athlete", fmt: (v) => v ?? "—", render: (_v, row) => (
      <a
        href={buildEbaySearchUrl(row.name, row.sport)}
        target="_blank"
        rel="noopener noreferrer"
        className="text-vzla-yellow hover:underline font-medium"
      >
        {row.name}
      </a>
    ) },
    { key: "sport", label: "Sport", fmt: (v) => v ?? "—" },
    
    { key: "rawListedPrice", label: "Raw Listed", fmt: fmtPrice },
    { key: "rawSoldPrice", label: "Raw Sold", fmt: fmtPrice },
    { key: "gradedListedPrice", label: "PSA Listed", fmt: fmtPrice },
    { key: "gradedSoldPrice", label: "PSA Sold", fmt: fmtPrice },
    { key: "psaPop", label: "PSA Pop", fmt: (v) => v == null ? "—" : v.toLocaleString() },
    { key: "stabilityCV", label: "Stability (CV%)", fmt: fmtPct },
    { key: "signalStrength", label: "Signal S/N", fmt: (v) => v == null ? "—" : v.toFixed(1) },
    { key: "daysOnMarket", label: "Days on Mkt", fmt: fmtDays },
    { key: "indexLevel", label: "Index", fmt: fmtIndex },
  ];

  const exportCsv = () => {
    const header = columns.map((c) => c.label).join(",");
    const rows = sorted.map((row) =>
      columns.map((col) => {
        const raw = (row as any)[col.key];
        if (raw == null) return "";
        if (typeof raw === "string") return `"${raw.replace(/"/g, '""')}"`;
        return raw;
      }).join(",")
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "vzla-athlete-market-data.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="glass-panel rounded-xl overflow-hidden">
      <div
        className="overflow-auto"
        style={{ maxHeight: `${VISIBLE_ROWS * 41 + 48}px` }}
      >
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-card">
            <TableRow>
              {columns.map((col) => (
                <TableHead
                  key={col.key}
                  className="cursor-pointer select-none whitespace-nowrap text-xs hover:text-vzla-yellow transition-colors"
                  onClick={() => toggleSort(col.key)}
                >
                  {col.label}
                  <SortIcon col={col.key} />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((row, i) => (
              <TableRow key={row.name + row.sport} className="text-xs">
                {columns.map((col) => (
                  <TableCell key={col.key} className="whitespace-nowrap py-2 px-3">
                    {col.render ? col.render((row as any)[col.key], row) : col.fmt((row as any)[col.key])}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="px-4 py-2 border-t border-border text-xs text-muted-foreground flex justify-between items-center">
        <span>{sorted.length} athletes · Scroll to see all · Click headers to sort</span>
        <div className="flex items-center gap-3">
          <span>Last updated: {lastUpdated}</span>
          <button
            onClick={exportCsv}
            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-vzla-yellow/10 text-vzla-yellow hover:bg-vzla-yellow/20 transition-colors font-medium"
          >
            <Download className="w-3 h-3" /> CSV
          </button>
        </div>
      </div>
    </div>
  );
}
