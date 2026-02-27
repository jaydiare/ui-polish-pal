import { useState, useEffect, useCallback, useMemo } from "react";
import { Athlete, EbayAvgData, athleteDataRaw } from "@/data/athletes";
import {
  mergeByNameSportKeepBest,
  buildEbayIndexes,
  filterAthletes,
  getEbayAvgNumber,
  getMarketStabilityCV,
  getAvgDaysOnMarket,
  Filters,
  timeAgo,
  SortOption,
  sortAthletes,
} from "@/lib/vzla-helpers";
import { runKnapsack, BudgetCandidate, KnapsackResult } from "@/lib/budget-knapsack";

const PAGE_SIZE = 48;

async function fetchJson(path: string) {
  try {
    const res = await fetch(path, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export function useAthleteData() {
  const [athletes, setAthletes] = useState<Athlete[]>(athleteDataRaw);
  const [ebayAvgRaw, setEbayAvgRaw] = useState<EbayAvgData>({});
  const [ebaySoldRaw, setEbaySoldRaw] = useState<Record<string, any>>({});
  const [lastUpdated, setLastUpdated] = useState<string>("—");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [filters, setFilters] = useState<Filters>({
    search: "",
    category: "all",
    price: "all",
    stability: "all",
    daysListed: "all",
  });

  // Build indexes
  const { byName, byKey } = useMemo(() => buildEbayIndexes(ebayAvgRaw), [ebayAvgRaw]);

  // Fetch data on mount
  useEffect(() => {
    (async () => {
      const [fetchedAthletes, fetchedEbay, fetchedSold, fetchedProgress] = await Promise.all([
        fetchJson("data/athletes.json"),
        fetchJson("https://raw.githubusercontent.com/jaydiare/ui-polish-pal/main/data/ebay-avg.json"),
        fetchJson("https://raw.githubusercontent.com/jaydiare/ui-polish-pal/main/data/ebay-sold-avg.json"),
        fetchJson("https://raw.githubusercontent.com/jaydiare/ui-polish-pal/main/data/ebay-sold-progress.json"),
      ]);

      if (fetchedAthletes) {
        setAthletes(mergeByNameSportKeepBest(athleteDataRaw, fetchedAthletes));
      }
      if (fetchedEbay && typeof fetchedEbay === "object") {
        setEbayAvgRaw(fetchedEbay);
      }
      if (fetchedSold && typeof fetchedSold === "object") {
        setEbaySoldRaw(fetchedSold);
      }
      if (fetchedProgress?.lastBatchAt) {
        setLastUpdated(timeAgo(fetchedProgress.lastBatchAt));
      }
    })();
  }, []);

  // Update last updated label (fallback if progress didn't load)
  useEffect(() => {
    if (lastUpdated !== "—") return; // already set from progress
    const updatedAt = ebayAvgRaw?._meta?.updatedAt;
    if (updatedAt) {
      setLastUpdated(timeAgo(updatedAt));
    }
  }, [ebayAvgRaw, lastUpdated]);
  // Sort
  const [sort, setSort] = useState<SortOption>("default");

  // Filtered athletes
  const filteredAthletes = useMemo(
    () => filterAthletes(athletes, filters, byName, byKey),
    [athletes, filters, byName, byKey]
  );

  // Sorted
  const sortedAthletes = useMemo(
    () => sortAthletes(filteredAthletes, sort, byName, byKey),
    [filteredAthletes, sort, byName, byKey]
  );

  // Paginated
  const paginatedAthletes = useMemo(
    () => sortedAthletes.slice(0, visibleCount),
    [sortedAthletes, visibleCount]
  );

  const hasMore = sortedAthletes.length > visibleCount;
  const remainingCount = Math.min(PAGE_SIZE, sortedAthletes.length - visibleCount);

  const loadMore = useCallback(() => {
    setVisibleCount((prev) => prev + PAGE_SIZE);
  }, []);

  // Unique sports & leagues for filter options
  const sportOptions = useMemo(() => {
    const sports = Array.from(new Set(athletes.map((a) => a.sport).filter(Boolean))).sort();
    return sports;
  }, [athletes]);

  const updateFilter = useCallback((key: keyof Filters, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setVisibleCount(PAGE_SIZE);
  }, []);

  // Budget knapsack
  const [budgetResult, setBudgetResult] = useState<KnapsackResult | null>(null);

  const budgetCandidates = useMemo((): BudgetCandidate[] => {
    return filteredAthletes.map((a) => ({
      name: a.name,
      sport: a.sport,
      price: getEbayAvgNumber(a, byName, byKey),
      stabilityPct: (() => {
        const cv = getMarketStabilityCV(a, byName, byKey);
        return cv != null ? cv * 100 : null;
      })(),
      daysOnMarket: getAvgDaysOnMarket(a, byName, byKey),
    }));
  }, [filteredAthletes, byName, byKey]);

  const runBudget = useCallback((budgetDollars: number, maxCards: number | null, flipOnly: boolean = false) => {
    const candidates = flipOnly
      ? budgetCandidates.filter((c) => c.stabilityPct != null && c.stabilityPct > 20)
      : budgetCandidates;
    const result = runKnapsack(candidates, budgetDollars, maxCards);
    setBudgetResult(result);
  }, [budgetCandidates]);

  const DEFAULT_FILTERS: Filters = {
    search: "",
    category: "all",
    price: "all",
    stability: "all",
    daysListed: "all",
  };

  const clearBudget = useCallback(() => {
    setBudgetResult(null);
    setFilters(DEFAULT_FILTERS);
    setVisibleCount(PAGE_SIZE);
  }, []);

  // Chosen IDs set for highlighting
  const budgetChosenIds = useMemo(() => {
    if (!budgetResult) return new Set<string>();
    return new Set(budgetResult.chosen.map((c) => c.id));
  }, [budgetResult]);

  return {
    athletes,
    filteredAthletes: sortedAthletes,
    paginatedAthletes,
    byName,
    byKey,
    ebayAvgRaw,
    ebaySoldRaw,
    lastUpdated,
    filters,
    updateFilter,
    sort,
    setSort,
    hasMore,
    remainingCount,
    loadMore,
    sportOptions,
    budgetResult,
    budgetChosenIds,
    runBudget,
    clearBudget,
  };
}
