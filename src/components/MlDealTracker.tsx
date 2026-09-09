import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
} from "recharts";
import { useAthleteMlScoreHistory } from "@/hooks/useAthleteMlScores";
import { athleteDataRaw } from "@/data/athletes";
import { buildEbaySearchUrl } from "@/lib/vzla-helpers";
import { useLanguage } from "@/i18n/LanguageProvider";

const TOP_N = 10;

const CLUSTER_COLOR: Record<string, string> = {
  stable: "hsl(160 84% 45%)",
  momentum: "hsl(199 89% 55%)",
  volatile: "hsl(350 84% 60%)",
};

const CLUSTER_LABEL_KEY = {
  stable: "ml.volatilityStable",
  momentum: "ml.volatilityMomentum",
  volatile: "ml.volatilityVolatile",
} as const;

interface Point {
  name: string;
  sport: string;
  date: string;
  deal: number;
  prob: number;
  cluster: string;
}

interface Pinned extends Point {
  cx: number;
  cy: number;
}

const PinnedCard = ({ data, onClose, t }: { data: Pinned; onClose: () => void; t: (k: any) => string }) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute z-50 rounded-xl border border-border/50 bg-background/95 backdrop-blur-lg p-3 text-xs shadow-2xl"
      style={{ left: Math.min(data.cx + 12, 220), top: Math.max(data.cy - 10, 0), pointerEvents: "auto", minWidth: 170 }}
    >
      <a
        href={buildEbaySearchUrl(data.name, data.sport)}
        target="_blank"
        rel="noopener noreferrer"
        className="font-display font-bold text-foreground hover:text-primary transition-colors underline decoration-dotted underline-offset-2"
      >
        {data.name} ↗
      </a>
      <div className="text-muted-foreground text-[10px] mb-1.5">{data.date}</div>
      <div className="flex flex-col gap-0.5">
        <span className="text-muted-foreground">
          {t("ml.dealScore")}: <strong className="text-foreground">{Math.round(data.deal)}</strong>
        </span>
        <span className="text-muted-foreground">
          {t("mlTracker.upside")}: <strong className="text-foreground">{Math.round(data.prob * 100)}%</strong>
        </span>
        <span className="text-muted-foreground">
          {t("mlTracker.group")}:{" "}
          <strong style={{ color: CLUSTER_COLOR[data.cluster] }}>
            {t(CLUSTER_LABEL_KEY[data.cluster as keyof typeof CLUSTER_LABEL_KEY] ?? "ml.volatilityStable")}
          </strong>
        </span>
      </div>
      <div className="text-[9px] text-muted-foreground/60 mt-1.5">{t("mlTracker.tapName")}</div>
    </div>
  );
};

const MlDealTracker = () => {
  const { t } = useLanguage();
  const { history, dates, loading } = useAthleteMlScoreHistory();
  const [pinned, setPinned] = useState<Pinned | null>(null);

  const sportByName = useMemo(() => {
    const map: Record<string, string> = {};
    for (const a of athleteDataRaw as { name: string; sport: string }[]) {
      if (a?.name && !map[a.name]) map[a.name] = a.sport;
    }
    return map;
  }, []);

  // Latest run only: top N players by Deal Score, ranked low to high for display
  const latestDate = dates.length > 0 ? dates[dates.length - 1] : null;

  const points = useMemo<Point[]>(() => {
    if (!latestDate) return [];
    const latest = history[latestDate] || {};
    return Object.entries(latest)
      .filter(([, rec]) => !!rec)
      .sort((a, b) => (b[1]?.deal_score ?? 0) - (a[1]?.deal_score ?? 0))
      .slice(0, TOP_N)
      .map(([name, rec]) => ({
        name,
        sport: sportByName[name] || "Baseball",
        date: latestDate,
        deal: Number(rec.deal_score) || 0,
        prob: Number(rec.prob) || 0,
        cluster: rec.cluster || "stable",
      }))
      .sort((a, b) => a.deal - b.deal);
  }, [history, latestDate, sportByName]);

  const handleClick = useCallback((state: any) => {
    const active = state?.activePayload?.[0]?.payload as Point | undefined;
    if (!active) return;
    setPinned({
      ...active,
      cx: state?.chartX ?? 0,
      cy: state?.chartY ?? 0,
    });
  }, []);

  return (
    <section className="my-8" aria-label={t("mlTracker.title")}>
      <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
        <h2 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
          <span className="w-1 h-5 rounded-full bg-primary inline-block" />
          {t("mlTracker.title")}
        </h2>
      </div>
      <p className="text-xs text-muted-foreground mb-4 ml-3">
        {t("mlTracker.subtitleFirstRun")}
      </p>

      <div className="glass-panel p-4 md:p-6">
        {loading ? (
          <div className="h-[320px] flex items-center justify-center text-sm text-muted-foreground">
            <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : points.length === 0 ? (
          <div className="h-[220px] flex items-center justify-center text-center text-sm text-muted-foreground px-6">
            {t("mlTracker.empty")}
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 flex-wrap mb-3">
              {(["stable", "momentum", "volatile"] as const).map((c) => (
                <span key={c} className="inline-flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: CLUSTER_COLOR[c] }} />
                  {t(CLUSTER_LABEL_KEY[c])}
                </span>
              ))}
            </div>

            <div className="w-full relative h-[420px] md:h-[440px]">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart
                  margin={{ top: 10, right: 20, bottom: 30, left: 10 }}
                  onClick={handleClick}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis
                    type="number"
                    dataKey="deal"
                    domain={[0, 100]}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                    stroke="hsl(var(--border))"
                    name={t("ml.dealScore")}
                    label={{
                      value: t("ml.dealScore"),
                      position: "insideBottom",
                      offset: -20,
                      fill: "hsl(var(--muted-foreground))",
                      fontSize: 10,
                    }}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={130}
                    interval={0}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9 }}
                    stroke="hsl(var(--border))"
                  />
                  <Scatter data={points} isAnimationActive={false} cursor="pointer">
                    {points.map((p, i) => (
                      <Cell key={`p-${i}`} fill={CLUSTER_COLOR[p.cluster] || CLUSTER_COLOR.stable} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
              {pinned && <PinnedCard data={pinned} onClose={() => setPinned(null)} t={t as any} />}
            </div>

            <p className="text-[10px] text-muted-foreground/70 mt-3">{t("mlTracker.note")}</p>
          </>
        )}
      </div>
    </section>
  );
};

export default MlDealTracker;
