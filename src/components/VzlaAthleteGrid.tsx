import { Athlete, EbayAvgRecord } from "@/data/athletes";
import AthleteCard from "./AthleteCard";

interface VzlaAthleteGridProps {
  athletes: Athlete[];
  byName: Record<string, EbayAvgRecord>;
  byKey: Record<string, EbayAvgRecord>;
  hasMore: boolean;
  remainingCount: number;
  onLoadMore: () => void;
}

const VzlaAthleteGrid = ({ athletes, byName, byKey, hasMore, remainingCount, onLoadMore }: VzlaAthleteGridProps) => {
  return (
    <>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-[18px] mt-[26px]">
        {athletes.map((a) => (
          <AthleteCard key={`${a.name}-${a.sport}`} athlete={a} byName={byName} byKey={byKey} />
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center my-[18px]">
          <button
            className="h-11 px-[18px] rounded-xl border border-foreground/10 bg-foreground/[0.06] text-foreground/90 cursor-pointer backdrop-blur-[10px] transition-all hover:bg-foreground/10 hover:border-foreground/[0.18] active:translate-y-px"
            onClick={onLoadMore}
          >
            Load More ({remainingCount} more)
          </button>
        </div>
      )}
    </>
  );
};

export default VzlaAthleteGrid;
