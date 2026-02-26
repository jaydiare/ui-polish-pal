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
    <div className="flex justify-center mb-4">
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto] gap-4 items-start">
        {/* Search */}
        <div className="w-full">
          <div className="relative flex items-center gap-2.5 h-11 w-full px-3 rounded-[14px] glass-input transition-all focus-within:border-foreground/[0.18] focus-within:shadow-[0_0_0_3px_rgba(242,242,13,0.12),0_10px_30px_rgba(0,0,0,0.35)]">
            <span className="text-foreground/55 inline-flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M21 21l-4.3-4.3m1.8-5.2a7 7 0 11-14 0 7 7 0 0114 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </span>
            <input
              className="flex-1 h-full border-0 outline-none bg-transparent text-foreground/90 text-[13px] tracking-[0.2px] placeholder:text-foreground/35"
              placeholder="Search players..."
              type="text"
              autoComplete="off"
              spellCheck={false}
              value={filters.search}
              onChange={(e) => updateFilter("search", e.target.value)}
            />
            {filters.search && (
              <button
                className="h-[30px] w-[30px] rounded-[10px] border border-foreground/10 bg-foreground/[0.06] text-foreground/75 flex items-center justify-center cursor-pointer hover:bg-foreground/10 hover:text-foreground/90 active:translate-y-px transition-all"
                onClick={() => updateFilter("search", "")}
                aria-label="Clear search"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>
          <div className="mt-1.5 text-[11px] text-foreground/45">
            Showing <span className="text-foreground/70">{filteredCount}</span> of <span className="text-foreground/70">{totalCount}</span> players
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-3.5 items-start justify-end flex-wrap lg:flex-nowrap" aria-label="Filters">
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
              { value: "low", label: "Low" },
              { value: "high", label: "High" },
              { value: "none", label: "None" },
            ]}
          />
          <FilterSelect
            label="Market Stability"
            value={filters.stability}
            onChange={(v) => updateFilter("stability", v)}
            options={[
              { value: "all", label: "All" },
              { value: "stable", label: "Stable (0–10%)" },
              { value: "active", label: "Active (10–20%)" },
              { value: "volatile", label: "Volatile (20–35%)" },
              { value: "highly_unstable", label: "Highly Unstable (35%+)" },
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
  <label className="flex flex-col gap-2 min-w-[180px] lg:min-w-[220px] flex-1 lg:flex-initial">
    <span className="h-3.5 leading-[14px] m-0 pl-1.5 text-[10px] tracking-[0.18em] uppercase font-black text-foreground/55">
      {label}
    </span>
    <select
      className="h-11 px-3.5 pr-10 rounded-[14px] glass-input text-foreground/90 text-[13px] outline-none appearance-none cursor-pointer transition-all focus:border-foreground/[0.18] focus:shadow-[0_0_0_3px_rgba(242,242,13,0.12),0_10px_30px_rgba(0,0,0,0.28)]"
      style={{
        backgroundImage: "linear-gradient(45deg, transparent 50%, rgba(255,255,255,.6) 50%), linear-gradient(135deg, rgba(255,255,255,.6) 50%, transparent 50%)",
        backgroundPosition: "calc(100% - 18px) 18px, calc(100% - 13px) 18px",
        backgroundSize: "5px 5px, 5px 5px",
        backgroundRepeat: "no-repeat",
      }}
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
