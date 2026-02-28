import { motion } from "framer-motion";
import { useMemo } from "react";
import { LineChart, Line, ResponsiveContainer, YAxis } from "recharts";
import { Athlete, EbayAvgRecord, IndexHistoryEntry } from "@/data/athletes";
import { computeIndexForSport, getSportCounts, formatIndexNumber } from "@/lib/vzla-helpers";

interface VzlaIndexCardsProps {
  athletes: Athlete[];
  byName: Record<string, EbayAvgRecord>;
  byKey: Record<string, EbayAvgRecord>;
  indexHistory?: IndexHistoryEntry[];
}

const SPORT_ICONS: Record<string, string> = {
  Baseball: "⚾",
  Soccer: "⚽",
  Basketball: "🏀",
  All: "🏆",
};

const VzlaIndexCards = ({ athletes, byName, byKey, indexHistory }: VzlaIndexCardsProps) => {
  const counts = getSportCounts(athletes);

  const entries = Array.from(counts.entries())
    .filter(([sport]) => sport !== "Other")
    .sort((a, b) => b[1] - a[1]);

  const top1 = entries[0]?.[0] || "Baseball";
  const top2 = entries[1]?.[0] || "Soccer";

  const i1 = computeIndexForSport(athletes, top1, byName, byKey);
  const i2 = computeIndexForSport(athletes, top2, byName, byKey);
  const iAll = computeIndexForSport(athletes, "All", byName, byKey);

  const cards = [
    { title: `${top1} Index`, icon: SPORT_ICONS[top1] || "🏅", value: formatIndexNumber(i1.sum), athletes: counts.get(top1) || 0, priced: i1.used, sport: top1 },
    { title: `${top2} Index`, icon: SPORT_ICONS[top2] || "🏅", value: formatIndexNumber(i2.sum), athletes: counts.get(top2) || 0, priced: i2.used, sport: top2 },
    { title: "All Index", icon: "🏆", value: formatIndexNumber(iAll.sum), athletes: athletes.length, priced: iAll.used, sport: "All" },
  ];

  // Build sparkline data + % change from indexHistory
  const { sparklines, changes } = useMemo(() => {
    if (!indexHistory || indexHistory.length === 0) {
      return { sparklines: cards.map(() => []), changes: cards.map(() => null) };
    }
    const sLines = cards.map((c) => {
      const points = indexHistory
        .map((h) => {
          const v = Number(h[c.sport]);
          return Number.isFinite(v) && v > 0 ? { v } : null;
        })
        .filter(Boolean) as { v: number }[];
      // If only 1 point, add a slight offset so Recharts draws a visible line
      if (points.length === 1) {
        return [{ v: points[0].v * 0.98 }, points[0]];
      }
      return points;
    });
    const chgs = cards.map((c) => {
      if (!indexHistory || indexHistory.length < 2) return null;
      const recent = indexHistory.slice(-2);
      const prev = Number(recent[0][c.sport]);
      const curr = Number(recent[1][c.sport]);
      if (!Number.isFinite(prev) || !Number.isFinite(curr) || prev === 0) return null;
      return ((curr - prev) / prev) * 100;
    });
    return { sparklines: sLines, changes: chgs };
  }, [indexHistory, cards.map(c => c.sport).join(",")]);

  return (
    <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-6" aria-label="VZLA Index Cards">
      {cards.map((card, i) => {
        const change = changes[i];
        const isUp = change != null && change >= 0;
        const isDown = change != null && change < 0;
        return (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.1 }}
            className="glass-panel-hover p-5 shimmer relative overflow-hidden"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-secondary border border-border flex items-center justify-center text-lg">
                {card.icon}
              </div>
              <div className="font-display font-bold text-sm text-foreground">{card.title}</div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-display font-bold tracking-tight text-foreground">{card.value}</span>
              {change != null && (
                <span className={`text-xs font-semibold ${isUp ? "text-green-500" : "text-red-500"}`}>
                  {isUp ? "▲" : "▼"} {Math.abs(change).toFixed(1)}%
                </span>
              )}
            </div>
            <div className="mt-2 flex items-center gap-3">
              <span className="text-xs text-muted-foreground font-medium">{card.athletes} athletes</span>
              <span className="w-1 h-1 rounded-full bg-border" />
              <span className="text-xs text-muted-foreground font-medium">{card.priced} priced</span>
            </div>

            {/* Sparkline trend */}
            {sparklines[i] && sparklines[i].length > 1 && (
              <div className="absolute bottom-2 right-2 w-24 h-10 opacity-70">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={sparklines[i]}>
                    <YAxis domain={["dataMin - 1", "dataMax + 1"]} hide />
                    <Line
                      type="monotone"
                      dataKey="v"
                      stroke={isDown ? "hsl(0 70% 55%)" : "hsl(142 70% 45%)"}
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </motion.div>
        );
      })}
    </section>
  );
};

export default VzlaIndexCards;
