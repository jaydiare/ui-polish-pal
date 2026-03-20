import { useState } from "react";
import { Filters } from "@/lib/vzla-helpers";
import { useIsMobile } from "@/hooks/use-mobile";
import { ChevronDown, SlidersHorizontal } from "lucide-react";

interface VzlaSearchFiltersProps {
  filters: Filters;
  updateFilter: (key: keyof Filters, value: string) => void;
  sportOptions: string[];
  totalCount: number;
  filteredCount: number;
  priceMode: "raw" | "graded" | "both";
  onPriceModeChange: (mode: "raw" | "graded" | "both") => void;
}

const DEFAULT_FILTERS: Filters = {
  search: "",
  category: "all",
  price: "all",
  stability: "all",
  daysListed: "all",
  signal: "all",
};

const VzlaSearchFilters = ({
  filters,
  updateFilter,
  sportOptions,
  totalCount,
  filteredCount,
  priceMode,
  onPriceModeChange,
}: VzlaSearchFiltersProps) => {
  const isMobile = useIsMobile();
  const [expanded, setExpanded] = useState(false);

  const hasActiveFilter =
    filters.search !== "" ||
    filters.category !== "all" ||
    filters.price !== "all" ||
    filters.stability !== "all" ||
    filters.daysListed !== "all";

  const activeCount = [
    filters.search !== "",
    filters.category !== "all",
    filters.price !== "all",
    filters.stability !== "all",
    filters.daysListed !== "all",
  ].filter(Boolean).length;

  const clearAll = () => {
    for (const [k, v] of Object.entries(DEFAULT_FILTERS)) {
      updateFilter(k as keyof Filters, v as any);
    }
  };

  const priceModeToggle = (
    <div className="inline-flex items-center rounded-full border border-border/50 bg-card/80 backdrop-blur-sm p-0.5">
      <button
        onClick={() => onPriceModeChange("raw")}
        className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wide transition-all ${priceMode === "raw" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}
      >
        🃏 Raw
      </button>
      <button
        onClick={() => onPriceModeChange("graded")}
        className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wide transition-all ${priceMode === "graded" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}
      >
        🏅 Graded
      </button>
      <button
        onClick={() => onPriceModeChange("both")}
        className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wide transition-all ${priceMode === "both" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}
      >
        ⚖️ Both
      </button>
    </div>
  );

  return (
    <div className="glass-panel p-5 mb-6 sticky top-[64px] z-40 backdrop-blur-xl" role="search" aria-label="Filter athletes">
      {/* Compact summary bar on mobile */}
      {isMobile ? (
        <>
          <div className="flex items-center justify-between">
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-2 text-sm font-bold text-foreground bg-transparent border-none cursor-pointer p-0"
              aria-expanded={expanded}
              aria-controls="filter-panel"
            >
              <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
              Filters
              {activeCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] font-bold">
                  {activeCount}
                </span>
              )}
              <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} />
            </button>
            <div className="flex items-center gap-2">
              {hasActiveFilter && (
                <span className="text-[10px] text-muted-foreground">{filteredCount}/{totalCount}</span>
              )}
              {priceModeToggle}
            </div>
          </div>

          {expanded && (
            <div id="filter-panel" className="mt-4 space-y-3">
              {/* Search */}
              <div>
                <label htmlFor="player-search" className="text-[10px] tracking-widest uppercase font-bold text-muted-foreground mb-1.5 block">
                  Search
                </label>
                <div className="relative flex items-center gap-2.5 h-11 w-full px-3.5 rounded-lg bg-secondary border border-border transition-all focus-within:border-primary/40 focus-within:shadow-[0_0_0_3px_hsl(var(--primary)/0.08)]">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="text-muted-foreground shrink-0" aria-hidden="true">
                    <path d="M21 21l-4.3-4.3m1.8-5.2a7 7 0 11-14 0 7 7 0 0114 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  <input
                    id="player-search"
                    className="flex-1 h-full border-0 outline-none bg-transparent text-foreground text-sm placeholder:text-muted-foreground"
                    placeholder="Search players..."
                    type="search"
                    autoComplete="off"
                    spellCheck={false}
                    value={filters.search}
                    onChange={(e) => updateFilter("search", e.target.value)}
                  />
                  {filters.search && (
                    <button
                      className="w-6 h-6 rounded-md bg-muted text-muted-foreground flex items-center justify-center cursor-pointer hover:text-foreground transition-colors"
                      onClick={() => updateFilter("search", "")}
                      aria-label="Clear search"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FilterSelect
                  label="Category"
                  id="filter-category"
                  value={filters.category}
                  onChange={(v) => updateFilter("category", v)}
                  options={[
                    { value: "all", label: "All" },
                    ...sportOptions.map((s) => ({ value: s, label: s })),
                    { value: "Other", label: "Other" },
                  ]}
                />
                <FilterSelect
                  label="Price"
                  id="filter-price"
                  value={filters.price}
                  onChange={(v) => updateFilter("price", v)}
                  options={[
                    { value: "all", label: "All" },
                    { value: "low", label: "Low → High" },
                    { value: "high", label: "High → Low" },
                    { value: "none", label: "No Price" },
                  ]}
                />
                <FilterSelect
                  label="Stability"
                  id="filter-stability"
                  value={filters.stability}
                  onChange={(v) => updateFilter("stability", v)}
                  options={[
                    { value: "all", label: "All" },
                    { value: "stable", label: "Stable" },
                    { value: "active", label: "Active" },
                    { value: "volatile", label: "Volatile" },
                    { value: "highly_unstable", label: "Unstable" },
                    { value: "none", label: "No Score" },
                  ]}
                />
                <FilterSelect
                  label="Avg Days Listed"
                  id="filter-days-listed"
                  value={filters.daysListed}
                  onChange={(v) => updateFilter("daysListed", v)}
                  options={[
                    { value: "all", label: "All" },
                    { value: "low", label: "Low (< 180d)" },
                    { value: "medium", label: "Mid (180–540d)" },
                    { value: "high", label: "High (> 540d)" },
                    { value: "none", label: "No Data" },
                  ]}
                />
              </div>

              {hasActiveFilter && (
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-muted-foreground">
                    Showing {filteredCount} of {totalCount} athletes
                  </span>
                  <button
                    onClick={clearAll}
                    className="text-[11px] font-semibold text-vzla-yellow hover:text-vzla-yellow/80 transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <span>✕</span> Clear all
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        /* Desktop: full layout as before */
        <>
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] tracking-widest uppercase font-bold text-muted-foreground">
              Filtering by
            </span>
            {priceModeToggle}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[minmax(200px,1.2fr)_repeat(4,minmax(120px,1fr))] gap-4 items-end">
            {/* Search */}
            <div>
              <label htmlFor="player-search-desktop" className="text-[10px] tracking-widest uppercase font-bold text-muted-foreground mb-1.5 block">
                Search
              </label>
              <div className="relative flex items-center gap-2.5 h-11 w-full px-3.5 rounded-lg bg-secondary border border-border transition-all focus-within:border-primary/40 focus-within:shadow-[0_0_0_3px_hsl(var(--primary)/0.08)]">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="text-muted-foreground shrink-0" aria-hidden="true">
                  <path d="M21 21l-4.3-4.3m1.8-5.2a7 7 0 11-14 0 7 7 0 0114 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <input
                  id="player-search-desktop"
                  className="flex-1 h-full border-0 outline-none bg-transparent text-foreground text-sm placeholder:text-muted-foreground"
                  placeholder="Search players..."
                  type="search"
                  autoComplete="off"
                  spellCheck={false}
                  value={filters.search}
                  onChange={(e) => updateFilter("search", e.target.value)}
                />
                {filters.search && (
                  <button
                    className="w-6 h-6 rounded-md bg-muted text-muted-foreground flex items-center justify-center cursor-pointer hover:text-foreground transition-colors"
                    onClick={() => updateFilter("search", "")}
                    aria-label="Clear search"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>

            <FilterSelect
              label="Category"
              id="filter-category-desktop"
              value={filters.category}
              onChange={(v) => updateFilter("category", v)}
              options={[
                { value: "all", label: "All" },
                ...sportOptions.map((s) => ({ value: s, label: s })),
                { value: "Other", label: "Other" },
              ]}
            />
            <FilterSelect
              label="Price"
              id="filter-price-desktop"
              value={filters.price}
              onChange={(v) => updateFilter("price", v)}
              options={[
                { value: "all", label: "All" },
                { value: "low", label: "Low → High" },
                { value: "high", label: "High → Low" },
                { value: "none", label: "No Price" },
              ]}
            />
            <FilterSelect
              label="Stability"
              id="filter-stability-desktop"
              value={filters.stability}
              onChange={(v) => updateFilter("stability", v)}
              options={[
                { value: "all", label: "All" },
                { value: "stable", label: "Stable" },
                { value: "active", label: "Active" },
                { value: "volatile", label: "Volatile" },
                { value: "highly_unstable", label: "Unstable" },
                { value: "none", label: "No Score" },
              ]}
            />
            <FilterSelect
              label="Avg Days Listed"
              id="filter-days-listed-desktop"
              value={filters.daysListed}
              onChange={(v) => updateFilter("daysListed", v)}
              options={[
                { value: "all", label: "All" },
                { value: "low", label: "Low (< 180d)" },
                { value: "medium", label: "Mid (180–540d)" },
                { value: "high", label: "High (> 540d)" },
                { value: "none", label: "No Data" },
              ]}
            />
          </div>

          {hasActiveFilter && (
            <div className="mt-3 flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">
                Showing {filteredCount} of {totalCount} athletes
              </span>
              <button
                onClick={clearAll}
                className="text-[11px] font-semibold text-vzla-yellow hover:text-vzla-yellow/80 transition-colors cursor-pointer flex items-center gap-1"
              >
                <span>✕</span> Clear all filters
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

interface FilterSelectProps {
  label: string;
  id: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}

const FilterSelect = ({ label, id, value, onChange, options }: FilterSelectProps) => (
  <div>
    <label htmlFor={id} className="text-[10px] tracking-widest uppercase font-bold text-muted-foreground mb-1.5 block">
      {label}
    </label>
    <select
      id={id}
      className="w-full h-11 px-3.5 pr-9 rounded-lg bg-secondary border border-border text-foreground text-sm outline-none appearance-none cursor-pointer transition-all focus:border-primary/40 focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.08)] bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222.5%22%3E%3Cpath%20d%3D%22M6%209l6%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px] bg-[position:calc(100%-12px)_center] bg-no-repeat"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  </div>
);

export default VzlaSearchFilters;
