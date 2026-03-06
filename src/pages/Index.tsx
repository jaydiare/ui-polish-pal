import { lazy, Suspense } from "react";
import SEOHead from "@/components/SEOHead";
import VzlaNavbar from "@/components/VzlaNavbar";
import VzlaHero from "@/components/VzlaHero";
import VzlaIndexCards from "@/components/VzlaIndexCards";

const VzlaHowToMoney = lazy(() => import("@/components/VzlaHowToMoney"));
const VzlaTopDeals = lazy(() => import("@/components/VzlaTopDeals"));
const VzlaBudgetBar = lazy(() => import("@/components/VzlaBudgetBar"));
const VzlaSearchFilters = lazy(() => import("@/components/VzlaSearchFilters"));
const VzlaAthleteGrid = lazy(() => import("@/components/VzlaAthleteGrid"));
const VzlaFooter = lazy(() => import("@/components/VzlaFooter"));
const VzlaEbayFooter = lazy(() => import("@/components/VzlaEbayFooter"));
import { useAthleteData } from "@/hooks/useAthleteData";

const Index = () => {
  const {
    athletes,
    filteredAthletes,
    paginatedAthletes,
    byName,
    byKey,
    gradedByName,
    gradedByKey,
    ebayAvgRaw,
    ebaySoldRaw,
    ebayGradedSoldRaw,
    gemratePopMap,
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
  } = useAthleteData();

  return (
    <div id="top" className="min-h-screen">
      <SEOHead
        title="Venezuelan Athletes Sports Cards – Daily eBay Price Index | VZLA Sports Elite"
        description="Track 550+ Venezuelan athletes' trading card prices updated daily. eBay market averages, stability scores, sold comps, and investment signals for baseball, soccer, and more."
        path="/"
      />
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <VzlaNavbar />

      <main id="main-content" className="page-shell" role="main" aria-label="Athlete cards and market data">
        <VzlaHero lastUpdated={lastUpdated} />
        <VzlaIndexCards athletes={athletes} byName={byName} byKey={byKey} indexHistory={indexHistory} />
        <Suspense fallback={<div className="min-h-[200px]" />}>
          <VzlaHowToMoney />
          <VzlaTopDeals />
          <VzlaBudgetBar
            onSuggest={runBudget}
            onClear={clearBudget}
            onCardTypeChange={(type) => setPriceMode(type)}
            result={budgetResult}
          />
          <VzlaSearchFilters
            filters={filters}
            updateFilter={updateFilter}
            sportOptions={sportOptions}
            totalCount={athletes.length}
            filteredCount={filteredAthletes.length}
            priceMode={priceMode}
            onPriceModeChange={setPriceMode}
          />
          <VzlaAthleteGrid
            athletes={budgetChosenIds.size > 0 ? filteredAthletes : paginatedAthletes}
            byName={byName}
            byKey={byKey}
            gradedByName={gradedByName}
            gradedByKey={gradedByKey}
            ebaySoldRaw={ebaySoldRaw}
            ebayGradedSoldRaw={ebayGradedSoldRaw}
            athleteHistory={athleteHistory}
            gemratePopMap={gemratePopMap}
            hasMore={budgetChosenIds.size > 0 ? false : hasMore}
            remainingCount={remainingCount}
            onLoadMore={loadMore}
            highlightedIds={budgetChosenIds}
            sort={sort}
            onSortChange={setSort}
            priceMode={priceMode}
          />
          <VzlaFooter />
        </Suspense>
      </main>

      <Suspense fallback={null}>
        <VzlaEbayFooter />
      </Suspense>
    </div>
  );
};

export default Index;
