import { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useLanguage } from "@/i18n/LanguageProvider";
import CareerStatsStrip from "./CareerStatsStrip";
import { Athlete } from "@/data/athletes";


export interface SeriesData {
  values: number[];
  dates: string[];
}

interface PriceHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  athlete: Athlete;
  raw?: SeriesData | null;
  graded?: SeriesData | null;
  priceMode: "raw" | "graded" | "both";
}

const fmt = (v: number) => `USD $${v.toFixed(2)}`;

const shortDate = (d: string) => {
  const parts = d?.split("-");
  return parts?.length === 3 ? `${parts[1]}/${parts[2]}` : d;
};

const ChartTooltip = ({ payload, label, rawLabel, gradedLabel }: any) => {
  if (!payload?.length) return null;
  return (
    <div className="rounded-xl border border-border/50 bg-background/95 backdrop-blur-lg p-3 text-xs shadow-2xl">
      <div className="text-muted-foreground mb-1 font-mono">{label}</div>
      {payload.map((p: any) =>
        p.value == null ? null : (
          <div key={p.dataKey} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="text-muted-foreground">
              {p.dataKey === "raw" ? rawLabel : gradedLabel}:{" "}
              <strong className="text-foreground">{fmt(p.value)}</strong>
            </span>
          </div>
        ),
      )}
    </div>
  );
};

const summarize = (s?: SeriesData | null) => {
  if (!s || s.values.length < 2) return null;
  const first = s.values[0];
  const last = s.values[s.values.length - 1];
  const delta = last - first;
  return {
    current: last,
    high: Math.max(...s.values),
    low: Math.min(...s.values),
    delta,
    pct: first !== 0 ? (delta / first) * 100 : 0,
  };
};

const PriceHistoryDialog = ({ open, onOpenChange, athlete, raw, graded, priceMode }: PriceHistoryDialogProps) => {
  const { t } = useLanguage();
  const reducedMotion =
    typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  const rawLabel = t("history.raw");
  const gradedLabel = t("history.graded");

  const [showRaw, setShowRaw] = useState(priceMode !== "graded" && !!raw);
  const [showGraded, setShowGraded] = useState(priceMode !== "raw" && !!graded);

  const data = useMemo(() => {
    const map = new Map<string, { date: string; raw?: number; graded?: number }>();
    raw?.dates.forEach((d, i) => {
      map.set(d, { ...(map.get(d) ?? { date: d }), raw: raw.values[i] });
    });
    graded?.dates.forEach((d, i) => {
      map.set(d, { ...(map.get(d) ?? { date: d }), graded: graded.values[i] });
    });
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [raw, graded]);

  const activeSummary = summarize(showRaw && raw ? raw : showGraded && graded ? graded : raw ?? graded);
  const up = (activeSummary?.delta ?? 0) >= 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display">{athlete.name}</DialogTitle>
          <DialogDescription>
            {t("history.title")} · {athlete.sport}
            {athlete.team ? ` · ${athlete.team}` : ""}
          </DialogDescription>
        </DialogHeader>

        <CareerStatsStrip name={athlete.name} sport={athlete.sport} enabled={open} />



        {/* Series toggles */}
        <div className="flex items-center gap-2">
          {raw && (
            <button
              type="button"
              onClick={() => setShowRaw((v) => !v)}
              aria-pressed={showRaw}
              className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                showRaw
                  ? "bg-primary/15 border-primary/30 text-primary"
                  : "bg-secondary border-border text-muted-foreground"
              }`}
            >
              {rawLabel}
            </button>
          )}
          {graded && (
            <button
              type="button"
              onClick={() => setShowGraded((v) => !v)}
              aria-pressed={showGraded}
              className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                showGraded
                  ? "bg-vzla-mint/15 border-vzla-mint/30 text-vzla-mint"
                  : "bg-secondary border-border text-muted-foreground"
              }`}
            >
              {gradedLabel}
            </button>
          )}
        </div>

        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: -8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
              <XAxis
                dataKey="date"
                tickFormatter={shortDate}
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                minTickGap={24}
                stroke="hsl(var(--border))"
              />
              <YAxis
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                tickFormatter={(v: number) => `$${v}`}
                stroke="hsl(var(--border))"
                width={52}
              />
              <Tooltip content={<ChartTooltip rawLabel={rawLabel} gradedLabel={gradedLabel} />} />
              {showRaw && raw && (
                <Line
                  type="monotone"
                  dataKey="raw"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                  isAnimationActive={!reducedMotion}
                />
              )}
              {showGraded && graded && (
                <Line
                  type="monotone"
                  dataKey="graded"
                  stroke="hsl(var(--vzla-mint))"
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                  isAnimationActive={!reducedMotion}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {activeSummary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("history.current")}</div>
              <div className="text-sm font-display font-bold text-foreground">{fmt(activeSummary.current)}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("history.high")}</div>
              <div className="text-sm font-display font-bold text-foreground">{fmt(activeSummary.high)}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("history.low")}</div>
              <div className="text-sm font-display font-bold text-foreground">{fmt(activeSummary.low)}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("history.change")}</div>
              <div className={`text-sm font-display font-bold ${up ? "text-primary" : "text-destructive"}`}>
                {up ? "+" : ""}
                {activeSummary.pct.toFixed(1)}%
                <span className="text-[10px] font-normal text-muted-foreground ml-1">
                  ({up ? "+" : ""}
                  {activeSummary.delta.toFixed(2)})
                </span>
              </div>
            </div>
          </div>
        )}

        <p className="text-[10px] text-muted-foreground">{t("history.note")}</p>
      </DialogContent>
    </Dialog>
  );
};

export default PriceHistoryDialog;
