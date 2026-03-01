import { useState, useEffect, useRef } from "react";
import { KnapsackResult } from "@/lib/budget-knapsack";

interface VzlaBudgetBarProps {
  onSuggest: (budget: number, maxCards: number | null, flipOnly: boolean) => void;
  onClear: () => void;
  result: KnapsackResult | null;
}

const VzlaBudgetBar = ({ onSuggest, onClear, result }: VzlaBudgetBarProps) => {
  const [budget, setBudget] = useState("");
  const [cards, setCards] = useState("");
  const [flipOnly, setFlipOnly] = useState(false);

  const justSuggested = useRef(false);

  const handleSuggest = () => {
    const b = Number(budget);
    if (!Number.isFinite(b) || b <= 0) return;
    const c = cards ? Number(cards) : null;
    const maxCards = c && Number.isFinite(c) && c > 0 ? Math.floor(c) : null;
    justSuggested.current = true;
    onSuggest(b, maxCards, flipOnly);
  };

  // Auto-scroll to results on mobile after suggest
  useEffect(() => {
    if (result && justSuggested.current) {
      justSuggested.current = false;
      // Small delay to let the grid re-render
      setTimeout(() => {
        const target = document.querySelector('[role="toolbar"][aria-label="Sort controls"]');
        if (target) {
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 100);
    }
  }, [result]);

  const handleClear = () => {
    setBudget("");
    setCards("");
    setFlipOnly(false);
    onClear();
  };

  return (
    <div className="glass-panel p-5 mb-4" role="region" aria-label="Budget suggestion tool">
      <label className="text-[10px] tracking-widest uppercase font-bold text-muted-foreground mb-1 block">
        💰 Budget Optimizer
      </label>
      <p className="text-xs text-muted-foreground mb-3">
        Enter your budget and we'll find the best combination of cards to maximize value using market data.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto_auto_auto] gap-3 items-end">
        <div>
          <label htmlFor="budget-input" className="sr-only">Budget amount in USD</label>
          <input
            id="budget-input"
            type="number"
            min="1"
            step="1"
            placeholder="Budget (USD)"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            className="w-full h-11 px-3.5 rounded-lg bg-secondary border border-border text-foreground text-sm outline-none transition-all placeholder:text-muted-foreground focus:border-primary/40 focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.08)]"
          />
        </div>
        <div>
          <label htmlFor="cards-input" className="sr-only">Number of cards</label>
          <input
            id="cards-input"
            type="number"
            min="1"
            step="1"
            placeholder="Max # of cards"
            value={cards}
            onChange={(e) => setCards(e.target.value)}
            className="w-full h-11 px-3.5 rounded-lg bg-secondary border border-border text-foreground text-sm outline-none transition-all placeholder:text-muted-foreground focus:border-primary/40 focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.08)]"
          />
        </div>
        <button
          onClick={() => setFlipOnly((prev) => !prev)}
          className={`h-11 px-4 rounded-lg border text-xs font-bold cursor-pointer whitespace-nowrap transition-all flex items-center gap-1.5 ${
            flipOnly
              ? "bg-vzla-yellow/15 border-vzla-yellow/40 text-vzla-yellow"
              : "bg-secondary border-border text-muted-foreground hover:text-foreground"
          }`}
          aria-pressed={flipOnly}
          aria-label="Filter for flip potential cards only"
        >
          🔄 Flip Only
        </button>
        <button
          onClick={handleSuggest}
          className="h-11 px-6 rounded-lg cta-yellow text-sm font-bold cursor-pointer whitespace-nowrap"
          aria-label="Get budget suggestions"
        >
          Suggest
        </button>
        <button
          onClick={handleClear}
          className="h-11 px-5 rounded-lg border border-border bg-secondary text-muted-foreground text-sm font-semibold cursor-pointer hover:text-foreground transition-colors whitespace-nowrap"
          aria-label="Clear budget fields"
        >
          Clear
        </button>
      </div>

      {/* Results */}
      {result && (
        <div className="mt-3 px-1 text-sm" role="status" aria-live="polite">
          {result.chosen.length === 0 ? (
            <span className="text-muted-foreground">No picks found within this budget.</span>
          ) : (
            <span className="text-foreground/90">
              Showing <strong className="text-vzla-yellow">{result.chosen.length}</strong> card{result.chosen.length !== 1 ? "s" : ""}
              {result.maxCards && <> (target ≤ <strong>{result.maxCards}</strong>)</>}
              {" — "}Spent <strong className="text-vzla-yellow">USD ${(result.spentCents / 100).toFixed(2)}</strong> of USD ${(result.budgetCents / 100).toFixed(2)}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default VzlaBudgetBar;
