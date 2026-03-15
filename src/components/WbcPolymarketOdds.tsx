import { useQuery } from "@tanstack/react-query";

const TEAM_COLORS: Record<string, string> = {
  "USA": "hsl(217, 91%, 60%)",
  "Dominican Republic": "hsl(265, 70%, 55%)",
  "Japan": "hsl(45, 93%, 55%)",
  "Venezuela": "hsl(16, 90%, 55%)",
  "Mexico": "hsl(145, 63%, 42%)",
  "Cuba": "hsl(0, 72%, 50%)",
  "Puerto Rico": "hsl(210, 70%, 50%)",
  "Korea": "hsl(350, 65%, 50%)",
};

const FALLBACK_ODDS = [
  { team: "Dominican Republic", pct: 38, color: "hsl(265, 70%, 55%)" },
  { team: "USA", pct: 25, color: "hsl(217, 91%, 60%)" },
  { team: "Venezuela", pct: 16, color: "hsl(16, 90%, 55%)" },
  { team: "Japan", pct: 10, color: "hsl(45, 93%, 55%)" },
  { team: "Italy", pct: 9, color: "hsl(145, 63%, 42%)" },
];

type MarketOutcome = {
  team: string;
  pct: number;
  color: string;
};

async function fetchPolymarketOdds(): Promise<MarketOutcome[]> {
  const res = await fetch(
    "https://gamma-api.polymarket.com/events?slug=wbc-winner-2026"
  );
  if (!res.ok) throw new Error("Failed to fetch Polymarket data");

  const events = await res.json();
  const event = Array.isArray(events) ? events[0] : events;

  if (!event?.markets?.length) throw new Error("No markets found");

  const outcomes: MarketOutcome[] = [];

  for (const market of event.markets) {
    const name = market.groupItemTitle || market.question || "";
    const price = parseFloat(market.lastTradePrice ?? market.bestAsk ?? "0");
    const pct = Math.round(price * 1000) / 10; // e.g. 0.51 → 51.0

    if (pct > 0) {
      outcomes.push({
        team: name,
        pct,
        color: TEAM_COLORS[name] || "hsl(200, 50%, 50%)",
      });
    }
  }

  outcomes.sort((a, b) => b.pct - a.pct);
  return outcomes.slice(0, 6);
}

const WbcPolymarketOdds = () => {
  const { data: odds, dataUpdatedAt } = useQuery({
    queryKey: ["polymarket-wbc-2026"],
    queryFn: fetchPolymarketOdds,
    staleTime: 4 * 60 * 60 * 1000, // 4 hours
    refetchInterval: 4 * 60 * 60 * 1000,
    placeholderData: FALLBACK_ODDS,
    retry: 2,
  });

  const displayOdds = odds ?? FALLBACK_ODDS;
  const updatedLabel = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "Mar 6, 2026";

  return (
    <section className="mb-10 glass-panel p-6 rounded-xl">
      <h2 className="text-lg font-display font-bold text-flag-gradient mb-1">
        WBC 2026 Winner Forecast
      </h2>
      <p className="text-xs text-muted-foreground mb-5">
        Live odds via{" "}
        <a
          href="https://polymarket.com/event/wbc-winner-2026#1uLkEBvE"
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-dotted underline-offset-2 hover:text-primary transition-colors"
        >
          Polymarket
        </a>{" "}
        · Updated {updatedLabel}
      </p>

      <div className="space-y-3">
        {displayOdds.map((o) => (
          <div key={o.team} className="flex items-center gap-3">
            <span className="text-sm text-foreground font-medium w-40 shrink-0 truncate">
              {o.team}
            </span>
            <div className="flex-1 h-7 rounded-full bg-secondary/60 overflow-hidden">
              <div
                className="h-full rounded-full flex items-center pl-3 text-xs font-bold text-white transition-all duration-700"
                style={{
                  width: `${Math.max(o.pct, 8)}%`,
                  backgroundColor: o.color,
                }}
              >
                {o.pct}%
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className="text-[11px] text-muted-foreground mt-4 leading-relaxed">
        Venezuela enters as a dark horse, but with Ronald Acuña Jr., Salvador
        Pérez, and two ace-caliber starters, the upside is real. A deep
        tournament run could send card prices soaring.
      </p>
    </section>
  );
};

export default WbcPolymarketOdds;
