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
    <div className="glass-panel p-4 mb-6">
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground font-semibold whitespace-nowrap">
          <span className="text-lg">💰</span>
          Budget Tool
        </div>
        <input
          type="number"
          min="1"
          step="1"
          placeholder="Budget (USD)"
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
          className="flex-1 h-10 px-3 rounded-lg glass-input text-foreground text-sm outline-none w-full sm:w-auto placeholder:text-muted-foreground"
        />
        <input
          type="number"
          min="1"
          step="1"
          placeholder="# of cards"
          value={cards}
          onChange={(e) => setCards(e.target.value)}
          className="flex-1 h-10 px-3 rounded-lg glass-input text-foreground text-sm outline-none w-full sm:w-auto placeholder:text-muted-foreground"
        />
        <div className="flex gap-2">
          <button
            onClick={handleSuggest}
            className="h-10 px-5 rounded-lg cta-yellow text-xs font-bold cursor-pointer"
          >
            Suggest
          </button>
          <button
            onClick={handleClear}
            className="h-10 px-4 rounded-lg border border-border bg-secondary text-muted-foreground text-xs font-semibold cursor-pointer hover:text-foreground transition-colors"
          >
            Clear
          </button>
        </div>
      </div>
      {result && (
        <div className="mt-3 text-sm text-foreground/80 px-1">
          {result}
        </div>
      )}
    </div>
  );
};

export default VzlaBudgetBar;
