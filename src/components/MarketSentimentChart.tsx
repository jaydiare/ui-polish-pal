import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Legend,
} from "recharts";
import { useLanguage } from "@/i18n/LanguageProvider";

type HistoryPoint = {
  date: string;
  raw?: { price?: number; idx?: number; cv?: number } | null;
  graded?: { price?: number; idx?: number } | null;
};

interface Props {
  history: Record<string, HistoryPoint[]>;
}

type Range = 30 | 90 | 0;

interface Row {
  date: string;
  t: number;
  rawIdx: number | null;
  gradedIdx: number | null;
  sentiment: number | null;
}

const RANGES: { value: Range; label: string }[] = [
  { value: 30, label: "30D" },
  { value: 90, label: "90D" },
  { value: 0, label: "All" },
];

const RAW_COLOR = "hsl(199 89% 55%)";
const GRADED_COLOR = "hsl(160 84% 45%)";
const BULL_COLOR = "hsl(160 84% 45%)";
const BEAR_COLOR = "hsl(350 84% 60%)";

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const mean = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);

/** Build daily raw/graded index series + sentiment from per-athlete history. */
function buildSeries(history: Record<string, HistoryPoint[]>): Row[] {
  const rawByDate = new Map<string, number[]>();
  const gradedByDate = new Map<string, number[]>();
  const cvByDate = new Map<string, number[]>();
  // per athlete: date -> raw price, used for breadth
  const priceByAthlete: Record<string, Map<string, number>> = {};

  for (const [name, points] of Object.entries(history)) {
    if (!Array.isArray(points)) continue;
    const priceMap = new Map<string, number>();
    for (const p of points) {
      if (!p?.date) continue;
      const rIdx = Number(p.raw?.idx);
      if (Number.isFinite(rIdx) && rIdx > 0) {
        if (!rawByDate.has(p.date)) rawByDate.set(p.date, []);
        rawByDate.get(p.date)!.push(rIdx);
      }
      const gIdx = Number(p.graded?.idx);
      if (Number.isFinite(gIdx) && gIdx > 0) {
        if (!gradedByDate.has(p.date)) gradedByDate.set(p.date, []);
        gradedByDate.get(p.date)!.push(gIdx);
      }
      const cv = Number(p.raw?.cv);
      if (Number.isFinite(cv) && cv >= 0) {
        if (!cvByDate.has(p.date)) cvByDate.set(p.date, []);
        cvByDate.get(p.date)!.push(cv);
      }
      const price = Number(p.raw?.price);
      if (Number.isFinite(price) && price > 0) priceMap.set(p.date, price);
    }
    if (priceMap.size) priceByAthlete[name] = priceMap;
  }

  const dates = Array.from(rawByDate.keys()).sort();
  if (dates.length === 0) return [];

  const rawSeries = dates.map((d) => mean(rawByDate.get(d) || []));

  const rows: Row[] = dates.map((date, i) => {
    const rawIdx = rawSeries[i];
    const gradedArr = gradedByDate.get(date) || [];
    const gradedIdx = gradedArr.length >= 5 ? mean(gradedArr) : null;

    let sentiment: number | null = null;
    if (i >= 7) {
      const prevDate = dates[i - 7];

      // Breadth: share of athletes up vs down over trailing 7 days
      let up = 0;
      let down = 0;
      for (const priceMap of Object.values(priceByAthlete)) {
        const now = priceMap.get(date);
        const before = priceMap.get(prevDate);
        if (!now || !before) continue;
        const chg = (now - before) / before;
        if (chg > 0.005) up++;
        else if (chg < -0.005) down++;
      }
      const total = up + down;
      const breadth = total > 0 ? ((up - down) / total) * 100 : 0;

      // Momentum: 7-day % change of the raw index, scaled (10% move = full score)
      const prevIdx = rawSeries[i - 7];
      const momentum = prevIdx > 0 ? clamp(((rawIdx - prevIdx) / prevIdx) * 1000, -100, 100) : 0;

      // Stability: high average volatility dampens conviction
      const avgCv = mean(cvByDate.get(date) || []);
      const damp = clamp(1 - avgCv, 0.4, 1);

      sentiment = Math.round(clamp((breadth * 0.6 + momentum * 0.4) * damp, -100, 100));
    }

    return {
      date,
      t: new Date(`${date}T00:00:00Z`).getTime(),
      rawIdx: Number.isFinite(rawIdx) && rawIdx > 0 ? Number(rawIdx.toFixed(1)) : null,
      gradedIdx: gradedIdx != null ? Number(gradedIdx.toFixed(1)) : null,
      sentiment,
    };
  });

  return rows;
}

function downsample(rows: Row[], max = 120): Row[] {
  if (rows.length <= max) return rows;
  const step = Math.ceil(rows.length / max);
  const out = rows.filter((_, i) => i % step === 0);
  const last = rows[rows.length - 1];
  if (out[out.length - 1]?.date !== last.date) out.push(last);
  return out;
}

const MarketSentimentChart = ({ history }: Props) => {
  const { t, lang } = useLanguage();
  const [range, setRange] = useState<Range>(90);

  const allRows = useMemo(() => buildSeries(history), [history]);

  const rows = useMemo(() => {
    const sliced = range === 0 ? allRows : allRows.slice(-range);
    // Rebase both series to 100 at the first day of the visible window so the
    // raw and graded lines are directly comparable on one axis.
    const baseRaw = sliced.find((r) => r.rawIdx != null)?.rawIdx ?? null;
    const baseGraded = sliced.find((r) => r.gradedIdx != null)?.gradedIdx ?? null;
    const rebased = sliced.map((r) => ({
      ...r,
      rawIdx: r.rawIdx != null && baseRaw ? Number(((r.rawIdx / baseRaw) * 100).toFixed(1)) : null,
      gradedIdx:
        r.gradedIdx != null && baseGraded ? Number(((r.gradedIdx / baseGraded) * 100).toFixed(1)) : null,
    }));
    return downsample(rebased);
  }, [allRows, range]);

  const withSentiment = allRows.filter((r) => r.sentiment != null);
  const current = withSentiment.length ? (withSentiment[withSentiment.length - 1].sentiment as number) : null;
  const weekAgo =
    withSentiment.length > 7 ? (withSentiment[withSentiment.length - 8].sentiment as number) : null;
  const delta = current != null && weekAgo != null ? current - weekAgo : null;

  const moodKey =
    current == null
      ? "sentiment.neutral"
      : current > 15
        ? "sentiment.bullish"
        : current < -15
          ? "sentiment.bearish"
          : "sentiment.neutral";
  const moodColor =
    current == null ? "hsl(var(--muted-foreground))" : current > 15 ? BULL_COLOR : current < -15 ? BEAR_COLOR : "hsl(var(--muted-foreground))";

  const locale = lang === "es" ? "es-419" : "en-US";
  const formatDate = (v: string) =>
    new Date(`${v}T00:00:00Z`).toLocaleDateString(locale, { month: "short", day: "numeric", timeZone: "UTC" });

  if (allRows.length === 0) return null;

  return (
    <section className="my-8" aria-label={t("sentiment.title")}>
      <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
        <h2 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
          <span className="w-1 h-5 rounded-full bg-primary inline-block" />
          {t("sentiment.title")}
        </h2>
        <div className="flex gap-1" role="group" aria-label={t("sentiment.range")}>
          {RANGES.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => setRange(r.value)}
              aria-pressed={range === r.value}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${
                range === r.value
                  ? "bg-primary/15 border-primary/50 text-primary"
                  : "bg-background/40 border-border/50 text-muted-foreground hover:text-foreground"
              }`}
            >
              {r.value === 0 ? t("sentiment.rangeAll") : r.label}
            </button>
          ))}
        </div>
      </div>
      <p className="text-xs text-muted-foreground mb-4 ml-3">{t("sentiment.subtitle")}</p>

      <div className="glass-panel p-4 md:p-6">
        <div className="flex items-baseline gap-3 flex-wrap mb-3">
          <span className="text-sm text-muted-foreground">{t("sentiment.current")}:</span>
          <span className="font-display font-bold text-xl" style={{ color: moodColor }}>
            {t(moodKey as never)}
          </span>
          {current != null && (
            <span className="text-sm text-foreground font-semibold">
              {current > 0 ? "+" : ""}
              {current}
            </span>
          )}
          {delta != null && (
            <span className={`text-xs ${delta >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {delta >= 0 ? "▲" : "▼"} {Math.abs(delta)} {t("sentiment.vsWeek")}
            </span>
          )}
        </div>

        <div className="w-full h-[300px] md:h-[380px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={rows} margin={{ top: 8, right: 8, bottom: 4, left: -8 }}>
              <defs>
                <linearGradient id="sentimentFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={BULL_COLOR} stopOpacity={0.35} />
                  <stop offset="50%" stopColor={BULL_COLOR} stopOpacity={0.04} />
                  <stop offset="50%" stopColor={BEAR_COLOR} stopOpacity={0.04} />
                  <stop offset="100%" stopColor={BEAR_COLOR} stopOpacity={0.35} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.25} />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                stroke="hsl(var(--muted-foreground))"
                tick={{ fontSize: 10 }}
                minTickGap={24}
              />
              <YAxis
                yAxisId="idx"
                stroke="hsl(var(--muted-foreground))"
                tick={{ fontSize: 10 }}
                width={44}
                domain={["auto", "auto"]}
              />
              <YAxis
                yAxisId="sent"
                orientation="right"
                domain={[-100, 100]}
                ticks={[-100, -50, 0, 50, 100]}
                stroke="hsl(var(--muted-foreground))"
                tick={{ fontSize: 10 }}
                width={36}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--background) / 0.95)",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 12,
                  fontSize: 12,
                }}
                labelFormatter={(v) => formatDate(String(v))}
                formatter={(value: number, name: string) => [value, name]}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <ReferenceLine yAxisId="sent" y={0} stroke="hsl(var(--border))" strokeDasharray="4 4" />
              <Area
                yAxisId="sent"
                type="monotone"
                dataKey="sentiment"
                name={t("sentiment.legendSentiment")}
                stroke={BULL_COLOR}
                strokeWidth={1.5}
                fill="url(#sentimentFill)"
                connectNulls
                dot={false}
                isAnimationActive={false}
              />
              <Line
                yAxisId="idx"
                type="monotone"
                dataKey="rawIdx"
                name={t("sentiment.legendRaw")}
                stroke={RAW_COLOR}
                strokeWidth={2}
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
              <Line
                yAxisId="idx"
                type="monotone"
                dataKey="gradedIdx"
                name={t("sentiment.legendGraded")}
                stroke={GRADED_COLOR}
                strokeWidth={2}
                strokeDasharray="5 3"
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <p className="text-[10px] text-muted-foreground/70 mt-3 text-pretty">{t("sentiment.note")}</p>
      </div>
    </section>
  );
};

export default MarketSentimentChart;
