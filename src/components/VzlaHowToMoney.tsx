import { motion } from "framer-motion";
import { Link } from "react-router-dom";

const steps = [
  {
    icon: "🔍",
    title: "Find Underpriced Cards",
    desc: "Use our Market Intel page to spot athletes where the sold price exceeds the listed price — these are instant arbitrage opportunities.",
  },
  {
    icon: "⚖️",
    title: "Check the Equilibrium",
    desc: "Our Supply & Demand chart shows where the market clears. Cards listed below equilibrium are statistically undervalued — buy before others catch on.",
  },
  {
    icon: "🔄",
    title: "Look for Flip Potential",
    desc: "Cards marked 'Flip Potential' have high price volatility. Buy at the low end of their range and relist higher for quick profit.",
  },
  {
    icon: "💰",
    title: "Use the Budget Optimizer",
    desc: "Enter your budget above and let our algorithm pick the best combination of cards to maximize your return on investment.",
  },
];

const VzlaHowToMoney = () => {
  return (
    <section className="my-8" aria-label="How to make money">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center gap-2 mb-4">
          <span className="w-1 h-5 rounded-full bg-primary inline-block" />
          <h2 className="font-display font-bold text-lg text-foreground">
            How to Make Money With This Data
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {steps.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.08 }}
              className="glass-panel p-4 hover:border-primary/20 transition-colors"
            >
              <div className="text-2xl mb-2">{step.icon}</div>
              <h3 className="font-display font-bold text-sm text-foreground mb-1">
                {step.title}
              </h3>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {step.desc}
              </p>
            </motion.div>
          ))}
        </div>

        <div className="mt-3 text-center">
          <Link
            to="/data"
            className="inline-flex items-center gap-2 text-xs text-primary hover:text-primary/80 font-medium transition-colors"
          >
            📊 Explore full Market Intel →
          </Link>
        </div>
      </motion.div>
    </section>
  );
};

export default VzlaHowToMoney;
