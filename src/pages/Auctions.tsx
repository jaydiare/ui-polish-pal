import { useEffect, useMemo, useState } from "react";
import VzlaNavbar from "@/components/VzlaNavbar";
import VzlaFooter from "@/components/VzlaFooter";
import SEOHead from "@/components/SEOHead";
import { useLanguage } from "@/i18n/LanguageProvider";

type Auction = {
  itemId: string; athlete: string; sport: string | null; title: string; image: string | null;
  currentBid: number | null; currency: string; bidCount: number | null; endDate: string; url: string;
};
type Payload = { _meta?: { generatedAt?: string | null }; auctions?: Auction[] };

const SOURCES = [
  "https://raw.githubusercontent.com/jaydiare/ui-polish-pal/main/data/ebay-auctions.json",
  "/data/ebay-auctions.json",
];

function formatLeft(ms: number, es: boolean) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  if (d > 0) return `${d}${es ? "d" : "d"} ${h}h ${m}m`;
  return `${h}h ${String(m).padStart(2, "0")}m ${String(sec).padStart(2, "0")}s`;
}

export default function Auctions() {
  const { t, lang } = useLanguage();
  const es = lang === "es";
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    let alive = true;
    (async () => {
      for (const src of SOURCES) {
        try {
          const r = await fetch(src, { cache: "no-store" });
          if (!r.ok) continue;
          const j = (await r.json()) as Payload;
          if (alive) setData(j);
          return;
        } catch { /* try next */ }
      }
      if (alive) setError(true);
    })();
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  const live = useMemo(
    () => (data?.auctions || []).filter((a) => Date.parse(a.endDate) > now).sort((a, b) => Date.parse(a.endDate) - Date.parse(b.endDate)),
    [data, now],
  );
  const updated = data?._meta?.generatedAt
    ? new Date(data._meta.generatedAt).toLocaleString(es ? "es-VE" : "en-US", { dateStyle: "medium", timeStyle: "short" })
    : null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEOHead
        title="Venezuelan Athlete eBay Auctions Ending Soon | VZLA Sports Elite"
        description="Live eBay auctions for the top Venezuelan athletes' sports cards, sorted by ending soonest with countdowns."
        path="/auctions"
      />
      <VzlaNavbar />
      <main className="container mx-auto px-4 py-10">
        <header className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-flag-gradient">{t("auctions.title")}</h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-2xl text-pretty">{t("auctions.subtitle")}</p>
          <p className="text-[11px] text-muted-foreground mt-2">{t("auctions.updated")} {updated ?? "—"}</p>
        </header>

        {!data && !error && <p className="text-muted-foreground">{t("auctions.loading")}</p>}
        {(error || (data && live.length === 0)) && <p className="text-muted-foreground">{t("auctions.empty")}</p>}

        <ul className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {live.map((a) => {
            const left = Date.parse(a.endDate) - now;
            const urgent = left < 60 * 60 * 1000;
            return (
              <li key={a.itemId} className="glass-panel rounded-xl overflow-hidden border border-border flex flex-col">
                <a href={a.url} target="_blank" rel="noopener noreferrer sponsored" className="flex flex-col h-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
                  <div className="aspect-square bg-muted/30 flex items-center justify-center">
                    {a.image ? <img src={a.image} alt={a.title} loading="lazy" className="h-full w-full object-contain" /> : null}
                  </div>
                  <div className="p-3 flex flex-col gap-1 flex-1">
                    <span className="text-xs font-semibold text-primary">{a.athlete}</span>
                    <span className="text-sm line-clamp-2 text-pretty">{a.title}</span>
                    <div className="mt-auto pt-2 flex items-end justify-between gap-2">
                      <div>
                        <div className="text-[11px] text-muted-foreground">{t("auctions.bid")}</div>
                        <div className="font-bold">{a.currentBid != null ? `${a.currency} $${a.currentBid.toFixed(2)}` : "—"}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[11px] text-muted-foreground">{t("auctions.endsIn")}</div>
                        <div className={`font-mono text-sm ${urgent ? "text-destructive font-bold" : ""}`} aria-live="off">{formatLeft(left, es)}</div>
                      </div>
                    </div>
                  </div>
                </a>
              </li>
            );
          })}
        </ul>
      </main>
      <VzlaFooter />
    </div>
  );
}
