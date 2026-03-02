import { Athlete, EbayAvgRecord } from "@/data/athletes";
import {
  getEbayAvgNumber,
  getMarketStabilityCV,
  getAvgDaysOnMarket,
  getIndexLevel,
  marketStabilityScoreFromCV,
  formatCurrency,
  buildEbaySearchUrl,
  initialsFromName,
} from "@/lib/vzla-helpers";
import { useWikipediaImage } from "@/hooks/useWikipediaImage";

interface AthleteCardProps {
  athlete: Athlete;
  byName: Record<string, EbayAvgRecord>;
  byKey: Record<string, EbayAvgRecord>;
  gradedByName: Record<string, EbayAvgRecord>;
  gradedByKey: Record<string, EbayAvgRecord>;
  ebaySoldRaw?: Record<string, any>;
  isRecommended?: boolean;
  priceMode: "raw" | "graded" | "both";
}

const AthleteCard = ({ athlete, byName, byKey, gradedByName, gradedByKey, ebaySoldRaw, isRecommended, priceMode }: AthleteCardProps) => {
  const avgNum = getEbayAvgNumber(athlete, byName, byKey);
  const money = avgNum != null ? formatCurrency(avgNum, "USD") : "—";

  const hasPrice = avgNum != null;

  const rawIdx = getIndexLevel(athlete, byName, byKey);
  const gradedIdx = getIndexLevel(athlete, gradedByName, gradedByKey);

  const gradedAvgNum = getEbayAvgNumber(athlete, gradedByName, gradedByKey);
  const gradedMoney = gradedAvgNum != null ? formatCurrency(gradedAvgNum, "USD") : null;

  const soldRecord = ebaySoldRaw?.[athlete.name];
  const soldAvg = soldRecord?.taguchiSold != null ? soldRecord.taguchiSold : null;

  // Active price set for signals based on priceMode
  const activeByName = priceMode === "graded" ? gradedByName : byName;
  const activeByKey = priceMode === "graded" ? gradedByKey : byKey;
  const activeAvgNum = priceMode === "graded" ? gradedAvgNum : avgNum;
  const activeHasPrice = activeAvgNum != null;

  const cv = activeHasPrice ? getMarketStabilityCV(athlete, activeByName, activeByKey) : null;
  const stability = marketStabilityScoreFromCV(cv);
  const dom = activeHasPrice ? getAvgDaysOnMarket(athlete, activeByName, activeByKey) : null;
  const domText = dom != null ? `${Math.round(dom)}d` : null;

  const shopUrl = buildEbaySearchUrl(athlete.name, athlete.sport);
  const initials = initialsFromName(athlete.name);
  const photo = useWikipediaImage(athlete.name, athlete.sport);

  // Signals based on active price mode
  const isFlip = activeHasPrice && cv != null && soldAvg != null && activeAvgNum != null && soldAvg >= activeAvgNum && (stability.bucket === "volatile" || stability.bucket === "highly_unstable");
  const isBuyLow = activeHasPrice && soldAvg != null && activeAvgNum != null && soldAvg < activeAvgNum;

  return (
    <article className={`athlete-card group ${isRecommended ? "is-recommended" : ""}`}>
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
            className="w-14 h-14 rounded-xl object-cover object-top shrink-0 border border-border"
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
            {/* Signal badges inline with sport */}
            {isFlip && (
              <span className="inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold bg-vzla-yellow/10 border border-vzla-yellow/20 text-vzla-yellow">
                🔄 Flip
              </span>
            )}
            {isBuyLow && (
              <span className="inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold bg-accent/10 border border-accent/20 text-accent">
                🔻 Buy Low
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Price grid ── */}
      <div className={`mt-3 grid gap-2 ${priceMode === "both" ? "grid-cols-2" : "grid-cols-1"}`}>
        {/* Raw */}
        {(priceMode === "raw" || priceMode === "both") && (
          <div className="p-2.5 rounded-lg bg-secondary/50 border border-border/40">
            <div className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider mb-1">Raw</div>
            <div className="text-base font-display font-bold text-foreground leading-none">{money}</div>
            {rawIdx != null && (
              <div className={`text-[10px] font-semibold mt-1 ${rawIdx >= 100 ? "text-primary" : "text-destructive"}`}>
                {rawIdx >= 100 ? "↗" : "↘"} {rawIdx.toFixed(0)}
              </div>
            )}
          </div>
        )}

        {/* Graded */}
        {(priceMode === "graded" || priceMode === "both") && (
          <div className="p-2.5 rounded-lg bg-secondary/50 border border-border/40">
            <div className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider mb-1">Graded</div>
            {gradedMoney ? (
              <>
                <div className="text-base font-display font-bold text-foreground leading-none">{gradedMoney}</div>
                {gradedIdx != null && (
                  <div className={`text-[10px] font-semibold mt-1 ${gradedIdx >= 100 ? "text-primary" : "text-destructive"}`}>
                    {gradedIdx >= 100 ? "↗" : "↘"} {gradedIdx.toFixed(0)}
                  </div>
                )}
              </>
            ) : (
              <div className="text-sm text-muted-foreground/40 font-display font-bold leading-none">—</div>
            )}
          </div>
        )}
      </div>

      {/* ── Meta row: stability + sold + days listed ── */}
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
};

export default AthleteCard;
