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

const normalizeDataKey = (s: string) =>
  String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.\-']/g, "")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim();

function enrichWithBasePrices(data: EbayAvgData | null): EbayAvgData | null {
  if (!data || typeof data !== "object") return data;

  const basePrices = (data as any)?._meta?.basePrices as Record<string, unknown> | undefined;
  if (!basePrices || typeof basePrices !== "object") return data;

  const normalizedToKey = new Map<string, string>();
  for (const key of Object.keys(data)) {
    if (key === "_meta") continue;
    normalizedToKey.set(normalizeDataKey(key), key);
  }

  const merged: EbayAvgData = { ...data };

  for (const [name, rawPrice] of Object.entries(basePrices)) {
    const price = Number(rawPrice);
    if (!Number.isFinite(price) || price <= 0) continue;

    const existingKey = normalizedToKey.get(normalizeDataKey(name)) ?? name;
    const current = ((merged as any)[existingKey] && typeof (merged as any)[existingKey] === "object"
      ? { ...(merged as any)[existingKey] }
      : {}) as Record<string, any>;

    const currentPrice = Number(
      current.avgListing ?? current.taguchiListing ?? current.trimmedListing ?? current.avg ?? current.average
    );

    if (!Number.isFinite(currentPrice) || currentPrice <= 0) {
      current.avgListing = price;
      current.taguchiListing = price;
      current.avg = price;
      current.average = price;
      (merged as any)[existingKey] = current;
    }
  }

  return merged;
}

export function useAthleteData() {
  const [athletes, setAthletes] = useState<Athlete[]>(athleteDataRaw);
  const [ebayAvgRaw, setEbayAvgRaw] = useState<EbayAvgData>({});
  const [ebayGradedRaw, setEbayGradedRaw] = useState<EbayAvgData>({});
  const [ebaySoldRaw, setEbaySoldRaw] = useState<Record<string, any>>({});
  const [ebayGradedSoldRaw, setEbayGradedSoldRaw] = useState<Record<string, any>>({});
  const [athleteHistory, setAthleteHistory] = useState<Record<string, any[]>>({});
  const [indexHistory, setIndexHistory] = useState<any[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string>("—");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [filters, setFilters] = useState<Filters>({
    search: "",
    category: "all",
    price: "all",
    stability: "all",
    daysListed: "all",
    signal: "all",
  });

  // Build indexes
  const { byName, byKey } = useMemo(() => buildEbayIndexes(ebayAvgRaw), [ebayAvgRaw]);
  const { byName: gradedByName, byKey: gradedByKey } = useMemo(() => buildEbayIndexes(ebayGradedRaw), [ebayGradedRaw]);

  // Fetch data on mount
  useEffect(() => {
    (async () => {
      const [fetchedAthletes, fetchedEbay, fetchedGraded, fetchedSold, fetchedGradedSold, fetchedProgress, fetchedHistory, fetchedIndexHistory] = await Promise.all([
        fetchJson("https://raw.githubusercontent.com/jaydiare/ui-polish-pal/main/data/athletes.json"),
        fetchJson("https://raw.githubusercontent.com/jaydiare/ui-polish-pal/main/data/ebay-avg.json"),
        fetchJson("https://raw.githubusercontent.com/jaydiare/ui-polish-pal/main/data/ebay-graded-avg.json"),
        fetchJson("https://raw.githubusercontent.com/jaydiare/ui-polish-pal/main/data/ebay-sold-avg.json"),
        fetchJson("https://raw.githubusercontent.com/jaydiare/ui-polish-pal/main/data/ebay-graded-sold-avg.json"),
        fetchJson("https://raw.githubusercontent.com/jaydiare/ui-polish-pal/main/data/ebay-sold-progress.json"),
        fetchJson("https://raw.githubusercontent.com/jaydiare/ui-polish-pal/main/data/athlete-history.json"),
        fetchJson("https://raw.githubusercontent.com/jaydiare/ui-polish-pal/main/data/index-history.json"),
      ]);

      const patchedEbay = enrichWithBasePrices(fetchedEbay as EbayAvgData | null);
      const patchedGraded = enrichWithBasePrices(fetchedGraded as EbayAvgData | null);

      if (fetchedAthletes) {
        setAthletes(mergeByNameSportKeepBest(athleteDataRaw, fetchedAthletes));
      }
      if (patchedEbay && typeof patchedEbay === "object") {
        setEbayAvgRaw(patchedEbay);
      }
      if (patchedGraded && typeof patchedGraded === "object") {
        setEbayGradedRaw(patchedGraded);
      }
      if (fetchedSold && typeof fetchedSold === "object") {
        setEbaySoldRaw(fetchedSold);
      }
      if (fetchedGradedSold && typeof fetchedGradedSold === "object") {
        setEbayGradedSoldRaw(fetchedGradedSold);
      }
      if (fetchedProgress?.lastBatchAt) {
        setLastUpdated(timeAgo(fetchedProgress.lastBatchAt));
      }
      if (fetchedHistory && typeof fetchedHistory === "object") {
        setAthleteHistory(fetchedHistory);
      }
      if (Array.isArray(fetchedIndexHistory)) {
        setIndexHistory(fetchedIndexHistory);
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

  // Price mode: which price set drives filters & sorting
  const [priceMode, setPriceMode] = useState<"raw" | "graded" | "both">("both");
  const activeByName = priceMode === "graded" ? gradedByName : byName;
  const activeByKey = priceMode === "graded" ? gradedByKey : byKey;

  // Filtered athletes
  const filteredAthletes = useMemo(
    () => filterAthletes(athletes, filters, activeByName, activeByKey, ebaySoldRaw),
    [athletes, filters, activeByName, activeByKey, ebaySoldRaw]
  );

  // Sorted
  const sortedAthletes = useMemo(
    () => sortAthletes(filteredAthletes, sort, activeByName, activeByKey),
    [filteredAthletes, sort, activeByName, activeByKey]
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




  const runBudget = useCallback((budgetDollars: number, maxCards: number | null, cardType: string = "raw") => {
    const useName = cardType === "graded" ? gradedByName : byName;
    const useKey = cardType === "graded" ? gradedByKey : byKey;

    const candidates: BudgetCandidate[] = filteredAthletes.map((a) => ({
      name: a.name,
      sport: a.sport,
      price: getEbayAvgNumber(a, useName, useKey),
      stabilityPct: (() => {
        const cv = getMarketStabilityCV(a, useName, useKey);
        return cv != null ? cv * 100 : null;
      })(),
      daysOnMarket: getAvgDaysOnMarket(a, useName, useKey),
    }));

    const result = runKnapsack(candidates, budgetDollars, maxCards);
    setBudgetResult(result);
  }, [filteredAthletes, byName, byKey, gradedByName, gradedByKey, ebaySoldRaw]);

  const DEFAULT_FILTERS: Filters = {
    search: "",
    category: "all",
    price: "all",
    stability: "all",
    daysListed: "all",
    signal: "all",
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
    gradedByName,
    gradedByKey,
    ebayAvgRaw,
    ebaySoldRaw,
    ebayGradedSoldRaw,
    athleteHistory,
    indexHistory,
    lastUpdated,
    filters,
    updateFilter,
    sort,
    setSort,
    priceMode,
    setPriceMode,
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
