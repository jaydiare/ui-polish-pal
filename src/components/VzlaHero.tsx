import { motion } from "framer-motion";

interface VzlaHeroProps {
  lastUpdated: string;
}

const VzlaHero = ({ lastUpdated }: VzlaHeroProps) => {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
      className="hero-panel text-center mb-8 p-10 md:p-14"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-secondary border border-border text-xs font-semibold text-muted-foreground mb-6"
      >
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        Updated Daily · {lastUpdated}
      </motion.div>

      <h1 className="text-4xl md:text-6xl font-display font-bold mb-4 leading-[1.05] text-glow">
        VZLA <span className="text-flag-gradient">Sports Cards</span> Index
      </h1>

      <p className="text-muted-foreground text-sm md:text-base max-w-2xl mx-auto leading-relaxed mb-6">
        Real-time eBay market data for Venezuelan athletes' sports cards.
        Track prices, stability scores, and market trends.
      </p>

      <div className="hero-sub text-sm leading-relaxed text-left md:text-center">
        <p className="mb-2">
          The <strong className="text-foreground">Market Stability Score</strong> measures how tightly listing prices cluster around a common level.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          {[
            { label: "Stable", range: "0–10%", color: "text-emerald-400", desc: "Strong agreement" },
            { label: "Active", range: "10–20%", color: "text-sky-400", desc: "Normal activity" },
            { label: "Volatile", range: "20–35%", color: "text-amber-400", desc: "Price dispersion" },
            { label: "Unstable", range: "35%+", color: "text-red-400", desc: "High speculation" },
          ].map((item) => (
            <div key={item.label} className="text-center p-2 rounded-lg bg-background/50">
              <div className={`text-xs font-bold ${item.color}`}>{item.label}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">{item.range}</div>
            </div>
          ))}
        </div>
      </div>

    </motion.section>
  );
};

export default VzlaHero;
