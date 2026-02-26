import { useState } from "react";

const VzlaBudgetBar = () => {
  const [budget, setBudget] = useState("");
  const [cards, setCards] = useState("");
  const [result, setResult] = useState<string | null>(null);

  const handleSuggest = () => {
    // Budget suggestion placeholder - requires budget-knapsack logic
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
    <div className="grid grid-cols-1 sm:grid-cols-[minmax(180px,1fr)_minmax(180px,1fr)_auto_auto] items-center gap-3 my-3.5 mb-[22px]">
      <input
        type="number"
        min="1"
        step="1"
        placeholder="Optional budget e.g. 250"
        value={budget}
        onChange={(e) => setBudget(e.target.value)}
        className="w-full h-11 px-3.5 rounded-full border border-foreground/10 bg-[rgba(0,0,0,0.25)] text-foreground/90 outline-none backdrop-blur-[10px] placeholder:text-foreground/45"
      />
      <input
        type="number"
        min="1"
        step="1"
        placeholder="Optional # of cards"
        value={cards}
        onChange={(e) => setCards(e.target.value)}
        className="w-full h-11 px-3.5 rounded-full border border-foreground/10 bg-[rgba(0,0,0,0.25)] text-foreground/90 outline-none backdrop-blur-[10px] placeholder:text-foreground/45"
      />
      <button
        onClick={handleSuggest}
        className="h-11 px-3.5 rounded-full border border-vzla-yellow/25 bg-vzla-yellow/[0.14] text-foreground/95 cursor-pointer backdrop-blur-[10px] transition-all hover:bg-foreground/10 hover:border-foreground/[0.16] active:translate-y-px whitespace-nowrap"
      >
        Suggest
      </button>
      <button
        onClick={handleClear}
        className="h-11 px-3.5 rounded-full border border-foreground/10 bg-foreground/[0.06] text-foreground/[0.88] cursor-pointer backdrop-blur-[10px] transition-all hover:bg-foreground/10 hover:border-foreground/[0.16] active:translate-y-px whitespace-nowrap"
      >
        Clear
      </button>
      {result && (
        <div className="col-span-full mt-2.5 text-sm opacity-90">
          {result}
        </div>
      )}
    </div>
  );
};

export default VzlaBudgetBar;
