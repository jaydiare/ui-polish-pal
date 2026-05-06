import { useMemo, forwardRef, useRef, useCallback } from "react";
import { Athlete, EbayAvgRecord } from "@/data/athletes";
import {
  getEbayAvgNumber,
  getMarketStabilityCV,
  getAvgDaysOnMarket,
  getIndexLevel,
  marketStabilityScoreFromCV,
  formatCurrency,
  buildEbaySearchUrl,
  buildEbayGradedSearchUrl,
  initialsFromName,
} from "@/lib/vzla-helpers";
import { useAthleteImage } from "@/hooks/useAthleteImage";
import Sparkline from "./Sparkline";

interface AthleteCardProps {
  athlete: Athlete;
  byName: Record<string, EbayAvgRecord>;
  byKey: Record<string, EbayAvgRecord>;
  gradedByName: Record<string, EbayAvgRecord>;
  gradedByKey: Record<string, EbayAvgRecord>;
  ebaySoldRaw?: Record<string, any>;
  ebayGradedSoldRaw?: Record<string, any>;
  history?: any[];
  psaPop?: number;
  isRecommended?: boolean;
  isHotSeller?: boolean;
  priceMode: "raw" | "graded" | "both";
  snapshotFallback?: { rawListedPrice: number | null; gradedListedPrice: number | null };
}

const AthleteCard = forwardRef<HTMLElement, AthleteCardProps>(({ athlete, byName, byKey, gradedByName, gradedByKey, ebaySoldRaw, ebayGradedSoldRaw, history, psaPop, isRecommended, isHotSeller, priceMode, snapshotFallback }, ref) => {
  const cardRef = useRef<HTMLElement>(null);
  // DEBUG: Toggle alignment overlay with `?debug=align` in URL
  const debugAlign = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("debug") === "align";
  const dbgRaw = debugAlign ? "outline outline-1 outline-red-500/80 outline-offset-[-1px]" : "";
  const dbgGrd = debugAlign ? "outline outline-1 outline-blue-500/80 outline-offset-[-1px]" : "";
  const avgNum = getEbayAvgNumber(athlete, byName, byKey);
  const rawSnapPrice = snapshotFallback?.rawListedPrice ?? null;
  const rawFallback = avgNum == null && rawSnapPrice != null;
  const rawDisplayPrice = avgNum ?? rawSnapPrice;
  const money = rawDisplayPrice != null
    ? `${rawFallback ? "~" : ""}${formatCurrency(rawDisplayPrice, "USD")}`
    : "—";
  const hasPrice = rawDisplayPrice != null;

  const rawIdx = getIndexLevel(athlete, byName, byKey);
  const gradedIdx = getIndexLevel(athlete, gradedByName, gradedByKey);

  const gradedAvgNum = getEbayAvgNumber(athlete, gradedByName, gradedByKey);
  const gradedSnapPrice = snapshotFallback?.gradedListedPrice ?? null;
  const gradedFallback = gradedAvgNum == null && gradedSnapPrice != null;
  const gradedDisplayPrice = gradedAvgNum ?? gradedSnapPrice;
  const gradedMoney = gradedDisplayPrice != null
    ? `${gradedFallback ? "~" : ""}${formatCurrency(gradedDisplayPrice, "USD")}`
    : null;

  const soldRecord = ebaySoldRaw?.[athlete.name];
  const rawSoldAvg = soldRecord?.taguchiSold != null ? soldRecord.taguchiSold : null;

  const gradedSoldRecord = ebayGradedSoldRaw?.[athlete.name];
  const gradedSoldAvg = gradedSoldRecord?.taguchiSold != null ? gradedSoldRecord.taguchiSold : null;

  // Pick sold avg based on priceMode
  const soldAvg = priceMode === "graded" ? (gradedSoldAvg ?? rawSoldAvg) : rawSoldAvg;

  // Active price set for signals based on priceMode
  const activeByName = priceMode === "graded" ? gradedByName : byName;
  const activeByKey = priceMode === "graded" ? gradedByKey : byKey;
  const activeAvgNum = priceMode === "graded" ? gradedAvgNum : avgNum;
  const activeHasPrice = activeAvgNum != null;

  // Stability/DOM from listing data
  const listingCv = activeHasPrice ? getMarketStabilityCV(athlete, activeByName, activeByKey) : null;
  const listingDom = activeHasPrice ? getAvgDaysOnMarket(athlete, activeByName, activeByKey) : null;

  // Fallback: use sold data's CV when listing CV unavailable (graded mode)
  const gradedSoldCv = gradedSoldRecord?.marketStabilityCV != null && Number.isFinite(gradedSoldRecord.marketStabilityCV) ? gradedSoldRecord.marketStabilityCV : null;
  const rawSoldCv = soldRecord?.marketStabilityCV != null && Number.isFinite(soldRecord.marketStabilityCV) ? soldRecord.marketStabilityCV : null;

  const cv = listingCv ?? (priceMode === "graded" ? gradedSoldCv : rawSoldCv);
  const stability = marketStabilityScoreFromCV(cv);

  // Days on market: prefer eBay API value, fallback to snapshot-based observedDays from history
  const latestHistoryEntry = history?.length ? history[history.length - 1] : null;
  const historyObsDays = priceMode === "graded"
    ? (latestHistoryEntry?.graded?.obsDays ?? latestHistoryEntry?.raw?.obsDays)
    : (latestHistoryEntry?.raw?.obsDays ?? latestHistoryEntry?.graded?.obsDays);
  const dom = (listingDom != null && listingDom > 0) ? listingDom : (historyObsDays ?? null);
  const domText = dom != null && dom > 0 ? `${Math.round(dom)}d` : null;

  // Separate raw & graded stability/DOM for "both" mode
  const rawListingCv = avgNum != null ? getMarketStabilityCV(athlete, byName, byKey) : null;
  const rawCv = rawListingCv ?? rawSoldCv;
  const rawStability = marketStabilityScoreFromCV(rawCv);
  const rawApiDom = avgNum != null ? getAvgDaysOnMarket(athlete, byName, byKey) : null;
  const rawObsDays = latestHistoryEntry?.raw?.obsDays ?? null;
  const rawDom = (rawApiDom != null && rawApiDom > 0) ? rawApiDom : rawObsDays;

  const gradedListingCv = gradedAvgNum != null ? getMarketStabilityCV(athlete, gradedByName, gradedByKey) : null;
  const gradedCvFinal = gradedListingCv ?? gradedSoldCv;
  const gradedStability = marketStabilityScoreFromCV(gradedCvFinal);
  const gradedApiDom = gradedAvgNum != null ? getAvgDaysOnMarket(athlete, gradedByName, gradedByKey) : null;
  const gradedObsDays = latestHistoryEntry?.graded?.obsDays ?? null;
  const gradedDom = (gradedApiDom != null && gradedApiDom > 0) ? gradedApiDom : gradedObsDays;

  const shopUrl = priceMode === "graded"
    ? buildEbayGradedSearchUrl(athlete.name, athlete.sport, gradedDisplayPrice)
    : buildEbaySearchUrl(athlete.name, athlete.sport, rawDisplayPrice);
  const initials = initialsFromName(athlete.name);
  const photo = useAthleteImage(athlete.name, athlete.sport, cardRef);

  // Signals based on active price mode (single mode)
  const isFlip = activeHasPrice && cv != null && soldAvg != null && activeAvgNum != null && soldAvg >= activeAvgNum && (stability.bucket === "volatile" || stability.bucket === "highly_unstable");
  const isBuyLow = activeHasPrice && soldAvg != null && activeAvgNum != null && soldAvg < activeAvgNum;

  // Independent raw/graded signals for "both" mode
  const rawIsFlip = avgNum != null && rawCv != null && rawSoldAvg != null && rawSoldAvg >= avgNum && (rawStability.bucket === "volatile" || rawStability.bucket === "highly_unstable");
  const rawIsBuyLow = avgNum != null && rawSoldAvg != null && rawSoldAvg < avgNum;
  const gradedIsFlip = gradedAvgNum != null && gradedCvFinal != null && gradedSoldAvg != null && gradedSoldAvg >= gradedAvgNum && (gradedStability.bucket === "volatile" || gradedStability.bucket === "highly_unstable");
  const gradedIsBuyLow = gradedAvgNum != null && gradedSoldAvg != null && gradedSoldAvg < gradedAvgNum;

  // Sparkline data: extract prices + dates from history based on priceMode, only show with 7+ data points
  const extractSparkline = (key: "raw" | "graded") => {
    if (!history || history.length < 7) return null;
    const entries = history
      .map((h: any) => ({ price: h?.[key]?.price ?? null, date: h?.date ?? null }))
      .filter((e): e is { price: number; date: string } => e.price != null && Number.isFinite(e.price));
    return entries.length >= 7 ? { values: entries.map(e => e.price), dates: entries.map(e => e.date) } : null;
  };
  const rawSparkData = useMemo(() => extractSparkline("raw"), [history]);
  const gradedSparkData = useMemo(() => extractSparkline("graded"), [history]);

  const showRawSparkline = (priceMode === "raw" || priceMode === "both") && rawSparkData != null;
  const showGradedSparkline = (priceMode === "graded" || priceMode === "both") && gradedSparkData != null;
  const showSparkline = showRawSparkline || showGradedSparkline;

  return (
    <article ref={(node) => {
      cardRef.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) (ref as React.MutableRefObject<HTMLElement | null>).current = node;
    }} className={`athlete-card group ${isRecommended ? "is-recommended" : ""}`}>
      {/* Recommended badge */}
      {isRecommended && (
        <div className="mb-2 -mt-1 text-[10px] font-bold text-vzla-yellow tracking-wider uppercase flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-vzla-yellow" />
          Budget Pick
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex gap-3 items-start">
        {photo ? (
          <img
            src={photo}
            alt={athlete.name}
            className="w-14 h-14 rounded-xl object-cover object-center shrink-0 border border-border bg-secondary"
            loading="lazy"
          />
        ) : (
          <div className="w-14 h-14 rounded-xl flex items-center justify-center font-display font-bold text-sm tracking-wide bg-secondary border border-border text-vzla-yellow shrink-0">
            {initials}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="font-display font-bold text-[15px] leading-tight line-clamp-2 text-foreground mb-1">
            {athlete.name}
          </h3>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold bg-vzla-yellow/10 border border-vzla-yellow/20 text-vzla-yellow">
              {athlete.sport}
            </span>
            <span className="text-[9px] text-muted-foreground font-semibold tracking-wide uppercase">
              {athlete.league}
            </span>
            {/* Signal badges (single mode only) */}
            {priceMode !== "both" && isFlip && (
              <span className="inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold bg-vzla-yellow/10 border border-vzla-yellow/20 text-vzla-yellow">
                🔄 Flip
              </span>
            )}
            {priceMode !== "both" && isBuyLow && (
              <span className="inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold bg-violet-500/10 border border-violet-400/20 text-violet-400">
                🔻 Buy Low
              </span>
            )}
            {isHotSeller && (
              <span className="inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold bg-orange-500/10 border border-orange-500/20 text-orange-400">
                🔥 Hot Seller
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Price grid ── */}
      <div className={`mt-3 grid gap-2 ${priceMode === "both" ? "grid-cols-2" : "grid-cols-1"}`}>
        {/* Raw */}
        {(priceMode === "raw" || priceMode === "both") && (
          <div className={`p-2.5 rounded-lg bg-secondary/50 border border-border/40 ${dbgRaw}`}>
            <div className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider mb-1">Raw</div>
            <div className="text-base font-display font-bold text-foreground leading-none">{money}</div>
            {rawFallback && (
              <div className="text-[8px] text-muted-foreground font-medium mt-0.5">Historical</div>
            )}
            {rawIdx != null && (
              <div className={`text-[10px] font-semibold mt-1 ${rawIdx >= 100 ? "text-primary" : "text-destructive"}`}>
                {rawIdx >= 100 ? "↗" : "↘"} {rawIdx.toFixed(0)}
              </div>
            )}
            {priceMode === "both" && (rawIsBuyLow || rawIsFlip) && (
              <div className="flex gap-1 mt-1.5 flex-wrap">
                {rawIsFlip && <span className="inline-flex px-1 py-0.5 rounded text-[8px] font-bold bg-vzla-yellow/10 border border-vzla-yellow/20 text-vzla-yellow leading-none">🔄 Flip</span>}
                {rawIsBuyLow && <span className="inline-flex px-1 py-0.5 rounded text-[8px] font-bold bg-violet-500/10 border border-violet-400/20 text-violet-400 leading-none">🔻 Buy Low</span>}
              </div>
            )}
          </div>
        )}

        {/* Graded */}
        {(priceMode === "graded" || priceMode === "both") && (
          <div className="p-2.5 rounded-lg bg-secondary/50 border border-border/40">
            <div className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider mb-1">Graded</div>
            {gradedMoney ? (
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-base font-display font-bold text-foreground leading-none">{gradedMoney}</div>
                  {gradedFallback && (
                    <div className="text-[8px] text-muted-foreground font-medium mt-0.5">Historical</div>
                  )}
                  {gradedIdx != null && (
                    <div className={`text-[10px] font-semibold mt-1 ${gradedIdx >= 100 ? "text-primary" : "text-destructive"}`}>
                      {gradedIdx >= 100 ? "↗" : "↘"} {gradedIdx.toFixed(0)}
                    </div>
                  )}
                  {priceMode === "both" && (gradedIsBuyLow || gradedIsFlip) && (
                    <div className="flex gap-1 mt-1.5 flex-wrap">
                      {gradedIsFlip && <span className="inline-flex px-1 py-0.5 rounded text-[8px] font-bold bg-vzla-yellow/10 border border-vzla-yellow/20 text-vzla-yellow leading-none">🔄 Flip</span>}
                      {gradedIsBuyLow && <span className="inline-flex px-1 py-0.5 rounded text-[8px] font-bold bg-violet-500/10 border border-violet-400/20 text-violet-400 leading-none">🔻 Buy Low</span>}
                    </div>
                  )}
                </div>
                {priceMode === "graded" && psaPop != null && (
                  <div className="text-right shrink-0">
                    <div className="text-[8px] text-muted-foreground font-medium uppercase tracking-wider leading-tight">PSA</div>
                    <div className="text-[8px] text-muted-foreground font-medium uppercase tracking-wider leading-tight">POP #</div>
                    <div className="text-xs font-display font-bold text-foreground leading-tight mt-0.5">{psaPop.toLocaleString()}</div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground/40 font-display font-bold leading-none">—</div>
            )}
          </div>
        )}
      </div>

      {/* ── Sparkline ── */}
      {showSparkline && (
        <div className={`mt-2 flex items-center gap-2 ${priceMode === "both" && showRawSparkline && showGradedSparkline ? "grid grid-cols-2" : ""}`}>
          {showRawSparkline && rawSparkData && (
            <div className="flex items-center gap-1.5">
              {priceMode === "both" && <span className="text-[8px] text-muted-foreground uppercase">Raw</span>}
              <Sparkline data={rawSparkData.values} dates={rawSparkData.dates} width={priceMode === "both" ? 60 : 80} height={20} />
              <span className="text-[9px] text-muted-foreground">{rawSparkData.values.length}d</span>
            </div>
          )}
          {showGradedSparkline && gradedSparkData && (
            <div className="flex items-center gap-1.5">
              {priceMode === "both" && <span className="text-[8px] text-muted-foreground uppercase">Grd</span>}
              <Sparkline data={gradedSparkData.values} dates={gradedSparkData.dates} width={priceMode === "both" ? 60 : 80} height={20} />
              <span className="text-[9px] text-muted-foreground">{gradedSparkData.values.length}d</span>
            </div>
          )}
        </div>
      )}

      {/* ── Meta row: stability + sold + days listed ── */}
      {priceMode === "both" ? (
        <div className="mt-2 grid grid-cols-2 gap-2 text-[9px] leading-tight text-muted-foreground">
          {/* Raw meta column — aligned to Raw price card */}
          <div className="px-2.5 flex items-center gap-1 whitespace-nowrap overflow-hidden min-w-0">
            <span className="uppercase font-bold tracking-wider text-muted-foreground/80 shrink-0">Raw</span>
            <span className={`font-bold stability-${rawStability.bucket} truncate`}>{rawStability.label}</span>
            {rawDom != null && (
              <>
                <span className="text-border shrink-0">·</span>
                <span className="shrink-0">⏱ {Math.round(rawDom)}d</span>
              </>
            )}
          </div>
          {/* Graded meta column — aligned to Graded price card */}
          <div className="px-2.5 flex items-center gap-1 whitespace-nowrap overflow-hidden min-w-0">
            <span className="uppercase font-bold tracking-wider text-muted-foreground/80 shrink-0">Grd</span>
            <span className={`font-bold stability-${gradedStability.bucket} truncate`}>{gradedStability.label}</span>
            {gradedDom != null && (
              <>
                <span className="text-border shrink-0">·</span>
                <span className="shrink-0">⏱ {Math.round(gradedDom)}d</span>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground flex-wrap">
          <span className={`font-bold stability-${stability.bucket}`}>{stability.label}</span>
          {soldAvg != null && (
            <>
              <span className="text-border">·</span>
              <span>Sold {formatCurrency(soldAvg, "USD")}</span>
            </>
          )}
          {domText && (
            <>
              <span className="text-border">·</span>
              <span>⏱ {domText}</span>
            </>
          )}
        </div>
      )}

      {/* ── CTA ── */}
      <a
        href={shopUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-auto pt-3 self-stretch inline-flex items-center justify-center px-4 py-2 rounded-lg cta-yellow no-underline text-xs font-bold tracking-wide group-hover:shadow-lg transition-all"
      >
        Search on eBay →
      </a>

      {/* Team */}
      <div className="mt-2 text-muted-foreground font-semibold text-[9px] tracking-wider uppercase text-center">
        {athlete.team}
      </div>
    </article>
  );
});

AthleteCard.displayName = "AthleteCard";

export default AthleteCard;
