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
  ReferenceLine,
} from "recharts";

interface Props {
  comparisonData: { name: string; listed: number; sold: number; sport: string }[];
}

const SupplyDemandTooltip = ({ payload, label }: any) => {
  if (!payload?.length) return null;
  return (
    <div className="rounded-xl border border-border/50 bg-background/95 backdrop-blur-lg p-3 text-xs shadow-2xl">
      <div className="text-muted-foreground mb-1">Quantity: <strong className="text-foreground">{label}</strong></div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-muted-foreground">{p.name}: <strong className="text-foreground">${p.value?.toFixed(2)}</strong></span>
        </div>
      ))}
    </div>
  );
};

const VzlaSupplyDemand = ({ comparisonData }: Props) => {
  const { chartData, equilibrium } = useMemo(() => {
    if (!comparisonData.length) return { chartData: [], equilibrium: null };

    // Supply: sellers' ask prices sorted ascending (listed prices)
    const supply = comparisonData.map(d => d.listed).sort((a, b) => a - b);
    // Demand: buyers' willingness-to-pay sorted descending (sold prices = revealed value)
    const demand = comparisonData.map(d => d.sold).sort((a, b) => b - a);

    const len = Math.max(supply.length, demand.length);
    const data: { qty: number; supply: number | null; demand: number | null }[] = [];

    for (let i = 0; i < len; i++) {
      data.push({
        qty: i + 1,
        supply: i < supply.length ? supply[i] : null,
        demand: i < demand.length ? demand[i] : null,
      });
    }

    // Find equilibrium (where supply crosses demand)
    let eq: { qty: number; price: number } | null = null;
    for (let i = 0; i < Math.min(supply.length, demand.length) - 1; i++) {
      if (supply[i] <= demand[i] && supply[i + 1] >= demand[i + 1]) {
        // Linear interpolation for crossing point
        const qEq = i + 1 + (demand[i] - supply[i]) / ((supply[i + 1] - supply[i]) + (demand[i] - demand[i + 1]));
        const pEq = supply[i] + (qEq - (i + 1)) * (supply[i + 1] - supply[i]);
        eq = { qty: Math.round(qEq * 10) / 10, price: Math.round(pEq * 100) / 100 };
        break;
      }
    }

    return { chartData: data, equilibrium: eq };
  }, [comparisonData]);

  if (!chartData.length) return null;

  return (
    <section className="my-8" aria-label="Supply and demand curves">
      <h2 className="font-display font-bold text-lg text-foreground mb-1 flex items-center gap-2">
        <span className="w-1 h-5 rounded-full bg-primary inline-block" />
        Supply &amp; Demand
      </h2>
      <p className="text-xs text-muted-foreground mb-4 ml-3">
        Step-function curves inspired by{" "}
        <a href="https://github.com/gus-massa/pymarket" target="_blank" rel="noopener noreferrer" className="underline decoration-dotted underline-offset-2 hover:text-primary transition-colors">
          pymarket
        </a>
        . Supply = listed prices (ascending), Demand = sold prices (descending).
        {equilibrium && (
          <span className="ml-1 font-medium text-foreground">
            Equilibrium ≈ {equilibrium.qty} cards @ ${equilibrium.price.toFixed(2)}
          </span>
        )}
      </p>
      <div className="glass-panel p-4 md:p-6">
        <div className="w-full h-[400px] md:h-[450px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 20, bottom: 40, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
              <XAxis
                dataKey="qty"
                type="number"
                label={{ value: "Quantity", position: "insideBottom", offset: -10, style: { fill: "hsl(var(--muted-foreground))", fontSize: 11 } }}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
              />
              <YAxis
                label={{ value: "Price ($)", angle: -90, position: "insideLeft", offset: 10, style: { fill: "hsl(var(--muted-foreground))", fontSize: 11 } }}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
              />
              <Tooltip content={<SupplyDemandTooltip />} />
              <Legend
                verticalAlign="top"
                height={30}
                wrapperStyle={{ fontSize: 11, color: "hsl(var(--muted-foreground))" }}
              />
              {equilibrium && (
                <>
                  <ReferenceLine
                    x={equilibrium.qty}
                    stroke="hsl(var(--muted-foreground))"
                    strokeDasharray="4 4"
                    strokeOpacity={0.6}
                  />
                  <ReferenceLine
                    y={equilibrium.price}
                    stroke="hsl(var(--muted-foreground))"
                    strokeDasharray="4 4"
                    strokeOpacity={0.6}
                  />
                </>
              )}
              <Line
                type="stepAfter"
                dataKey="demand"
                name="Demand (Sold)"
                stroke="hsl(0, 72%, 55%)"
                strokeWidth={2.5}
                dot={false}
                connectNulls={false}
                isAnimationActive={false}
              />
              <Line
                type="stepAfter"
                dataKey="supply"
                name="Supply (Listed)"
                stroke="hsl(221, 83%, 53%)"
                strokeWidth={2.5}
                dot={false}
                connectNulls={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        {equilibrium && (
          <div className="mt-3 flex justify-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-card/80 px-4 py-1.5">
              <span className="text-xs text-muted-foreground">
                Equilibrium: <strong className="text-foreground">{equilibrium.qty} cards</strong> @ <strong className="text-foreground">${equilibrium.price.toFixed(2)}</strong>
              </span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default VzlaSupplyDemand;
