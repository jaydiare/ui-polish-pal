import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import SEOHead from "@/components/SEOHead";
import VzlaNavbar from "@/components/VzlaNavbar";
import VzlaFooter from "@/components/VzlaFooter";
import VzlaEbayFooter from "@/components/VzlaEbayFooter";

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] },
});

export default function HowItWorks() {
  return (
    <div className="min-h-screen">
      <SEOHead
        title="How It Works — Our Data Pipeline Explained"
        description="A plain-English guide to how VZLA Sports Elite collects, processes, and delivers daily market data for 550+ Venezuelan athletes' sports cards. Learn about our 15+ automated pipelines, Taguchi statistical pricing, and real-time eBay market intelligence."
        path="/how-it-works"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: [
            {
              "@type": "Question",
              name: "How does VZLA Sports Elite collect card pricing data?",
              acceptedAnswer: { "@type": "Answer", text: "We use 15+ automated GitHub Actions workflows that scan eBay listings and sold data daily using the eBay Browse API, with HTML scraping as a fallback. Each workflow runs on a staggered schedule to avoid API rate limits and Git conflicts." },
            },
            {
              "@type": "Question",
              name: "What is the Taguchi Winsorized Mean?",
              acceptedAnswer: { "@type": "Answer", text: "A statistical method that removes the top and bottom 10% of extreme prices before averaging. This produces more reliable price estimates that aren't skewed by outlier listings." },
            },
            {
              "@type": "Question",
              name: "How often is the data updated?",
              acceptedAnswer: { "@type": "Answer", text: "eBay listing and sold prices update daily. PSA/BGS population data refreshes on a regular schedule. The bi-weekly market analysis runs on the 1st and 15th of each month." },
            },
          ],
        }}
      />
      <VzlaNavbar />

      <main className="page-shell pt-8 max-w-4xl mx-auto">
        <Link to="/about" className="text-sm text-muted-foreground hover:text-vzla-yellow transition-colors no-underline mb-4 inline-block">
          ← Back to About
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-2">
            How It Works
          </h1>
          <p className="text-muted-foreground text-base max-w-2xl leading-relaxed mb-8">
            A plain-English guide to how we collect, process, and deliver daily market intelligence for 550+ Venezuelan athletes' trading cards.
          </p>
        </motion.div>

        {/* ── Section 1: The Big Picture ── */}
        <motion.section {...fadeUp()} className="glass-panel p-6 md:p-8 rounded-xl mb-8">
          <h2 className="text-lg font-display font-bold text-flag-gradient mb-3">The Big Picture</h2>
          <div className="space-y-4 text-foreground/80 text-sm leading-7 text-justify">
            <p>
              Every day, our platform runs <strong className="text-foreground">15+ automated workflows</strong> that scan eBay for the latest listing and sold prices of Venezuelan athletes' sports cards. These workflows collect raw data, clean it using statistical methods, and publish the results to our website — all without any manual intervention.
            </p>
            <p>
              Think of it as a team of research assistants who never sleep. They check every major eBay marketplace, cross-reference names across different formats and spellings, filter out junk listings and mismatches, and calculate accurate market prices using the same statistical rigor used in industrial quality engineering.
            </p>
            <p>
              The entire system is built on top of <strong className="text-foreground">Git version control</strong>, which means every data point is historically tracked, every change is auditable, and the system can recover from any failure without losing data.
            </p>
          </div>
        </motion.section>

        {/* ── Section 2: Data Collection ── */}
        <motion.section {...fadeUp()} className="glass-panel p-6 md:p-8 rounded-xl mb-8">
          <h2 className="text-lg font-display font-bold text-flag-gradient mb-3">Step 1: Data Collection</h2>
          <div className="space-y-4 text-foreground/80 text-sm leading-7 text-justify">
            <p>
              Our primary data source is the <strong className="text-foreground">eBay Browse API</strong>, which provides structured listing data including prices, conditions, and seller information. For each of the 550+ athletes in our roster, we search eBay using a multi-variant name strategy — accounting for accents, hyphens, middle names, and common misspellings that are unique to Latin American names.
            </p>
            <p>
              For example, "José Altuve" might appear on eBay as "Jose Altuve", "J. Altuve", or "ALTUVE JOSE". Our system generates <strong className="text-foreground">six normalized variants</strong> of each athlete's name to ensure we capture every relevant listing without false matches.
            </p>
            <p>
              We collect four distinct data streams: <strong className="text-foreground">raw card listings</strong> (active eBay prices), <strong className="text-foreground">raw sold comps</strong> (completed sales), <strong className="text-foreground">graded card listings</strong> (PSA/BGS/SGC certified), and <strong className="text-foreground">graded sold comps</strong>. Each stream runs as its own independent workflow on a staggered schedule to avoid overwhelming eBay's rate limits.
            </p>
          </div>
        </motion.section>

        {/* ── Section 3: Statistical Processing ── */}
        <motion.section {...fadeUp()} className="glass-panel p-6 md:p-8 rounded-xl mb-8">
          <h2 className="text-lg font-display font-bold text-flag-gradient mb-3">Step 2: Statistical Processing</h2>
          <div className="space-y-4 text-foreground/80 text-sm leading-7 text-justify">
            <p>
              Raw eBay data is messy. A simple average of listings for "Ronald Acuña Jr. cards" might include a $0.99 damaged common alongside a $5,000 PSA 10 rookie. That average would be meaningless. This is why we use the <strong className="text-foreground">Taguchi Winsorized Mean</strong>.
            </p>
            <p>
              Named after quality engineering pioneer Genichi Taguchi, our Winsorized Mean works by sorting all prices, removing the top and bottom 10% of extreme values, and then averaging the remaining 80%. The result is a price that genuinely reflects what a "typical" card for that athlete sells for — not what one outlier listing says.
            </p>
            <p>
              Beyond the average price, we calculate two additional metrics for every athlete:
            </p>
            <ul className="space-y-2 ml-4">
              <li className="flex items-start gap-2">
                <span className="text-vzla-yellow mt-0.5">•</span>
                <span><strong className="text-foreground">Coefficient of Variation (CV)</strong> — measures how spread out the prices are. A low CV (under 10%) means prices are clustered tightly, indicating a stable market. A high CV (over 35%) means wild price swings — useful for flippers, risky for investors.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-vzla-yellow mt-0.5">•</span>
                <span><strong className="text-foreground">Signal-to-Noise Ratio (S/N)</strong> — borrowed from electrical engineering and measured in decibels: 10 × log₁₀(1/CV²). Higher S/N means the "signal" (true market price) is strong relative to the "noise" (random variation). Athletes with high S/N ratios are the most predictable investments.</span>
              </li>
            </ul>
          </div>
        </motion.section>

        {/* ── Section 4: Pipeline Orchestration ── */}
        <motion.section {...fadeUp()} className="glass-panel p-6 md:p-8 rounded-xl mb-8">
          <h2 className="text-lg font-display font-bold text-flag-gradient mb-3">Step 3: Pipeline Orchestration</h2>
          <div className="space-y-4 text-foreground/80 text-sm leading-7 text-justify">
            <p>
              Running 15+ workflows daily creates a coordination challenge. If two workflows try to update the same data file at the same time, one will fail. If a workflow runs before its data dependency is ready, it produces stale results.
            </p>
            <p>
              We solve this with <strong className="text-foreground">temporal orchestration</strong> — a carefully designed schedule where each workflow runs at a specific time of day, with buffer windows between dependent jobs. For example:
            </p>
            <div className="bg-background/60 rounded-lg p-4 border border-border/50 text-xs font-mono space-y-1">
              <div className="text-muted-foreground">06:00 UTC — Raw eBay listing scan (all athletes)</div>
              <div className="text-muted-foreground">07:00 UTC — Graded eBay listing scan</div>
              <div className="text-muted-foreground">08:00 UTC — Sold comps collection (raw + graded)</div>
              <div className="text-muted-foreground">10:00 UTC — Daily history snapshot (depends on fresh listings)</div>
              <div className="text-muted-foreground">12:00 UTC — Market index calculation (Sundays)</div>
              <div className="text-muted-foreground">14:00 UTC — Bi-weekly market analysis (1st & 15th)</div>
            </div>
            <p>
              Each workflow also includes <strong className="text-foreground">concurrency guards</strong> to prevent duplicate runs, <strong className="text-foreground">batch checkpointing</strong> to resume after failures, and <strong className="text-foreground">exponential backoff</strong> for API rate limits. If a workflow fails at athlete #300 out of 550, it picks up right where it left off on the next run — no data is lost.
            </p>
          </div>
        </motion.section>

        {/* ── Section 5: Investment Signals ── */}
        <motion.section {...fadeUp()} className="glass-panel p-6 md:p-8 rounded-xl mb-8">
          <h2 className="text-lg font-display font-bold text-flag-gradient mb-3">Step 4: Investment Signals</h2>
          <div className="space-y-4 text-foreground/80 text-sm leading-7 text-justify">
            <p>
              Raw data becomes actionable through our <strong className="text-foreground">five investment signal categories</strong>, each derived from the statistical metrics described above:
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { signal: "Buy Low", color: "text-green-400", desc: "Listed price is below the average sold price — the market may be underpricing this card. Think of it like finding a stock trading below its book value." },
                { signal: "Flip Potential", color: "text-vzla-yellow", desc: "High price volatility (CV > 20%) creates opportunities to buy during dips and sell during spikes. Best for active traders who watch the market daily." },
                { signal: "Signal Strength", color: "text-blue-400", desc: "Based on the Taguchi S/N ratio — athletes with high signal strength have predictable, reliable pricing. Ideal for long-term investments." },
                { signal: "Fast Mover", color: "text-orange-400", desc: "Low days on market indicates high demand — these cards sell quickly. Combined with other signals, a fast mover can indicate a card that's about to appreciate." },
              ].map(({ signal, color, desc }) => (
                <div key={signal} className="border border-border/50 rounded-lg p-4 bg-secondary/30">
                  <h3 className={`font-display font-bold text-sm ${color} mb-1`}>{signal}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground italic mt-2">
              These signals are calculated automatically and updated daily. They are informational tools — not financial advice. See our <Link to="/privacy" className="text-vzla-yellow hover:underline">Privacy Policy</Link> for the full disclaimer.
            </p>
          </div>
        </motion.section>

        {/* ── Section 6: Grading Data ── */}
        <motion.section {...fadeUp()} className="glass-panel p-6 md:p-8 rounded-xl mb-8">
          <h2 className="text-lg font-display font-bold text-flag-gradient mb-3">Step 5: Grading Population Data</h2>
          <div className="space-y-4 text-foreground/80 text-sm leading-7 text-justify">
            <p>
              Beyond eBay market data, we track <strong className="text-foreground">PSA and Beckett/BGS grading populations</strong> — the total number of professionally certified cards for each athlete. This data comes from population report scans and tells you how scarce a graded card truly is.
            </p>
            <p>
              An athlete with only 50 PSA-graded cards has a fundamentally different market dynamic than one with 5,000. Low population + high demand = price pressure. We surface this through the <strong className="text-foreground">"Scarce + In-Demand"</strong> scatter chart on the Market Intel page, which plots supply (PSA pop) against demand (sold volume) to identify athletes in the sweet spot.
            </p>
            <p>
              Graded data also powers our <strong className="text-foreground">market cap estimates</strong> — calculated as the sum of (Average Price × PSA Population) across all tracked athletes. This gives collectors a macro view of the total market value of Venezuelan sports cards.
            </p>
          </div>
        </motion.section>

        {/* ── Section 7: Data Quality ── */}
        <motion.section {...fadeUp()} className="glass-panel p-6 md:p-8 rounded-xl mb-8">
          <h2 className="text-lg font-display font-bold text-flag-gradient mb-3">Data Quality & Transparency</h2>
          <div className="space-y-4 text-foreground/80 text-sm leading-7 text-justify">
            <p>
              We take data quality seriously. Every listing goes through multiple filters before it contributes to an athlete's price:
            </p>
            <ul className="space-y-2 ml-4">
              <li className="flex items-start gap-2">
                <span className="text-vzla-yellow mt-0.5">•</span>
                <span><strong className="text-foreground">Name matching</strong> — fuzzy matching with 6 normalized variants ensures the right cards map to the right athletes.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-vzla-yellow mt-0.5">•</span>
                <span><strong className="text-foreground">Junk removal</strong> — listings for card cases, lot bundles, and non-card items are filtered out automatically.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-vzla-yellow mt-0.5">•</span>
                <span><strong className="text-foreground">Condition checks</strong> — raw and graded cards are separated into distinct data streams to prevent mixing price points.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-vzla-yellow mt-0.5">•</span>
                <span><strong className="text-foreground">Outlier removal</strong> — the Taguchi method removes the top/bottom 10% before any average is calculated.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-vzla-yellow mt-0.5">•</span>
                <span><strong className="text-foreground">Cross-marketplace</strong> — we scan both eBay US and eBay Canada, then average across marketplaces for a global price.</span>
              </li>
            </ul>
            <p>
              The distinction between "scraped" data (total raw sample) and "sold after filters" data (clean subset) is always clearly labeled throughout the platform. Analytics and charts prioritize the filtered data for accuracy.
            </p>
          </div>
        </motion.section>

        {/* ── CTA ── */}
        <motion.section {...fadeUp()} className="text-center py-8">
          <p className="text-muted-foreground text-sm mb-4">
            Ready to explore the data?
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link to="/" className="cta-yellow px-6 py-2.5 rounded-lg text-sm font-bold no-underline">
              Browse Athletes
            </Link>
            <Link to="/data" className="px-6 py-2.5 rounded-lg text-sm font-bold border border-border bg-secondary text-foreground no-underline hover:bg-muted transition-colors">
              Market Intel Dashboard
            </Link>
          </div>
        </motion.section>

        <VzlaFooter />
      </main>
      <VzlaEbayFooter />
    </div>
  );
}
