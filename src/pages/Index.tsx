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
      <VzlaNavbar />

      <div className="page-shell">
        {/* Left sidebar */}
        <VzlaSideBanner />

        {/* Main content */}
        <main className="w-full px-8 pb-8 pt-0">
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
            athletes={paginatedAthletes}
            byName={byName}
            byKey={byKey}
            hasMore={hasMore}
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
