import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import SEOHead from "@/components/SEOHead";
import VzlaNavbar from "@/components/VzlaNavbar";
import VzlaFooter from "@/components/VzlaFooter";
import VzlaEbayFooter from "@/components/VzlaEbayFooter";
import AdSenseInArticle from "@/components/AdSenseInArticle";

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] as const },
});

const FAQ_ITEMS = [
  {
    q: "How often are prices updated?",
    a: "eBay listing averages refresh every 24 hours through automated pipelines. Sold price comps update every 3 hours in rolling batches. PSA and BGS population data refreshes on a weekly schedule. The bi-weekly market analysis report runs on the 1st and 15th of each month.",
  },
  {
    q: "What is the Taguchi Winsorized Mean?",
    a: "It's a statistical method borrowed from manufacturing quality control. We sort all listing prices, remove the top and bottom 20% (extreme outliers like $0.99 bulk lots or $10,000 rare finds), replace trimmed values with the nearest surviving value, and compute the mean. This gives you a price that represents what a typical card actually costs — not skewed by fire-sale listings or speculative moonshots.",
  },
  {
    q: "What does the Stability Score mean?",
    a: "The Stability Score is based on the Coefficient of Variation (CV) — standard deviation divided by mean, expressed as a percentage. 'Stable' (0–10%) means strong price agreement among listings. 'Active' (10–20%) indicates normal market activity. 'Volatile' (20–35%) shows meaningful price dispersion. 'Unstable' (35%+) signals high speculation or data noise — treat these averages with caution.",
  },
  {
    q: "How many athletes do you track?",
    a: "Over 550 Venezuelan athletes across baseball (MLB, MiLB), soccer (MLS, La Liga, Serie A, Ligue 1, Bundesliga), basketball (NBA), football (NFL), MMA (UFC), golf (PGA), tennis (WTA/ATP), BMX, track & field, and bowling. The roster updates monthly from multiple sports data APIs.",
  },
  {
    q: "How do you filter out junk listings?",
    a: "We use four independent filter layers: (1) API-level category and grading filters, (2) title-based detection for graded cards using tight regex patterns, (3) junk title exclusion for bulk lots, reprints, stickers, and digital cards, and (4) condition blocklists to exclude poor, damaged, or altered cards. Each layer catches what the others miss — defense in depth.",
  },
  {
    q: "What is Flip Potential?",
    a: "Cards marked as 'Volatile' or 'Unstable' may offer buy-low, sell-high opportunities because of wide price swings. Flip Potential is an informational signal, not financial advice. Always do your own research before making purchasing decisions.",
  },
  {
    q: "How do you handle eBay API failures?",
    a: "Our pipelines use a three-layer fallback chain: (1) GitHub Raw URLs serve the latest committed data, (2) local copies bundled with the frontend provide a fallback if GitHub is unavailable, (3) PostgreSQL database snapshots serve as disaster recovery. If any layer fails, the next takes over transparently.",
  },
  {
    q: "Can I suggest an athlete to track?",
    a: "Absolutely! Use the feedback form in the navigation menu or join our Facebook community. We regularly add new athletes based on collector interest and market activity.",
  },
];

export default function Methodology() {
  return (
    <div className="min-h-screen">
      <SEOHead
        title="Methodology & FAQ — How We Calculate Card Prices"
        description="Learn how VZLA Sports Elite calculates trading card prices using the Taguchi Winsorized Mean, multi-layer eBay data filtering, and automated daily pipelines. Frequently asked questions about our data, stability scores, and methodology."
        path="/methodology"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQ_ITEMS.map((item) => ({
            "@type": "Question",
            name: item.q,
            acceptedAnswer: { "@type": "Answer", text: item.a },
          })),
        }}
      />
      <VzlaNavbar />

      <main className="page-shell pt-8 max-w-4xl mx-auto">
        <Link to="/" className="text-sm text-muted-foreground hover:text-vzla-yellow transition-colors no-underline mb-4 inline-block">
          ← Back to Home
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-2">
            Methodology & FAQ
          </h1>
          <p className="text-muted-foreground text-base max-w-2xl leading-relaxed mb-8">
            How we collect, process, and deliver accurate market data for 550+ Venezuelan athletes' trading cards — and answers to your most common questions.
          </p>
        </motion.div>

        {/* ── Our Approach ── */}
        <motion.section {...fadeUp()} className="glass-panel p-6 md:p-8 rounded-xl mb-8">
          <h2 className="text-lg font-display font-bold text-flag-gradient mb-3">Our Data Collection Approach</h2>
          <div className="space-y-4 text-foreground/80 text-sm leading-7 text-justify">
            <p>
              Every day, <strong className="text-foreground">15+ automated pipelines</strong> scan eBay marketplaces for Venezuelan athletes' sports card listings and sold prices. These workflows run on staggered schedules to avoid API rate limits, collecting raw data from multiple eBay domains including the US, Canadian, and international marketplaces.
            </p>
            <p>
              The raw data passes through a rigorous cleaning process. First, we match listing titles against our database of 550+ athlete names, handling accent marks, alternate spellings, and nickname variations. Then, four independent filter layers remove junk listings — bulk lots, reprints, digital cards, stickers, and damaged items. Only legitimate, properly identified single-card listings survive this gauntlet.
            </p>
            <p>
              Once filtered, prices are processed using the <strong className="text-foreground">Taguchi Winsorized Mean</strong> — a statistical method that trims the top and bottom 20% of extreme prices before averaging. This produces market prices that reflect what collectors actually pay, not what outlier listings distort the picture to look like.
            </p>
          </div>
        </motion.section>

        {/* ── Statistical Methods ── */}
        <motion.section {...fadeUp(0.1)} className="glass-panel p-6 md:p-8 rounded-xl mb-8">
          <h2 className="text-lg font-display font-bold text-flag-gradient mb-3">Statistical Methods</h2>
          <div className="space-y-4 text-foreground/80 text-sm leading-7 text-justify">
            <p>
              Traditional price averages are misleading for sports cards. A simple mean of eBay listings would include $0.99 bulk lots alongside $500 graded gems, producing a number that represents neither category. Our approach addresses this with three complementary techniques:
            </p>
            <p>
              <strong className="text-foreground">1. Taguchi Winsorized Mean:</strong> We sort all prices, trim the most extreme 20% from each end, replace trimmed values with the nearest surviving value (winsorization), and compute the mean. Borrowed from industrial quality engineering, this method is specifically designed for datasets with heavy-tailed distributions — exactly what eBay price data looks like.
            </p>
            <p>
              <strong className="text-foreground">2. Coefficient of Variation (CV):</strong> Standard deviation divided by mean, expressed as a percentage. This single number tells you how much price agreement exists in the market. A CV of 10% means listings are tightly clustered — strong consensus on value. A CV of 50% means prices are all over the map — the "average" is less meaningful.
            </p>
            <p>
              <strong className="text-foreground">3. Sample Size Transparency:</strong> Every price on the platform shows how many listings contributed to the average. An average from 3 listings is fundamentally different from an average from 30. We display this count so collectors can judge reliability for themselves.
            </p>
          </div>
        </motion.section>

        <AdSenseInArticle />

        {/* ── Data Quality ── */}
        <motion.section {...fadeUp(0.15)} className="glass-panel p-6 md:p-8 rounded-xl mb-8">
          <h2 className="text-lg font-display font-bold text-flag-gradient mb-3">Data Quality & Reliability</h2>
          <div className="space-y-4 text-foreground/80 text-sm leading-7 text-justify">
            <p>
              In a data platform, bad data is worse than no data. A wrong price looks correct — users see a number and make decisions based on it. Our system treats data quality as a first-class monitoring concern, not an afterthought.
            </p>
            <p>
              <strong className="text-foreground">Four-layer filtering</strong> provides defense in depth: API-level category filters, title-based grading detection with regex pattern matching, junk title exclusion for bulk lots and non-card items, and condition blocklists to exclude damaged or altered cards. If any single layer fails, the others still catch most contamination.
            </p>
            <p>
              <strong className="text-foreground">Anomaly detection</strong> runs during every bi-weekly analysis cycle. Athletes with CVs above 100% or price changes exceeding 50% are automatically flagged for review. These anomalies often reveal upstream data issues — a changed eBay HTML structure, a failed API filter, or a new type of junk listing that our patterns haven't seen before.
            </p>
            <p>
              <strong className="text-foreground">Stability badges</strong> surface data quality directly to users. Rather than hiding uncertainty, we show it: "Stable," "Active," "Volatile," and "Unstable" badges translate technical CV values into actionable signals that help collectors decide how much trust to place in any given price.
            </p>
          </div>
        </motion.section>

        {/* ── Pipeline Architecture ── */}
        <motion.section {...fadeUp(0.2)} className="glass-panel p-6 md:p-8 rounded-xl mb-8">
          <h2 className="text-lg font-display font-bold text-flag-gradient mb-3">Pipeline Architecture</h2>
          <div className="space-y-4 text-foreground/80 text-sm leading-7 text-justify">
            <p>
              The platform runs on <strong className="text-foreground">15+ GitHub Actions workflows</strong> that operate like a team of research assistants who never sleep. Each workflow is responsible for a specific data domain — eBay raw listings, eBay sold prices, eBay graded listings, PSA population data, Beckett grading data, SGC population reports, and market analysis.
            </p>
            <p>
              Workflows run on staggered cron schedules to avoid API rate limits and Git merge conflicts. A daily eBay scan starts at midnight UTC, grading data refreshes at 6 AM, and historical snapshots consolidate at noon. Each workflow includes progress tracking — if interrupted, it resumes from where it left off rather than restarting from scratch.
            </p>
            <p>
              All data flows through Git version control, which means every price change is historically tracked, every data point is auditable, and the system can recover from any failure by rolling back to a known good state. Weekly snapshots consolidate all six data sources into a single unified file that powers the analytics dashboard.
            </p>
          </div>
        </motion.section>

        {/* ── FAQ ── */}
        <motion.section {...fadeUp(0.25)} className="mb-8">
          <h2 className="text-2xl font-display font-bold text-foreground mb-6 text-center">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {FAQ_ITEMS.map((item, i) => (
              <motion.details
                key={i}
                className="glass-panel rounded-xl overflow-hidden group"
                {...fadeUp(0.05 * i)}
              >
                <summary className="p-5 cursor-pointer font-display font-semibold text-foreground text-sm hover:text-vzla-yellow transition-colors list-none flex items-center justify-between">
                  {item.q}
                  <span className="text-muted-foreground group-open:rotate-180 transition-transform ml-3 flex-shrink-0">▾</span>
                </summary>
                <div className="px-5 pb-5 text-foreground/80 text-sm leading-7">
                  {item.a}
                </div>
              </motion.details>
            ))}
          </div>
        </motion.section>

        {/* ── CTA ── */}
        <motion.section {...fadeUp(0.3)} className="glass-panel p-6 md:p-8 rounded-xl mb-8 text-center">
          <h2 className="text-lg font-display font-bold text-flag-gradient mb-3">Want to Learn More?</h2>
          <p className="text-foreground/80 text-sm leading-7 mb-4 max-w-xl mx-auto">
            Explore our detailed technical guide on how the entire data pipeline works, from eBay API queries to the statistical models that power every price you see.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link to="/how-it-works" className="cta-flag px-5 py-2.5 rounded-lg font-display font-bold text-sm text-white no-underline hover:opacity-90 transition-opacity">
              How It Works →
            </Link>
            <Link to="/blog" className="px-5 py-2.5 rounded-lg border border-border font-display font-bold text-sm text-foreground no-underline hover:border-vzla-yellow/50 transition-colors">
              Read Our Blog →
            </Link>
          </div>
        </motion.section>

        <VzlaFooter />
      </main>
      <VzlaEbayFooter />
    </div>
  );
}
