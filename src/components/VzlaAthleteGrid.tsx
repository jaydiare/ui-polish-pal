import { motion } from "framer-motion";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Athlete, EbayAvgRecord } from "@/data/athletes";
import { buildBudgetAthleteId } from "@/lib/budget-knapsack";
import { SortOption } from "@/lib/vzla-helpers";
import AthleteCard from "./AthleteCard";
import { useHotSellers } from "@/hooks/useEpnPerformance";
import { useAthleteMlScores } from "@/hooks/useAthleteMlScores";
import { useLanguage } from "@/i18n/LanguageProvider";
import { useIsMobile } from "@/hooks/use-mobile";
import type { TranslationKey } from "@/i18n/translations";

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
  snapshotFallback?: Record<string, { rawListedPrice: number | null; gradedListedPrice: number | null }>;
  hasMore: boolean;
  remainingCount: number;
  onLoadMore: () => void;
  highlightedIds?: Set<string>;
  sort: SortOption;
  onSortChange: (sort: SortOption) => void;
  priceMode: "raw" | "graded" | "both";
}

const SORT_OPTIONS: { value: SortOption; labelKey: TranslationKey }[] = [
  { value: "default", labelKey: "sort.default" },
  { value: "price_desc", labelKey: "sort.priceDesc" },
  { value: "stability_best", labelKey: "sort.mostStable" },
  { value: "deal_score_desc", labelKey: "sort.dealScore" },
  { value: "upside_prob_desc", labelKey: "sort.upside" },
  { value: "volatility_high", labelKey: "sort.volatileFirst" },
  { value: "volatility_low", labelKey: "sort.stableFirst" },
];

const VzlaAthleteGrid = ({ athletes, byName, byKey, gradedByName, gradedByKey, ebaySoldRaw, ebayGradedSoldRaw, athleteHistory, gemratePopMap, snapshotFallback, hasMore, remainingCount, onLoadMore, highlightedIds, sort, onSortChange, priceMode }: VzlaAthleteGridProps) => {
  const hotSellers = useHotSellers();
  const { getScore } = useAthleteMlScores();
  const { t } = useLanguage();
  const isMobile = useIsMobile();
  const [sortExpanded, setSortExpanded] = useState(false);

  // If budget is active, filter to only highlighted cards
  const displayAthletes = highlightedIds && highlightedIds.size > 0
    ? athletes.filter((a) => highlightedIds.has(buildBudgetAthleteId(a.name, a.sport)))
    : athletes;

  const activeSortLabel = SORT_OPTIONS.find((o) => o.value === sort)?.labelKey ?? "sort.default";

  const SortButton = ({ opt, onClick }: { opt: typeof SORT_OPTIONS[number]; onClick?: () => void }) => (
    <button
      key={opt.value}
      onClick={() => {
        onSortChange(opt.value);
        onClick?.();
      }}
      className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all border text-left ${
        sort === opt.value
          ? "bg-vzla-yellow/15 border-vzla-yellow/30 text-vzla-yellow"
          : "bg-secondary border-border text-muted-foreground hover:text-foreground hover:border-foreground/20"
      }`}
    >
      {t(opt.labelKey)}
    </button>
  );

  return (
    <>
      {/* Sort bar */}
      <div className="mt-8 mb-4" role="toolbar" aria-label="Sort controls">
        {isMobile ? (
          <div className="space-y-2">
            <button
              onClick={() => setSortExpanded((v) => !v)}
              aria-expanded={sortExpanded}
              aria-controls="sort-panel"
              className="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-secondary border border-border text-foreground cursor-pointer transition-all hover:border-foreground/20"
            >
              <div className="flex items-center gap-2">
                <span className="text-[10px] tracking-widest uppercase font-bold text-muted-foreground">{t("sort.by")}</span>
                <span className="text-xs font-semibold">{t(activeSortLabel)}</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${sortExpanded ? "rotate-180" : ""}`} />
            </button>
            {sortExpanded && (
              <div id="sort-panel" className="grid grid-cols-2 gap-2">
                {SORT_OPTIONS.map((opt) => (
                  <SortButton key={opt.value} opt={opt} onClick={() => setSortExpanded(false)} />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-[10px] tracking-widest uppercase font-bold text-muted-foreground">{t("sort.by")}</span>
            {SORT_OPTIONS.map((opt) => (
              <SortButton key={opt.value} opt={opt} />
            ))}
          </div>
        )}
      </div>

      {displayAthletes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <span className="text-3xl mb-3">🔍</span>
          <p className="text-sm font-medium text-foreground mb-1">No athletes match your filters</p>
          <p className="text-xs text-muted-foreground max-w-xs">Try broadening your search or clearing some filters to see more results.</p>
        </div>
      ) : (
      <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-5">
        {displayAthletes.map((a, i) => {
          // Per-athlete priceMode: gemrate "no" → raw only; otherwise respect global
          const effectivePriceMode = a.gemrate?.toLowerCase() === "no" ? "raw" : priceMode;

          return (
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
                gradedByName={gradedByName}
                gradedByKey={gradedByKey}
                ebaySoldRaw={ebaySoldRaw}
                ebayGradedSoldRaw={ebayGradedSoldRaw}
                history={athleteHistory?.[a.name]}
                psaPop={gemratePopMap?.[a.name] ?? gemratePopMap?.[a.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "")]}
                isRecommended={highlightedIds?.has(buildBudgetAthleteId(a.name, a.sport))}
                isHotSeller={hotSellers.has(a.name)}
                priceMode={effectivePriceMode}
                snapshotFallback={snapshotFallback?.[a.name]}
                mlScore={getScore(a.name)}
              />
            </motion.div>
          );
        })}
      </div>
      )}



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
