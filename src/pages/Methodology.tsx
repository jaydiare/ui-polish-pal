import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import SEOHead from "@/components/SEOHead";
import VzlaNavbar from "@/components/VzlaNavbar";
import VzlaFooter from "@/components/VzlaFooter";
import VzlaEbayFooter from "@/components/VzlaEbayFooter";
import AdSenseInArticle from "@/components/AdSenseInArticle";
import RichText from "@/components/RichText";
import { useLanguage } from "@/i18n/LanguageProvider";
import type { TranslationKey } from "@/i18n/translations";

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] as const },
});

const FAQ_ITEMS = [
  {
    q: "How often are prices updated?",
    a: "eBay listing averages refresh on the last scan through automated pipelines. Sold price comps update in rolling batches. PSA and BGS population data refreshes on a weekly schedule. The bi-weekly market analysis report runs on the 1st and 15th of each month.",
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
  const { t } = useLanguage();

  return (
    <div className="min-h-screen">
      <SEOHead
        title="Methodology — How We Price Cards"
        description="Learn how VZLA Sports Elite calculates card prices using the Taguchi Winsorized Mean, eBay filtering, and daily pipelines. FAQ included."
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
          {t("methodology.back")}
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-2">
            {t("methodology.title")}
          </h1>
          <p className="text-muted-foreground text-base max-w-2xl leading-relaxed mb-8">
            {t("methodology.subtitle")}
          </p>
        </motion.div>

        {/* ── Our Approach ── */}
        <motion.section {...fadeUp()} className="glass-panel p-6 md:p-8 rounded-xl mb-8">
          <h2 className="text-lg font-display font-bold text-flag-gradient mb-3">{t("methodology.approach.title")}</h2>
          <div className="space-y-4 text-foreground/80 text-sm leading-7 text-justify">
            {["methodology.approach.p1", "methodology.approach.p2", "methodology.approach.p3"].map((key) => (
              <p key={key}><RichText text={t(key as TranslationKey)} /></p>
            ))}
          </div>
        </motion.section>

        {/* ── Statistical Methods ── */}
        <motion.section {...fadeUp(0.1)} className="glass-panel p-6 md:p-8 rounded-xl mb-8">
          <h2 className="text-lg font-display font-bold text-flag-gradient mb-3">{t("methodology.stats.title")}</h2>
          <div className="space-y-4 text-foreground/80 text-sm leading-7 text-justify">
            {["methodology.stats.p1", "methodology.stats.p2", "methodology.stats.p3", "methodology.stats.p4"].map((key) => (
              <p key={key}><RichText text={t(key as TranslationKey)} /></p>
            ))}
          </div>
        </motion.section>

        <AdSenseInArticle />

        {/* ── Data Quality ── */}
        <motion.section {...fadeUp(0.15)} className="glass-panel p-6 md:p-8 rounded-xl mb-8">
          <h2 className="text-lg font-display font-bold text-flag-gradient mb-3">{t("methodology.quality.title")}</h2>
          <div className="space-y-4 text-foreground/80 text-sm leading-7 text-justify">
            {["methodology.quality.p1", "methodology.quality.p2", "methodology.quality.p3", "methodology.quality.p4"].map((key) => (
              <p key={key}><RichText text={t(key as TranslationKey)} /></p>
            ))}
          </div>
        </motion.section>

        {/* ── Pipeline Architecture ── */}
        <motion.section {...fadeUp(0.2)} className="glass-panel p-6 md:p-8 rounded-xl mb-8">
          <h2 className="text-lg font-display font-bold text-flag-gradient mb-3">{t("methodology.pipeline.title")}</h2>
          <div className="space-y-4 text-foreground/80 text-sm leading-7 text-justify">
            {["methodology.pipeline.p1", "methodology.pipeline.p2", "methodology.pipeline.p3"].map((key) => (
              <p key={key}><RichText text={t(key as TranslationKey)} /></p>
            ))}
          </div>
        </motion.section>

        {/* ── FAQ ── */}
        <motion.section {...fadeUp(0.25)} className="mb-8">
          <h2 className="text-2xl font-display font-bold text-foreground mb-6 text-center">{t("methodology.faq.title")}</h2>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n, i) => (
              <motion.details
                key={n}
                className="glass-panel rounded-xl overflow-hidden group"
                {...fadeUp(0.05 * i)}
              >
                <summary className="p-5 cursor-pointer font-display font-semibold text-foreground text-sm hover:text-vzla-yellow transition-colors list-none flex items-center justify-between">
                  {t(`methodology.faq.${n}.q` as TranslationKey)}
                  <span className="text-muted-foreground group-open:rotate-180 transition-transform ml-3 flex-shrink-0">▾</span>
                </summary>
                <div className="px-5 pb-5 text-foreground/80 text-sm leading-7">
                  {t(`methodology.faq.${n}.a` as TranslationKey)}
                </div>
              </motion.details>
            ))}
          </div>
        </motion.section>

        {/* ── CTA ── */}
        <motion.section {...fadeUp(0.3)} className="glass-panel p-6 md:p-8 rounded-xl mb-8 text-center">
          <h2 className="text-lg font-display font-bold text-flag-gradient mb-3">{t("methodology.cta.title")}</h2>
          <p className="text-foreground/80 text-sm leading-7 mb-4 max-w-xl mx-auto">
            {t("methodology.cta.desc")}
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link to="/how-it-works" className="cta-flag px-5 py-2.5 rounded-lg font-display font-bold text-sm text-white no-underline hover:opacity-90 transition-opacity">
              {t("methodology.cta.howItWorks")}
            </Link>
            <Link to="/blog" className="px-5 py-2.5 rounded-lg border border-border font-display font-bold text-sm text-foreground no-underline hover:border-vzla-yellow/50 transition-colors">
              {t("methodology.cta.blog")}
            </Link>
          </div>
        </motion.section>

        <VzlaFooter />
      </main>
      <VzlaEbayFooter />
    </div>
  );
}
