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
    <div className="glass-panel p-5 mb-6">
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-end">
        {/* Search */}
        <div className="flex-1 w-full lg:max-w-sm">
          <label className="text-[10px] tracking-widest uppercase font-bold text-muted-foreground mb-1.5 block">
            Search
          </label>
          <div className="relative flex items-center gap-2 h-10 w-full px-3 rounded-lg glass-input">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="text-muted-foreground shrink-0">
              <path d="M21 21l-4.3-4.3m1.8-5.2a7 7 0 11-14 0 7 7 0 0114 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <input
              className="flex-1 h-full border-0 outline-none bg-transparent text-foreground text-sm placeholder:text-muted-foreground"
              placeholder="Search players..."
              type="text"
              autoComplete="off"
              spellCheck={false}
              value={filters.search}
              onChange={(e) => updateFilter("search", e.target.value)}
            />
            {filters.search && (
              <button
                className="w-6 h-6 rounded-md bg-secondary border border-border text-muted-foreground flex items-center justify-center cursor-pointer hover:text-foreground transition-colors"
                onClick={() => updateFilter("search", "")}
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>
          <div className="mt-1.5 text-[11px] text-muted-foreground">
            Showing <span className="text-foreground font-medium">{filteredCount}</span> of {totalCount} players
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-3 items-end flex-wrap lg:flex-nowrap">
          <FilterSelect
            label="Category"
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
            value={filters.league}
            onChange={(v) => updateFilter("league", v)}
            options={[
              { value: "all", label: "All" },
              ...leagueOptions.map((l) => ({ value: l, label: l })),
            ]}
          />
          <FilterSelect
            label="Price"
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
    </div>
  );
};

interface FilterSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}

const FilterSelect = ({ label, value, onChange, options }: FilterSelectProps) => (
  <label className="flex flex-col gap-1.5 min-w-[140px]">
    <span className="text-[10px] tracking-widest uppercase font-bold text-muted-foreground">
      {label}
    </span>
    <select
      className="h-10 px-3 pr-8 rounded-lg glass-input text-foreground text-sm outline-none appearance-none cursor-pointer bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222.5%22%3E%3Cpath%20d%3D%22M6%209l6%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px] bg-[position:calc(100%-10px)_center] bg-no-repeat"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  </label>
);

export default VzlaSearchFilters;
