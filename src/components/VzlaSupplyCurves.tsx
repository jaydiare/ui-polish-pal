import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface Item {
  name: string;
  listed: number;
  sport?: string;
}

interface Props {
  rawData: Item[];
  gradedData: Item[];
  hideTitle?: boolean;
}

const SupplyTooltip = ({ payload, label }: any) => {
  if (!payload?.length) return null;
  return (
    <div className="rounded-xl border border-border/50 bg-background/95 backdrop-blur-lg p-3 text-xs shadow-2xl">
      <div className="text-muted-foreground mb-1">
        Percentile: <strong className="text-foreground">{label}%</strong>
      </div>
      {payload.map((p: any) =>
        p.value == null ? null : (
          <div key={p.dataKey} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="text-muted-foreground">
              {p.name}: <strong className="text-foreground">${p.value.toFixed(2)}</strong>
            </span>
          </div>
        ),
      )}
    </div>
  );
};

const buildCurve = (data: Item[]) => {
  const prices = data
    .map((d) => d.listed)
    .filter((v) => Number.isFinite(v) && v > 0)
    .sort((a, b) => a - b);
  if (!prices.length) return [] as { p: number; price: number }[];
  // Sample at every 1% percentile (101 points) so the two series align on a shared X axis.
  const out: { p: number; price: number }[] = [];
  for (let i = 0; i <= 100; i++) {
    const idx = (prices.length - 1) * (i / 100);
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    const v = lo === hi ? prices[lo] : prices[lo] + (prices[hi] - prices[lo]) * (idx - lo);
    out.push({ p: i, price: v });
  }
  return out;
};

const median = (data: Item[]) => {
  const prices = data
    .map((d) => d.listed)
    .filter((v) => Number.isFinite(v) && v > 0)
    .sort((a, b) => a - b);
  if (!prices.length) return 0;
  const m = Math.floor(prices.length / 2);
  return prices.length % 2 ? prices[m] : (prices[m - 1] + prices[m]) / 2;
};

const VzlaSupplyCurves = ({ rawData, gradedData, hideTitle }: Props) => {
  const { chartData, rawMedian, gradedMedian, premium, rawCount, gradedCount } = useMemo(() => {
    const raw = buildCurve(rawData);
    const graded = buildCurve(gradedData);
    const merged: { p: number; raw?: number; graded?: number }[] = [];
    for (let i = 0; i <= 100; i++) {
      merged.push({ p: i, raw: raw[i]?.price, graded: graded[i]?.price });
    }
    const rm = median(rawData);
    const gm = median(gradedData);
    return {
      chartData: merged,
      rawMedian: rm,
      gradedMedian: gm,
      premium: rm > 0 ? gm / rm : 0,
      rawCount: rawData.filter((d) => Number.isFinite(d.listed) && d.listed > 0).length,
      gradedCount: gradedData.filter((d) => Number.isFinite(d.listed) && d.listed > 0).length,
    };
  }, [rawData, gradedData]);

  if (!rawCount && !gradedCount) return null;

  return (
    <section className={hideTitle ? "" : "my-8"} aria-label="Raw versus graded supply curves">
      {!hideTitle && (
        <h2 className="font-display font-bold text-lg text-foreground mb-1 flex items-center gap-2">
          <span className="w-1 h-5 rounded-full bg-primary inline-block" />
          Raw vs Graded Supply Curves
        </h2>
      )}
      <p className="text-xs text-muted-foreground mb-4 ml-3">
        Both rosters sorted from cheapest to priciest, normalized to 0–100% so the curves align.
        Wherever the <strong className="text-foreground">graded</strong> line sits above the{" "}
        <strong className="text-foreground">raw</strong> line is the slabbing premium buyers pay at
        that price tier. A flat section means inventory is clustered at one price; a steep section
        means a big jump between athletes at that rank.
      </p>
      <p className="text-xs text-muted-foreground mb-4 ml-3">
        <span className="text-foreground font-medium">{rawCount}</span> raw ·{" "}
        <span className="text-foreground font-medium">{gradedCount}</span> graded · Median raw{" "}
        <span className="text-foreground font-medium">${rawMedian.toFixed(2)}</span> · Median graded{" "}
        <span className="text-foreground font-medium">${gradedMedian.toFixed(2)}</span>
        {premium > 0 && (
          <>
            {" "}
            · Graded premium ≈{" "}
            <span className="text-foreground font-medium">{premium.toFixed(2)}×</span>
          </>
        )}
      </p>
      <div className="glass-panel p-4 md:p-6">
        <div className="w-full h-[400px] md:h-[450px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 20, bottom: 40, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
              <XAxis
                dataKey="p"
                type="number"
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
                tickFormatter={(v) => `${v}%`}
                label={{
                  value: "Roster percentile (cheapest → priciest)",
                  position: "insideBottom",
                  offset: -10,
                  style: { fill: "hsl(var(--muted-foreground))", fontSize: 11 },
                }}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
              />
              <YAxis
                label={{
                  value: "Listing Price ($)",
                  angle: -90,
                  position: "insideLeft",
                  offset: 10,
                  style: { fill: "hsl(var(--muted-foreground))", fontSize: 11 },
                }}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
              />
              <Tooltip content={<SupplyTooltip />} />
              <Legend
                verticalAlign="top"
                height={30}
                wrapperStyle={{ fontSize: 11, color: "hsl(var(--muted-foreground))" }}
              />
              <Line
                type="monotone"
                dataKey="raw"
                name="Raw Listings"
                stroke="hsl(221, 83%, 53%)"
                strokeWidth={2.5}
                dot={false}
                connectNulls={false}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="graded"
                name="Graded Listings"
                stroke="hsl(45, 93%, 55%)"
                strokeWidth={2.5}
                dot={false}
                connectNulls={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
};

export default VzlaSupplyCurves;
