import { motion } from "framer-motion";
import { useMemo } from "react";

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

  const { changes, periods } = useMemo(() => {
    if (!indexHistory || indexHistory.length === 0) {
      return {
        changes: cards.map(() => null),
        periods: cards.map(() => "")
      };
    }

    const chgs = cards.map((c) => {
      const series = indexHistory
        .map((h) => Number(h[c.sport]))
        .filter((v) => Number.isFinite(v) && v > 0);

      if (series.length < 2) return null;
      const prev = series[series.length - 2];
      const curr = series[series.length - 1];
      if (!prev || prev <= 0) return null;
      return ((curr - prev) / prev) * 100;
    });

    const firstDate = new Date(indexHistory[0]?.date || "");
    const lastDate = new Date(indexHistory[indexHistory.length - 1]?.date || "");
    const dayDiff =
      Number.isFinite(firstDate.getTime()) && Number.isFinite(lastDate.getTime())
        ? Math.max(1, Math.round((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)))
        : Math.max(1, indexHistory.length - 1);

    return {
      changes: chgs,
      periods: cards.map(() => `${dayDiff}d`),
    };
  }, [indexHistory, cards.map((c) => c.sport).join(",")]);

  return (
    <section className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 my-6 px-1 sm:px-0" aria-label="VZLA Index Cards">
      {cards.map((card, i) => {
        const change = changes[i];
        const isUp = change != null && change >= 0;
        

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

            <div className="text-3xl font-display font-bold tracking-tight text-foreground">{card.value}</div>

            <div className="mt-2 flex items-center gap-3">
              <span className="text-xs text-muted-foreground font-medium">{card.athletes} athletes</span>
              <span className="w-1 h-1 rounded-full bg-border" />
              <span className="text-xs text-muted-foreground font-medium">{card.priced} priced</span>
            </div>

            <div className="mt-3 flex items-center justify-end gap-2 text-xs">
              {change != null && (
                <>
                  <span className={`font-semibold ${isUp ? "text-primary" : "text-destructive"}`}>
                    {isUp ? "↗" : "↘"} {change > 0 ? "+" : ""}{change.toFixed(1)}%
                  </span>
                  <span className="text-muted-foreground">{periods[i]}</span>
                </>
              )}
            </div>

          </motion.div>
        );
      })}
    </section>
  );
};

export default VzlaIndexCards;

