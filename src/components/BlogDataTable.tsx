import { useMemo, useState } from "react";
import { useAthleteData } from "@/hooks/useAthleteData";
import {
  getEbayAvgNumber,
  getMarketStabilityCV,
  getAvgDaysOnMarket,
  getEbayAvgFor,
} from "@/lib/vzla-helpers";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";

interface RowData {
  name: string;
  sport: string;
  team: string;
  rawListedPrice: number | null;
  rawSoldPrice: number | null;
  gradedListedPrice: number | null;
  gradedSoldPrice: number | null;
  stabilityCV: number | null;
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

      return {
        name: a.name,
        sport: a.sport,
        team: a.team,
        rawListedPrice: getEbayAvgNumber(a, byName, byKey),
        rawSoldPrice: rawSold != null && Number.isFinite(Number(rawSold)) && Number(rawSold) > 0 ? Number(rawSold) : null,
        gradedListedPrice: getEbayAvgNumber(a, gradedByName, gradedByKey),
        gradedSoldPrice: gradedSold != null && Number.isFinite(Number(gradedSold)) && Number(gradedSold) > 0 ? Number(gradedSold) : null,
        stabilityCV: getMarketStabilityCV(a, byName, byKey),
        daysOnMarket: dom,
        indexLevel: rec?.indexLevel ?? null,
      };
    });
  }, [athletes, byName, byKey, gradedByName, gradedByKey, ebaySoldRaw, ebayGradedSoldRaw, athleteHistory]);

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

  const columns: { key: SortKey; label: string; fmt: (v: any) => string; align?: string }[] = [
    { key: "name", label: "Athlete", fmt: (v) => v ?? "—" },
    { key: "sport", label: "Sport", fmt: (v) => v ?? "—" },
    { key: "team", label: "Team", fmt: (v) => v ?? "—" },
    { key: "rawListedPrice", label: "Raw Listed", fmt: fmtPrice },
    { key: "rawSoldPrice", label: "Raw Sold", fmt: fmtPrice },
    { key: "gradedListedPrice", label: "Graded Listed", fmt: fmtPrice },
    { key: "gradedSoldPrice", label: "Graded Sold", fmt: fmtPrice },
    { key: "stabilityCV", label: "Stability (CV%)", fmt: fmtPct },
    { key: "daysOnMarket", label: "Days on Mkt", fmt: fmtDays },
    { key: "indexLevel", label: "Index", fmt: fmtIndex },
  ];

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
                    {col.fmt((row as any)[col.key])}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="px-4 py-2 border-t border-border text-xs text-muted-foreground">
        {sorted.length} athletes · Scroll to see all · Click headers to sort
      </div>
    </div>
  );
}
