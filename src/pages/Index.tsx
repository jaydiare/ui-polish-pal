import VzlaNavbar from "@/components/VzlaNavbar";
import VzlaHero from "@/components/VzlaHero";
import VzlaIndexCards from "@/components/VzlaIndexCards";
import VzlaBudgetBar from "@/components/VzlaBudgetBar";
import VzlaSearchFilters from "@/components/VzlaSearchFilters";
import VzlaAthleteGrid from "@/components/VzlaAthleteGrid";
import VzlaFooter from "@/components/VzlaFooter";
import VzlaSideBanner from "@/components/VzlaSideBanner";
import VzlaEbayFooter from "@/components/VzlaEbayFooter";
import { useAthleteData } from "@/hooks/useAthleteData";

const Index = () => {
  const {
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
  } = useAthleteData();

  return (
    <div id="top" className="min-h-screen">
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <VzlaNavbar />

      <div className="page-shell">
        {/* Main content */}
        <main id="main-content" className="w-full px-8 pb-8 pt-0" role="main" aria-label="Athlete cards and market data">
          <VzlaHero lastUpdated={lastUpdated} />
          <VzlaIndexCards athletes={athletes} byName={byName} byKey={byKey} indexHistory={ebayAvgRaw?._meta?.indexHistory} />
          <VzlaBudgetBar
            onSuggest={runBudget}
            onClear={clearBudget}
            result={budgetResult}
          />
          <VzlaSearchFilters
            filters={filters}
            updateFilter={updateFilter}
            sportOptions={sportOptions}
            leagueOptions={leagueOptions}
            totalCount={athletes.length}
            filteredCount={filteredAthletes.length}
          />
          <VzlaAthleteGrid
            athletes={budgetChosenIds.size > 0 ? filteredAthletes : paginatedAthletes}
            byName={byName}
            byKey={byKey}
            hasMore={budgetChosenIds.size > 0 ? false : hasMore}
            remainingCount={remainingCount}
            onLoadMore={loadMore}
            highlightedIds={budgetChosenIds}
          />
          <VzlaFooter />
        </main>

        {/* Right sidebar */}
        <VzlaSideBanner />
      </div>

      <VzlaEbayFooter />
    </div>
  );
};

export default Index;
