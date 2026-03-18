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
  getSignalToNoise,
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

  const merged: EbayAvgData = { ...data };

  // Step 1: Per-record basePriceUSD fallback
  // Only fill in price from basePriceUSD when there are real listings (not fallback records)
  for (const key of Object.keys(merged)) {
    if (key === "_meta") continue;
    const rec = (merged as any)[key];
    if (!rec || typeof rec !== "object") continue;

    // Skip fallback records or records with no real listings
    if (rec.fallback === true) continue;
    const hasRealListings = (rec.nListing != null && rec.nListing > 0) || (rec.n != null && rec.n > 0);

    const currentPrice = Number(
      rec.avgListing ?? rec.taguchiListing ?? rec.trimmedListing ?? rec.avg ?? rec.average
    );
    if (!Number.isFinite(currentPrice) || currentPrice <= 0) {
      // Only use basePriceUSD if the record has real listings (price was just missing from the record)
      if (!hasRealListings) continue;
      const base = Number(rec.basePriceUSD);
      if (Number.isFinite(base) && base > 0) {
        rec.avgListing = base;
        rec.taguchiListing = base;
        rec.avg = base;
        rec.average = base;
        (merged as any)[key] = rec;
      }
    }
  }

  // Step 2: _meta.basePrices fallback
  const basePrices = (data as any)?._meta?.basePrices as Record<string, unknown> | undefined;
  if (basePrices && typeof basePrices === "object") {
    const normalizedToKey = new Map<string, string>();
    for (const key of Object.keys(merged)) {
      if (key === "_meta") continue;
      normalizedToKey.set(normalizeDataKey(key), key);
    }

    for (const [name, rawPrice] of Object.entries(basePrices)) {
      const price = Number(rawPrice);
      if (!Number.isFinite(price) || price <= 0) continue;

      const existingKey = normalizedToKey.get(normalizeDataKey(name)) ?? name;
      const current = ((merged as any)[existingKey] && typeof (merged as any)[existingKey] === "object"
        ? { ...(merged as any)[existingKey] }
        : {}) as Record<string, any>;

      // Skip fallback records
      if (current.fallback === true) continue;
      const hasRealListings = (current.nListing != null && current.nListing > 0) || (current.n != null && current.n > 0);

      const currentPrice = Number(
        current.avgListing ?? current.taguchiListing ?? current.trimmedListing ?? current.avg ?? current.average
      );

      // Always ensure basePriceUSD is set from _meta.basePrices
      if (!current.basePriceUSD) {
        current.basePriceUSD = price;
      }
      if ((!Number.isFinite(currentPrice) || currentPrice <= 0) && hasRealListings) {
        current.avgListing = price;
        current.taguchiListing = price;
        current.avg = price;
        current.average = price;
      }
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
  const [gemratePopMap, setGemratePopMap] = useState<Record<string, number>>({});
  const [beckettPopMap, setBeckettPopMap] = useState<Record<string, number>>({});
  const [scpPrices, setScpPrices] = useState<Record<string, { scpRawPrice: number | null }>>({});
  const [snapshotFallback, setSnapshotFallback] = useState<Record<string, { rawListedPrice: number | null; gradedListedPrice: number | null }>>({});
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

  // Build a set of athlete names eligible for graded data (gemrate="yes")
  const gemrateEligible = useMemo(() => {
    const set = new Set<string>();
    const normName = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[.\-']/g, "").replace(/\s+/g, " ").toLowerCase().trim();
    for (const a of athletes) {
      if (a.gemrate?.toLowerCase() === "yes") {
        set.add(a.name);
        set.add(normName(a.name));
      }
    }
    return set;
  }, [athletes]);

  // Filter graded eBay data to only include gemrate-eligible athletes
  const filteredGradedRaw = useMemo<EbayAvgData>(() => {
    if (gemrateEligible.size === 0) return ebayGradedRaw;
    const normName = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[.\-']/g, "").replace(/\s+/g, " ").toLowerCase().trim();
    const filtered: EbayAvgData = {};
    for (const [key, val] of Object.entries(ebayGradedRaw)) {
      if (key === "_meta" || gemrateEligible.has(key) || gemrateEligible.has(normName(key))) {
        (filtered as any)[key] = val;
      }
    }
    return filtered;
  }, [ebayGradedRaw, gemrateEligible]);

  const filteredGradedSoldRaw = useMemo<Record<string, any>>(() => {
    if (gemrateEligible.size === 0) return ebayGradedSoldRaw;
    const normName = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[.\-']/g, "").replace(/\s+/g, " ").toLowerCase().trim();
    const filtered: Record<string, any> = {};
    for (const [key, val] of Object.entries(ebayGradedSoldRaw)) {
      if (key === "_meta" || gemrateEligible.has(key) || gemrateEligible.has(normName(key))) {
        filtered[key] = val;
      }
    }
    return filtered;
  }, [ebayGradedSoldRaw, gemrateEligible]);

  // Build indexes
  const { byName, byKey } = useMemo(() => buildEbayIndexes(ebayAvgRaw), [ebayAvgRaw]);

  // Graded indexes: merge graded listed (ebay-graded-avg.json) with graded sold
  // (ebay-graded-sold-avg.json) as fallback, since graded listed data may be sparse/empty.
  const mergedGradedData = useMemo<EbayAvgData>(() => {
    const merged: EbayAvgData = {};
    // Start with sold data (map taguchiSold → avgListing for price lookups)
    for (const [key, val] of Object.entries(filteredGradedSoldRaw)) {
      if (key === "_meta" || !val) continue;
      const r = val as any;
      const soldPrice = r.taguchiSold ?? r.avg;
      if (soldPrice != null && Number.isFinite(soldPrice) && soldPrice > 0) {
        (merged as any)[key] = {
          ...r,
          avgListing: soldPrice,
          taguchiListing: soldPrice,
          avg: soldPrice,
          average: soldPrice,
        };
      }
    }
    // Override with listed data where available (higher priority)
    // Skip fallback records (nListing=0 or fallback=true) — sold data is more current
    // Sanity check: skip graded listed prices < 20% of sold avg (contaminated data)
    for (const [key, val] of Object.entries(filteredGradedRaw)) {
      if (key === "_meta" || !val) continue;
      const r = val as any;
      // Don't let fallback/zero-listing records override real sold data
      const hasRealListings = (r.nListing != null && r.nListing > 0) || (r.n != null && r.n > 0);
      if (r.fallback === true || !hasRealListings) continue;
      const listedPrice = r.avgListing ?? r.taguchiListing ?? r.trimmedListing ?? r.avg ?? r.average;
      if (listedPrice != null && Number.isFinite(listedPrice) && listedPrice > 0) {
        // Sanity check: if sold data exists and listed is suspiciously low, skip
        const soldRec = (merged as any)[key];
        if (soldRec) {
          const soldPrice = soldRec.avgListing ?? soldRec.taguchiListing ?? soldRec.avg;
          if (Number.isFinite(soldPrice) && soldPrice > 0 && listedPrice < soldPrice * 0.2) {
            continue; // contaminated listed data — sold is more reliable
          }
        }
        (merged as any)[key] = val;
      }
    }
    return merged;
  }, [filteredGradedRaw, filteredGradedSoldRaw]);

  const { byName: gradedByName, byKey: gradedByKey } = useMemo(() => buildEbayIndexes(mergedGradedData), [mergedGradedData]);

  // Fetch data on mount
  useEffect(() => {
    (async () => {
      const [fetchedAthletes, fetchedEbay, fetchedGraded, fetchedSold, fetchedGradedSold, fetchedProgress, fetchedHistory, fetchedIndexHistory, fetchedGemrate, fetchedScp, fetchedSnapshot, fetchedBeckett] = await Promise.all([
        fetchJson("https://raw.githubusercontent.com/jaydiare/ui-polish-pal/main/data/athletes.json"),
        fetchJson("https://raw.githubusercontent.com/jaydiare/ui-polish-pal/main/data/ebay-avg.json"),
        fetchJson("https://raw.githubusercontent.com/jaydiare/ui-polish-pal/main/data/ebay-graded-avg.json"),
        fetchJson("https://raw.githubusercontent.com/jaydiare/ui-polish-pal/main/data/ebay-sold-avg.json"),
        fetchJson("https://raw.githubusercontent.com/jaydiare/ui-polish-pal/main/data/ebay-graded-sold-avg.json"),
        fetchJson("https://raw.githubusercontent.com/jaydiare/ui-polish-pal/main/data/ebay-sold-progress.json"),
        fetchJson("https://raw.githubusercontent.com/jaydiare/ui-polish-pal/main/data/athlete-history.json"),
        fetchJson("https://raw.githubusercontent.com/jaydiare/ui-polish-pal/main/data/index-history.json"),
        fetchJson("https://raw.githubusercontent.com/jaydiare/ui-polish-pal/main/data/gemrate.json"),
        fetchJson("https://raw.githubusercontent.com/jaydiare/ui-polish-pal/main/data/scp-raw.json"),
        fetchJson("https://raw.githubusercontent.com/jaydiare/ui-polish-pal/main/data/vzla-athlete-market-data.json"),
        fetchJson("https://raw.githubusercontent.com/jaydiare/ui-polish-pal/main/data/gemrate_beckett.json"),
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
      if (fetchedGemrate?.athletes && typeof fetchedGemrate.athletes === "object") {
        const popMap: Record<string, number> = {};
        for (const [name, athlete] of Object.entries(fetchedGemrate.athletes as Record<string, any>)) {
          const pop = athlete?.graders?.PSA?.grades ?? athlete?.totals?.grades;
          if (pop != null && Number.isFinite(pop) && pop > 0) {
            popMap[name] = pop;
            // Also store normalized (accent-stripped) key for matching
            const normalized = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            if (normalized !== name) popMap[normalized] = pop;
          }
        }
        setGemratePopMap(popMap);
      }
      if (fetchedScp?.athletes && Array.isArray(fetchedScp.athletes)) {
        const map: Record<string, { scpRawPrice: number | null }> = {};
        for (const a of fetchedScp.athletes) {
          map[a.name] = { scpRawPrice: a.scpRawPrice ?? null };
        }
        setScpPrices(map);
      }
      if (fetchedSnapshot?.athletes && Array.isArray(fetchedSnapshot.athletes)) {
        const map: Record<string, { rawListedPrice: number | null; gradedListedPrice: number | null }> = {};
        for (const a of fetchedSnapshot.athletes) {
          map[a.name] = {
            rawListedPrice: a.rawListedPrice ?? null,
            gradedListedPrice: a.gradedListedPrice ?? null,
          };
        }
        setSnapshotFallback(map);
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
      signalToNoise: getSignalToNoise(a, useName, useKey),
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
    ebayGradedSoldRaw: filteredGradedSoldRaw,
    gemratePopMap,
    scpPrices,
    snapshotFallback,
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
