const odds = [
  { team: "USA", pct: 51, color: "hsl(217, 91%, 60%)" },
  { team: "Dominican Republic", pct: 22, color: "hsl(265, 70%, 55%)" },
  { team: "Japan", pct: 22, color: "hsl(45, 93%, 55%)" },
  { team: "Venezuela", pct: 4.5, color: "hsl(16, 90%, 55%)" },
];

const WbcPolymarketOdds = () => (
  <section className="mb-10 glass-panel p-6 rounded-xl">
    <h2 className="text-lg font-display font-bold text-flag-gradient mb-1">
      WBC 2026 Winner Forecast
    </h2>
    <p className="text-xs text-muted-foreground mb-5">
      Betting odds via{" "}
      <a
        href="https://polymarket.com/event/wbc-winner-2026#1uLkEBvE"
        target="_blank"
        rel="noopener noreferrer"
        className="underline decoration-dotted underline-offset-2 hover:text-primary transition-colors"
      >
        Polymarket
      </a>{" "}
      · Updated Mar 6, 2026
    </p>

    <div className="space-y-3">
      {odds.map((o) => (
        <div key={o.team} className="flex items-center gap-3">
          <span className="text-sm text-foreground font-medium w-40 shrink-0 truncate">
            {o.team}
          </span>
          <div className="flex-1 h-7 rounded-full bg-secondary/60 overflow-hidden">
            <div
              className="h-full rounded-full flex items-center pl-3 text-xs font-bold text-white transition-all duration-700"
              style={{ width: `${Math.max(o.pct, 8)}%`, backgroundColor: o.color }}
            >
              {o.pct}%
            </div>
          </div>
        </div>
      ))}
    </div>

    <p className="text-[11px] text-muted-foreground mt-4 leading-relaxed">
      Venezuela enters as a dark horse at <strong className="text-foreground">4.5%</strong>, but
      with Ronald Acuña Jr., Salvador Pérez, and two ace-caliber starters, the upside is real.
      A deep tournament run could send card prices soaring.
    </p>
  </section>
);

export default WbcPolymarketOdds;
