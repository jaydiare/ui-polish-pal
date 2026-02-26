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

interface AthleteCardProps {
  athlete: Athlete;
  byName: Record<string, EbayAvgRecord>;
  byKey: Record<string, EbayAvgRecord>;
}

const AthleteCard = ({ athlete, byName, byKey }: AthleteCardProps) => {
  const avgNum = getEbayAvgNumber(athlete, byName, byKey);
  const money = avgNum != null ? `USD ${formatCurrency(avgNum, "USD")}` : "—";

  const cv = getMarketStabilityCV(athlete, byName, byKey);
  const stability = marketStabilityScoreFromCV(cv);

  const dom = getAvgDaysOnMarket(athlete, byName, byKey);
  const domText = dom != null ? `${Math.round(dom)} days` : "—";

  const shopUrl = buildEbaySearchUrl(athlete.name, athlete.sport);
  const initials = initialsFromName(athlete.name);

  return (
    <article className="athlete-card">
      <div className="flex gap-3.5 items-start">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center font-black text-xl tracking-[0.06em] bg-vzla-yellow/10 border border-vzla-yellow/[0.18] text-vzla-yellow">
          {initials}
        </div>
        <div className="min-w-0 flex flex-col gap-2">
          <div className="font-black text-xl leading-[1.05] line-clamp-2">{athlete.name}</div>
          <span className="inline-flex self-start px-3 py-1.5 rounded-full text-xs font-extrabold text-flag-gradient bg-vzla-yellow/10 border border-vzla-yellow/[0.18]">
            {athlete.sport}
          </span>
        </div>
      </div>

      <div className="mt-3.5 text-xs font-black tracking-[-0.02em]">{money}</div>
      <div className="mt-0.5 text-xs text-foreground/55 font-bold">eBay Avg. listing Price</div>

      <div className="mt-1.5 text-[11px] text-foreground/45">
        Market Stability :
        <span className="inline-block px-2 py-0.5 rounded-full bg-foreground/[0.08] ml-1.5 font-semibold">
          {stability.label}
        </span>
        <span className="ml-1.5 opacity-75">({stability.pctText})</span>
      </div>

      <div className="text-[11px] text-foreground/45">
        Avg. time listed: <span className="font-semibold">{domText}</span>
      </div>

      <div className="text-[11px] text-foreground/45">*prices may vary*</div>

      <a
        href={shopUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3.5 self-start inline-flex items-center justify-center px-4 py-3 rounded-full cta-yellow no-underline text-sm hover:scale-[1.02] transition-transform"
      >
        Search on eBay
      </a>

      <div className="mt-2.5 text-foreground/55 font-extrabold text-xs tracking-[0.06em] uppercase">
        {athlete.league} • {athlete.team}
      </div>
    </article>
  );
};

export default AthleteCard;
