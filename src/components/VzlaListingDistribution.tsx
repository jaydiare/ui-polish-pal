import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface Props {
  /** Each item must include a `listed` price (USD). Other fields ignored. */
  comparisonData: { name: string; listed: number; sport?: string }[];
  hideTitle?: boolean;
}

const percentile = (sorted: number[], p: number) => {
  if (!sorted.length) return 0;
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
};

const DistTooltip = ({ payload, label }: any) => {
  if (!payload?.length) return null;
  const p = payload[0]?.payload;
  if (!p) return null;
  return (
    <div className="rounded-xl border border-border/50 bg-background/95 backdrop-blur-lg p-3 text-xs shadow-2xl">
      <div className="text-muted-foreground mb-1">
        Rank: <strong className="text-foreground">{label}</strong> of {p.total}
      </div>
      <div className="text-muted-foreground">
        Listing price: <strong className="text-foreground">${p.price.toFixed(2)}</strong>
      </div>
      {p.name && (
        <div className="text-muted-foreground truncate max-w-[220px]">
          {p.name}
          {p.sport ? ` · ${p.sport}` : ""}
        </div>
      )}
    </div>
  );
};

const VzlaListingDistribution = ({ comparisonData, hideTitle }: Props) => {
  const { chartData, p25, p50, p75, total, min, max } = useMemo(() => {
    const items = comparisonData
      .filter((d) => Number.isFinite(d.listed) && d.listed > 0)
      .slice()
      .sort((a, b) => a.listed - b.listed);

    if (!items.length) {
      return { chartData: [], p25: 0, p50: 0, p75: 0, total: 0, min: 0, max: 0 };
    }

    const prices = items.map((i) => i.listed);
    const data = items.map((it, i) => ({
      rank: i + 1,
      price: it.listed,
      name: it.name,
      sport: it.sport,
      total: items.length,
    }));

    return {
      chartData: data,
      p25: percentile(prices, 0.25),
      p50: percentile(prices, 0.5),
      p75: percentile(prices, 0.75),
      total: items.length,
      min: prices[0],
      max: prices[prices.length - 1],
    };
  }, [comparisonData]);

  if (!chartData.length) return null;

  return (
    <section className={hideTitle ? "" : "my-8"} aria-label="Listing price distribution">
      {!hideTitle && (
        <h2 className="font-display font-bold text-lg text-foreground mb-1 flex items-center gap-2">
          <span className="w-1 h-5 rounded-full bg-primary inline-block" />
          Listing Price Distribution
        </h2>
      )}
      <p className="text-xs text-muted-foreground mb-4 ml-3">
        Every active listing price across the roster, sorted from cheapest to most expensive. The
        steeper the curve, the larger the price jump between athletes at that rank. The flatter
        sections show where most inventory clusters.
      </p>
      <p className="text-xs text-muted-foreground mb-4 ml-3">
        <span className="text-foreground font-medium">{total}</span> athletes ·
        Range <span className="text-foreground font-medium">${min.toFixed(2)}</span> to{" "}
        <span className="text-foreground font-medium">${max.toFixed(2)}</span> ·
        Median <span className="text-foreground font-medium">${p50.toFixed(2)}</span>
      </p>
      <div className="glass-panel p-4 md:p-6">
        <div className="w-full h-[400px] md:h-[450px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 20, bottom: 40, left: 0 }}>
              <defs>
                <linearGradient id="distFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(221, 83%, 53%)" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="hsl(221, 83%, 53%)" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
              <XAxis
                dataKey="rank"
                type="number"
                domain={[1, total]}
                label={{
                  value: "Athletes ranked by listing price (cheapest → priciest)",
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
              <Tooltip content={<DistTooltip />} />
              <ReferenceLine
                y={p25}
                stroke="hsl(var(--muted-foreground))"
                strokeDasharray="4 4"
                strokeOpacity={0.5}
                label={{ value: `P25 $${p25.toFixed(0)}`, fill: "hsl(var(--muted-foreground))", fontSize: 10, position: "insideTopRight" }}
              />
              <ReferenceLine
                y={p50}
                stroke="hsl(142, 71%, 45%)"
                strokeDasharray="4 4"
                strokeOpacity={0.7}
                label={{ value: `Median $${p50.toFixed(0)}`, fill: "hsl(142, 71%, 45%)", fontSize: 10, position: "insideTopRight" }}
              />
              <ReferenceLine
                y={p75}
                stroke="hsl(var(--muted-foreground))"
                strokeDasharray="4 4"
                strokeOpacity={0.5}
                label={{ value: `P75 $${p75.toFixed(0)}`, fill: "hsl(var(--muted-foreground))", fontSize: 10, position: "insideTopRight" }}
              />
              <Area
                type="monotone"
                dataKey="price"
                stroke="hsl(221, 83%, 53%)"
                strokeWidth={2.5}
                fill="url(#distFill)"
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-3 flex flex-wrap justify-center gap-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-card/80 px-3 py-1">
            <span className="text-[11px] text-muted-foreground">
              25% under <strong className="text-foreground">${p25.toFixed(2)}</strong>
            </span>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-card/80 px-3 py-1">
            <span className="text-[11px] text-muted-foreground">
              Median <strong className="text-foreground">${p50.toFixed(2)}</strong>
            </span>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-card/80 px-3 py-1">
            <span className="text-[11px] text-muted-foreground">
              25% above <strong className="text-foreground">${p75.toFixed(2)}</strong>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default VzlaListingDistribution;
