import { motion } from "framer-motion";
import { Athlete, EbayAvgRecord } from "@/data/athletes";
import { computeIndexForSport, getSportCounts, formatIndexNumber } from "@/lib/vzla-helpers";

interface VzlaIndexCardsProps {
  athletes: Athlete[];
  byName: Record<string, EbayAvgRecord>;
  byKey: Record<string, EbayAvgRecord>;
}

const SPORT_ICONS: Record<string, string> = {
  Baseball: "⚾",
  Soccer: "⚽",
  Basketball: "🏀",
  All: "🏆",
};

const VzlaIndexCards = ({ athletes, byName, byKey }: VzlaIndexCardsProps) => {
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
    { title: `${top1} Index`, icon: SPORT_ICONS[top1] || "🏅", value: formatIndexNumber(i1.sum), athletes: counts.get(top1) || 0, priced: i1.used },
    { title: `${top2} Index`, icon: SPORT_ICONS[top2] || "🏅", value: formatIndexNumber(i2.sum), athletes: counts.get(top2) || 0, priced: i2.used },
    { title: "All Index", icon: "🏆", value: formatIndexNumber(iAll.sum), athletes: athletes.length, priced: iAll.used },
  ];

  return (
    <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-6" aria-label="VZLA Index Cards">
      {cards.map((card, i) => (
        <motion.div
          key={card.title}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: i * 0.1 }}
          className="glass-panel-hover p-5 shimmer"
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
        </motion.div>
      ))}
    </section>
  );
};

export default VzlaIndexCards;
