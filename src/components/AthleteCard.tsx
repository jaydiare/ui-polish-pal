import { Athlete, EbayAvgRecord } from "@/data/athletes";
import {
  getEbayAvgNumber,
  getMarketStabilityCV,
  getAvgDaysOnMarket,
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
  ebaySoldRaw?: Record<string, any>;
  isRecommended?: boolean;
}

const AthleteCard = ({ athlete, byName, byKey, ebaySoldRaw, isRecommended }: AthleteCardProps) => {
  const avgNum = getEbayAvgNumber(athlete, byName, byKey);
  const money = avgNum != null ? formatCurrency(avgNum, "USD") : "—";

  const hasPrice = avgNum != null;
  const cv = hasPrice ? getMarketStabilityCV(athlete, byName, byKey) : null;
  const stability = marketStabilityScoreFromCV(cv);

  const dom = hasPrice ? getAvgDaysOnMarket(athlete, byName, byKey) : null;
  const domText = dom != null ? `${Math.round(dom)}d` : "—";

  // Sold avg (reference only)
  const soldRecord = ebaySoldRaw?.[athlete.name];
  const soldAvg = soldRecord?.taguchiSold != null ? soldRecord.taguchiSold : null;

  const shopUrl = buildEbaySearchUrl(athlete.name, athlete.sport);
  const initials = initialsFromName(athlete.name);
  const photo = useWikipediaImage(athlete.name);

  return (
    <article className={`athlete-card group ${isRecommended ? "is-recommended" : ""}`}>
      {/* Recommended badge */}
      {isRecommended && (
        <div className="mb-2 -mt-1 text-[10px] font-bold text-vzla-yellow tracking-wider uppercase flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-vzla-yellow" />
          Budget Pick
        </div>
      )}

      {/* Header */}
      <div className="flex gap-3 items-start">
        {photo ? (
          <img
            src={photo}
            alt={athlete.name}
            className="w-16 h-16 rounded-xl object-cover shrink-0 border border-border"
            loading="lazy"
          />
        ) : (
          <div className="w-16 h-16 rounded-xl flex items-center justify-center font-display font-bold text-base tracking-wide bg-secondary border border-border text-vzla-yellow shrink-0">
            {initials}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="font-display font-bold text-base leading-tight line-clamp-2 text-foreground mb-1.5">
            {athlete.name}
          </h3>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold bg-vzla-yellow/10 border border-vzla-yellow/20 text-vzla-yellow">
              {athlete.sport}
            </span>
            <span className="text-[10px] text-muted-foreground font-semibold tracking-wide uppercase">
              {athlete.league}
            </span>
          </div>
        </div>
      </div>

      {/* Price */}
      <div className="mt-4 p-3 rounded-lg bg-secondary/50 border border-border/50">
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-lg font-display font-bold text-foreground">{money}</div>
            <div className="text-[10px] text-muted-foreground font-medium mt-0.5">eBay Avg. Price</div>
          </div>
          <div className="text-right">
            <div className={`text-xs font-bold stability-${stability.bucket}`}>
              {stability.label}
            </div>
            <div className="text-[10px] text-muted-foreground">{stability.pctText}</div>
          </div>
        </div>
        {hasPrice && cv != null && (stability.bucket === "volatile" || stability.bucket === "highly_unstable") && (
          <div className="mt-2 flex items-center gap-1.5 px-2 py-1 rounded-md bg-vzla-yellow/10 border border-vzla-yellow/20 w-fit">
            <span className="text-[11px]">🔄</span>
            <span className="text-[10px] font-bold text-vzla-yellow tracking-wide">Flip Potential</span>
          </div>
        )}
      </div>

      {/* Sold avg (reference only) */}
      {soldAvg != null && (
        <div className="mt-2 px-3 py-1.5 rounded-md bg-accent/30 border border-border/30 flex items-baseline justify-between">
          <span className="text-[10px] text-muted-foreground font-medium">eBay Avg. Sold</span>
          <span className="text-sm font-display font-bold text-foreground/80">{formatCurrency(soldAvg, "USD")}</span>
        </div>
      )}

      {/* Stats row */}
      <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
        <span><span className="text-foreground/80">⏱</span> Listed: <strong className="text-foreground/70">{domText}</strong></span>
        <span className="text-foreground/40 italic text-[10px]">*prices may vary*</span>
      </div>

      {/* CTA */}
      <a
        href={shopUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-auto pt-4 self-stretch inline-flex items-center justify-center px-4 py-2.5 rounded-lg cta-yellow no-underline text-xs font-bold tracking-wide group-hover:shadow-lg transition-all"
      >
        Search on eBay →
      </a>

      {/* Team */}
      <div className="mt-2.5 text-muted-foreground font-semibold text-[10px] tracking-wider uppercase text-center">
        {athlete.team}
      </div>
    </article>
  );
};

export default AthleteCard;
