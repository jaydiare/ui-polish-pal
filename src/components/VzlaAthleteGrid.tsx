import { motion } from "framer-motion";
import { Athlete, EbayAvgRecord } from "@/data/athletes";
import { buildBudgetAthleteId } from "@/lib/budget-knapsack";
import AthleteCard from "./AthleteCard";

interface VzlaAthleteGridProps {
  athletes: Athlete[];
  byName: Record<string, EbayAvgRecord>;
  byKey: Record<string, EbayAvgRecord>;
  hasMore: boolean;
  remainingCount: number;
  onLoadMore: () => void;
  highlightedIds?: Set<string>;
}

const VzlaAthleteGrid = ({ athletes, byName, byKey, hasMore, remainingCount, onLoadMore, highlightedIds }: VzlaAthleteGridProps) => {
  // If budget is active, filter to only highlighted cards
  const displayAthletes = highlightedIds && highlightedIds.size > 0
    ? athletes.filter((a) => highlightedIds.has(buildBudgetAthleteId(a.name, a.sport)))
    : athletes;

  return (
    <>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-5 mt-8">
        {displayAthletes.map((a, i) => (
          <motion.div
            key={`${a.name}-${a.sport}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: Math.min(i * 0.02, 0.5) }}
          >
            <AthleteCard
              athlete={a}
              byName={byName}
              byKey={byKey}
              isRecommended={highlightedIds?.has(buildBudgetAthleteId(a.name, a.sport))}
            />
          </motion.div>
        ))}
      </div>

      {!highlightedIds?.size && hasMore && (
        <div className="flex justify-center mt-8">
          <button
            className="px-6 py-3 rounded-xl border border-border bg-secondary text-foreground font-display font-semibold text-sm cursor-pointer transition-all hover:bg-vzla-yellow/10 hover:border-vzla-yellow/20 hover:text-vzla-yellow active:scale-[0.98]"
            onClick={onLoadMore}
          >
            Load More ({remainingCount} remaining)
          </button>
        </div>
      )}
    </>
  );
};

export default VzlaAthleteGrid;
