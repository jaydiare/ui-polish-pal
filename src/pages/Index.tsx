import VzlaNavbar from "@/components/VzlaNavbar";
import VzlaHero from "@/components/VzlaHero";
import VzlaIndexCards from "@/components/VzlaIndexCards";
import VzlaHowToMoney from "@/components/VzlaHowToMoney";
import VzlaTopDeals from "@/components/VzlaTopDeals";
import VzlaBudgetBar from "@/components/VzlaBudgetBar";
import VzlaSearchFilters from "@/components/VzlaSearchFilters";
import VzlaAthleteGrid from "@/components/VzlaAthleteGrid";
import VzlaFooter from "@/components/VzlaFooter";
import VzlaEbayFooter from "@/components/VzlaEbayFooter";
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
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <VzlaNavbar />

      <main id="main-content" className="page-shell" role="main" aria-label="Athlete cards and market data">
        <VzlaHero lastUpdated={lastUpdated} />
        <VzlaIndexCards athletes={athletes} byName={byName} byKey={byKey} indexHistory={ebayAvgRaw?._meta?.indexHistory} />
        <VzlaHowToMoney />
        <VzlaTopDeals />
        <VzlaBudgetBar
          onSuggest={runBudget}
          onClear={clearBudget}
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
          hasMore={budgetChosenIds.size > 0 ? false : hasMore}
          remainingCount={remainingCount}
          onLoadMore={loadMore}
          highlightedIds={budgetChosenIds}
          sort={sort}
          onSortChange={setSort}
          priceMode={priceMode}
        />
        <VzlaFooter />
      </main>

      <VzlaEbayFooter />
    </div>
  );
};

export default Index;
