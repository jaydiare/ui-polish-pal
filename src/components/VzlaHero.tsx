import { forwardRef } from "react";
import { motion } from "framer-motion";
import { TrendingUp, BarChart3, Shield, Zap } from "lucide-react";

interface VzlaHeroProps {
  lastUpdated: string;
}

const STABILITY_TIERS = [
  { label: "Stable", range: "0–10%", icon: Shield, color: "text-emerald-400", bg: "bg-emerald-400/8", border: "border-emerald-400/15" },
  { label: "Active", range: "10–20%", icon: Zap, color: "text-sky-400", bg: "bg-sky-400/8", border: "border-sky-400/15" },
  { label: "Volatile", range: "20–35%", icon: BarChart3, color: "text-amber-400", bg: "bg-amber-400/8", border: "border-amber-400/15" },
  { label: "Unstable", range: "35%+", icon: TrendingUp, color: "text-red-400", bg: "bg-red-400/8", border: "border-red-400/15" },
];

const VzlaHero = forwardRef<HTMLElement, VzlaHeroProps>(({ lastUpdated }, ref) => {
  return (
    <motion.section
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
      className="hero-panel text-center mb-8 p-8 md:p-14"
    >
      {/* Live badge */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-secondary/80 border border-border text-xs font-semibold text-muted-foreground mb-5"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
        </span>
        Updated Daily · {lastUpdated}
      </motion.div>

      {/* Title */}
      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="text-4xl md:text-6xl font-display font-bold mb-3 leading-[1.05] text-glow"
      >
        VZLA <span className="text-flag-gradient">Sports Cards</span> Index
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="text-muted-foreground text-sm md:text-base max-w-xl mx-auto leading-relaxed mb-8"
      >
        Daily eBay market data for 550+ Venezuelan athletes.
        Track prices, stability, and investment signals.
      </motion.p>

      {/* Stability guide — horizontal card grid */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="hero-guide"
      >
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">
          Stability Score Guide
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          {STABILITY_TIERS.map((tier) => {
            const Icon = tier.icon;
            return (
              <div
                key={tier.label}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl ${tier.bg} border ${tier.border} transition-colors`}
              >
                <Icon className={`w-4 h-4 ${tier.color}`} />
                <span className={`text-xs font-bold ${tier.color}`}>{tier.label}</span>
                <span className="text-[10px] text-muted-foreground">{tier.range} CV</span>
              </div>
            );
          })}
        </div>

        {/* Signal badges */}
        <div className="flex flex-col sm:flex-row gap-2 mt-4 justify-center">
          <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-vzla-yellow/5 border border-vzla-yellow/15">
            <span className="text-xs">🔄</span>
            <span className="text-[11px] text-muted-foreground">
              <strong className="text-vzla-yellow">Flip Potential</strong> — Volatile cards with buy-low, sell-high opportunity
            </span>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/5 border border-emerald-500/15">
            <span className="text-xs">🔻</span>
            <span className="text-[11px] text-muted-foreground">
              <strong className="text-emerald-400">Buy Low</strong> — Sold price below listing price
            </span>
          </div>
        </div>
      </motion.div>
    </motion.section>
  );
});

VzlaHero.displayName = "VzlaHero";

export default VzlaHero;
