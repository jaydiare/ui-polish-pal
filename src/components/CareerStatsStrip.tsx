import { useLanguage } from "@/i18n/LanguageProvider";
import { useMlbCareerStats } from "@/hooks/useMlbCareerStats";
import { AlertTriangle, RefreshCw, Info } from "lucide-react";

interface CareerStatsStripProps {
  name: string;
  sport: string;
  enabled: boolean;
}

const HITTING_FIELDS: { key: string; label: string }[] = [
  { key: "gamesPlayed", label: "career.games" },
  { key: "hits", label: "career.hits" },
  { key: "homeRuns", label: "career.homeRuns" },
  { key: "rbi", label: "career.rbi" },
  { key: "avg", label: "career.avg" },
  { key: "ops", label: "career.ops" },
  { key: "stolenBases", label: "career.stolenBases" },
];

const PITCHING_FIELDS: { key: string; label: string }[] = [
  { key: "wins", label: "career.wins" },
  { key: "losses", label: "career.losses" },
  { key: "era", label: "career.era" },
  { key: "strikeOuts", label: "career.strikeOuts" },
  { key: "whip", label: "career.whip" },
  { key: "saves", label: "career.saves" },
  { key: "inningsPitched", label: "career.inningsPitched" },
];

const formatValue = (v: string | number | undefined) => {
  if (v == null || v === "") return "—";
  if (typeof v === "number") return v.toLocaleString();
  return v;
};

const CareerStatsStrip = ({ name, sport, enabled }: CareerStatsStripProps) => {
  const { t } = useLanguage();
  const { loading, data, error, retry } = useMlbCareerStats(name, sport, enabled);

  if (sport !== "Baseball") return null;

  if (loading) {
    return (
      <div
        className="rounded-xl border border-border/40 bg-secondary/30 p-3 animate-pulse"
        role="status"
        aria-label={t("career.loading")}
      >
        <div className="h-3 w-24 rounded bg-muted-foreground/15 mb-2.5" />
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i}>
              <div className="h-2 w-8 rounded bg-muted-foreground/10 mb-1.5" />
              <div className="h-3 w-10 rounded bg-muted-foreground/15" />
            </div>
          ))}
        </div>
        <span className="sr-only">{t("career.loading")}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 flex items-center gap-2.5"
        role="alert"
      >
        <AlertTriangle className="w-4 h-4 text-destructive shrink-0" aria-hidden="true" />
        <p className="text-xs text-muted-foreground flex-1">{t("career.error")}</p>
        <button
          type="button"
          onClick={retry}
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
        >
          <RefreshCw className="w-3 h-3" aria-hidden="true" />
          {t("career.retry")}
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-xl border border-border/40 bg-secondary/30 p-3 flex items-center gap-2.5">
        <Info className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden="true" />
        <p className="text-xs text-muted-foreground">{t("career.unavailable")}</p>
      </div>
    );
  }

  const fields = data.group === "pitching" ? PITCHING_FIELDS : HITTING_FIELDS;

  return (
    <div className="rounded-xl border border-border/40 bg-secondary/30 p-3">
      <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-2">
        {t("career.title")} ·{" "}
        {data.group === "pitching" ? t("career.pitching") : t("career.hitting")}
      </div>
      <div className="grid grid-cols-4 sm:grid-cols-7 gap-3">
        {fields.map((f) => (
          <div key={f.key}>
            <div className="text-[9px] uppercase tracking-wider text-muted-foreground">
              {t(f.label as never)}
            </div>
            <div className="text-sm font-display font-bold text-foreground">
              {formatValue(data.stat[f.key])}
            </div>
          </div>
        ))}
      </div>
      <div className="text-[9px] text-muted-foreground mt-2">{t("career.source")}</div>
    </div>
  );
};

export default CareerStatsStrip;
