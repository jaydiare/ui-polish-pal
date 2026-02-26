import { Filters } from "@/lib/vzla-helpers";

interface VzlaSearchFiltersProps {
  filters: Filters;
  updateFilter: (key: keyof Filters, value: string) => void;
  sportOptions: string[];
  leagueOptions: string[];
  totalCount: number;
  filteredCount: number;
}

const VzlaSearchFilters = ({
  filters,
  updateFilter,
  sportOptions,
  leagueOptions,
  totalCount,
  filteredCount,
}: VzlaSearchFiltersProps) => {
  return (
    <div className="glass-panel p-5 mb-6" role="search" aria-label="Filter athletes">
      {/* Row: Search + Filters aligned on same baseline */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(200px,1.2fr)_repeat(4,minmax(120px,1fr))] gap-4 items-end">
        {/* Search */}
        <div>
          <div className="flex items-baseline justify-between mb-1.5">
            <label htmlFor="player-search" className="text-[10px] tracking-widest uppercase font-bold text-muted-foreground">
              Search
            </label>
            <span className="text-[11px] text-muted-foreground" aria-live="polite">
              Showing <span className="text-foreground font-semibold">{filteredCount}</span> of {totalCount} players
            </span>
          </div>
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

        {/* Filters — same row, aligned to bottom of search input */}
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
          label="League"
          id="filter-league"
          value={filters.league}
          onChange={(v) => updateFilter("league", v)}
          options={[
            { value: "all", label: "All" },
            ...leagueOptions.map((l) => ({ value: l, label: l })),
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
          label="Market Stability"
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
      </div>
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
