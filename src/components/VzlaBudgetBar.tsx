import { useState } from "react";

const VzlaBudgetBar = () => {
  const [budget, setBudget] = useState("");
  const [cards, setCards] = useState("");
  const [result, setResult] = useState<string | null>(null);

  const handleSuggest = () => {
    if (!budget) {
      setResult("Please enter a budget amount.");
      return;
    }
    setResult(`Analyzing cards within $${budget} budget${cards ? ` for ${cards} cards` : ""}...`);
  };

  const handleClear = () => {
    setBudget("");
    setCards("");
    setResult(null);
  };

  return (
    <div className="glass-panel p-5 mb-4" role="region" aria-label="Budget suggestion tool">
      <label className="text-[10px] tracking-widest uppercase font-bold text-muted-foreground mb-3 block">
        💰 Budget Tool
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto_auto] gap-3 items-end">
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
            aria-describedby="budget-hint"
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
            placeholder="# of cards"
            value={cards}
            onChange={(e) => setCards(e.target.value)}
            className="w-full h-11 px-3.5 rounded-lg bg-secondary border border-border text-foreground text-sm outline-none transition-all placeholder:text-muted-foreground focus:border-primary/40 focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.08)]"
          />
        </div>
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
      {result && (
        <div id="budget-hint" className="mt-3 text-sm text-foreground/80 px-0.5" role="status" aria-live="polite">
          {result}
        </div>
      )}
    </div>
  );
};

export default VzlaBudgetBar;
