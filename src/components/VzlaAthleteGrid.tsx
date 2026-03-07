import { motion } from "framer-motion";
import { Athlete, EbayAvgRecord } from "@/data/athletes";
import { buildBudgetAthleteId } from "@/lib/budget-knapsack";
import { SortOption } from "@/lib/vzla-helpers";
import AthleteCard from "./AthleteCard";
import { useHotSellers } from "@/hooks/useEpnPerformance";

interface VzlaAthleteGridProps {
  athletes: Athlete[];
  byName: Record<string, EbayAvgRecord>;
  byKey: Record<string, EbayAvgRecord>;
  gradedByName: Record<string, EbayAvgRecord>;
  gradedByKey: Record<string, EbayAvgRecord>;
  ebaySoldRaw?: Record<string, any>;
  ebayGradedSoldRaw?: Record<string, any>;
  athleteHistory?: Record<string, any[]>;
  gemratePopMap?: Record<string, number>;
  hasMore: boolean;
  remainingCount: number;
  onLoadMore: () => void;
  highlightedIds?: Set<string>;
  sort: SortOption;
  onSortChange: (sort: SortOption) => void;
  priceMode: "raw" | "graded" | "both";
}

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "default", label: "Default" },
  { value: "price_desc", label: "Price ↓" },
  { value: "stability_best", label: "Most Stable" },
];

const VzlaAthleteGrid = ({ athletes, byName, byKey, gradedByName, gradedByKey, ebaySoldRaw, ebayGradedSoldRaw, athleteHistory, gemratePopMap, hasMore, remainingCount, onLoadMore, highlightedIds, sort, onSortChange, priceMode }: VzlaAthleteGridProps) => {
  const hotSellers = useHotSellers();

  // If budget is active, filter to only highlighted cards
  const displayAthletes = highlightedIds && highlightedIds.size > 0
    ? athletes.filter((a) => highlightedIds.has(buildBudgetAthleteId(a.name, a.sport)))
    : athletes;

  return (
    <>
      {/* Sort bar */}
      <div className="flex items-center gap-2 mt-8 mb-4" role="toolbar" aria-label="Sort controls">
        <span className="text-[10px] tracking-widest uppercase font-bold text-muted-foreground">Sort by</span>
        {SORT_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onSortChange(opt.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all border ${
              sort === opt.value
                ? "bg-vzla-yellow/15 border-vzla-yellow/30 text-vzla-yellow"
                : "bg-secondary border-border text-muted-foreground hover:text-foreground hover:border-foreground/20"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-5">
        {displayAthletes.map((a, i) => (
          <motion.div
            key={`${a.name}-${a.sport}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: Math.min(i * 0.02, 0.5) }}
          >
            <AthleteCard
70:               athlete={a}
71:               byName={byName}
72:               byKey={byKey}
73:               gradedByName={gradedByName}
74:               gradedByKey={gradedByKey}
75:               ebaySoldRaw={ebaySoldRaw}
76:               ebayGradedSoldRaw={ebayGradedSoldRaw}
77:               history={athleteHistory?.[a.name]}
78:               psaPop={gemratePopMap?.[a.name] ?? gemratePopMap?.[a.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "")]}
79:               isRecommended={highlightedIds?.has(buildBudgetAthleteId(a.name, a.sport))}
80:               isHotSeller={hotSellers.has(a.name)}
81:               priceMode={a.gemrate?.toLowerCase() === "no" ? "raw" : priceMode}
            />
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
