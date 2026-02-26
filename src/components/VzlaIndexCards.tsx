import { Athlete, EbayAvgRecord } from "@/data/athletes";
import { computeIndexForSport, getSportCounts, formatIndexNumber } from "@/lib/vzla-helpers";

interface VzlaIndexCardsProps {
  athletes: Athlete[];
  byName: Record<string, EbayAvgRecord>;
  byKey: Record<string, EbayAvgRecord>;
}

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
    { title: `${top1} Index`, badge: "I", value: formatIndexNumber(i1.sum), sub: `${counts.get(top1) || 0} athletes • ${i1.used} priced` },
    { title: `${top2} Index`, badge: "I", value: formatIndexNumber(i2.sum), sub: `${counts.get(top2) || 0} athletes • ${i2.used} priced` },
    { title: "All Index", badge: "I", value: formatIndexNumber(iAll.sum), sub: `${athletes.length} athletes • ${iAll.used} priced` },
  ];

  return (
    <section className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 my-[18px]" aria-label="VZLA Index Cards">
      {cards.map((card) => (
        <div key={card.title} className="glass-panel p-4">
          <div className="flex items-center justify-between gap-2.5 mb-2.5">
            <div className="flex items-center gap-2.5 font-black tracking-[0.02em]">
              <div className="w-[26px] h-[26px] rounded-lg flex items-center justify-center text-xs font-black cta-flag">
                {card.badge}
              </div>
              <div>{card.title}</div>
            </div>
          </div>
          <div className="text-[26px] font-black tracking-[-0.02em]">{card.value}</div>
          <div className="mt-1.5 text-foreground/60 font-extrabold text-xs tracking-[0.06em] uppercase">
            {card.sub}
          </div>
        </div>
      ))}
    </section>
  );
};

export default VzlaIndexCards;
