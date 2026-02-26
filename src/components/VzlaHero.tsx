interface VzlaHeroProps {
  lastUpdated: string;
}

const VzlaHero = ({ lastUpdated }: VzlaHeroProps) => {
  return (
    <section className="hero-panel text-center mb-8 p-12">
      <h1 className="text-5xl font-black mb-2 uppercase leading-tight">
        VZLA <span className="text-flag-gradient italic">Sports Cards</span> Index
      </h1>
      <div className="hero-sub text-sm font-medium tracking-[-0.01em]">
        The Venezuela Sports Elite Card Index transforms daily updated eBay listing data into a structured benchmark for Venezuelan athletes' sports cards. Instead of scanning fragmented listings, collectors get a clean, centralized view of how the market is pricing elite Venezuelan talent.
        The Market Stability Score adds context to every valuation. 
        It measures how tightly listing prices cluster around a common level. Low stability percentages signal strong price agreement and a mature market. 
        Higher percentages indicate dispersion, volatility, or speculative positioning and may create opportunities for disciplined buyers to negotiate or identify mispriced listings. 
        Value tells you what the market is pricing. Stability tells you how confident the market is.
      </div>
      <div className="opacity-75 font-bold tracking-[0.08em] lowercase text-[10px] mt-2">
        Last updated: {lastUpdated}
      </div>
    </section>
  );
};

export default VzlaHero;
