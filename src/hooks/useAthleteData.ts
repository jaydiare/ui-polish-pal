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
} from "@/lib/vzla-helpers";
import { runKnapsack, BudgetCandidate, KnapsackResult } from "@/lib/budget-knapsack";

const PAGE_SIZE = 400;

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
  const [lastUpdated, setLastUpdated] = useState<string>("—");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [filters, setFilters] = useState<Filters>({
    search: "",
    category: "all",
    league: "all",
    price: "all",
    stability: "all",
    daysListed: "all",
  });

  // Build indexes
  const { byName, byKey } = useMemo(() => buildEbayIndexes(ebayAvgRaw), [ebayAvgRaw]);

  // Fetch data on mount
  useEffect(() => {
    (async () => {
      const [fetchedAthletes, fetchedEbay] = await Promise.all([
        fetchJson("data/athletes.json"),
        fetchJson("data/ebay-avg.json"),
      ]);

      if (fetchedAthletes) {
        setAthletes(mergeByNameSportKeepBest(athleteDataRaw, fetchedAthletes));
      }
      if (fetchedEbay && typeof fetchedEbay === "object") {
        setEbayAvgRaw(fetchedEbay);
      }
    })();
  }, []);

  // Update last updated label
  useEffect(() => {
    const updatedAt = ebayAvgRaw?._meta?.updatedAt;
    if (updatedAt) {
      setLastUpdated(timeAgo(updatedAt));
      const interval = setInterval(() => setLastUpdated(timeAgo(updatedAt)), 60000);
      return () => clearInterval(interval);
    }
  }, [ebayAvgRaw]);

  // Filtered athletes
  const filteredAthletes = useMemo(
    () => filterAthletes(athletes, filters, byName, byKey),
    [athletes, filters, byName, byKey]
  );

  // Paginated
  const paginatedAthletes = useMemo(
    () => filteredAthletes.slice(0, visibleCount),
    [filteredAthletes, visibleCount]
  );

  const hasMore = filteredAthletes.length > visibleCount;
  const remainingCount = Math.min(PAGE_SIZE, filteredAthletes.length - visibleCount);

  const loadMore = useCallback(() => {
    setVisibleCount((prev) => prev + PAGE_SIZE);
  }, []);

  // Unique sports & leagues for filter options
  const sportOptions = useMemo(() => {
    const sports = Array.from(new Set(athletes.map((a) => a.sport).filter(Boolean))).sort();
    return sports;
  }, [athletes]);

  const leagueOptions = useMemo(() => {
    return Array.from(new Set(athletes.map((a) => a.league).filter(Boolean))).sort();
  }, [athletes]);

  const updateFilter = useCallback((key: keyof Filters, value: string) => {
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

  const runBudget = useCallback((budgetDollars: number, maxCards: number | null) => {
    const result = runKnapsack(budgetCandidates, budgetDollars, maxCards);
    setBudgetResult(result);
  }, [budgetCandidates]);

  const clearBudget = useCallback(() => {
    setBudgetResult(null);
  }, []);

  // Chosen IDs set for highlighting
  const budgetChosenIds = useMemo(() => {
    if (!budgetResult) return new Set<string>();
    return new Set(budgetResult.chosen.map((c) => c.id));
  }, [budgetResult]);

  return {
    athletes,
    filteredAthletes,
    paginatedAthletes,
    byName,
    byKey,
    ebayAvgRaw,
    lastUpdated,
    filters,
    updateFilter,
    hasMore,
    remainingCount,
    loadMore,
    sportOptions,
    leagueOptions,
    budgetResult,
    budgetChosenIds,
    runBudget,
    clearBudget,
  };
}
