import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import SEOHead from "@/components/SEOHead";
import VzlaNavbar from "@/components/VzlaNavbar";
import VzlaFooter from "@/components/VzlaFooter";
import VzlaEbayFooter from "@/components/VzlaEbayFooter";
import VzlaStoreBanner from "@/components/VzlaStoreBanner";
import VzlaSideBanner from "@/components/VzlaSideBanner";
import { useLanguage } from "@/i18n/LanguageProvider";
import type { TranslationKey } from "@/i18n/translations";


const EBAY_STORE =
  "https://www.ebay.ca/str/localherossportscards?mkcid=1&mkrid=706-53473-19255-0&siteid=2&campid=5339142305&toolid=10001&mkevt=1";

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] as const },
});

const About = () => {
  const { t } = useLanguage();

  return (
    <div id="top" className="min-h-screen">
      <SEOHead
        title="About Us — Story, Mission & Methodology"
        description="VZLA Sports Elite tracks 550+ Venezuelan athletes' sports cards daily. Learn about our Taguchi pricing, eBay data pipelines, and mission."
        path="/about"
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "AboutPage",
            name: "About VZLA Sports Elite",
            description: "The story, mission, and methodology behind VZLA Sports Elite — the eBay price index for Venezuelan athletes' trading cards.",
            mainEntityOfPage: "https://vzlasportselite.com/about",
          },
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: [
              {
                "@type": "Question",
                name: "How often is the data updated?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Our automated pipelines run on schedule. eBay listing prices, sold averages, and athlete rosters are refreshed on the last scan. PSA and Beckett population data is updated on a regular schedule, and the bi-weekly market analysis report runs on the 1st and 15th of each month.",
                },
              },
              {
                "@type": "Question",
                name: "What sports do you cover?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "We track Venezuelan athletes across baseball (MLB, minor leagues, and LVBP), soccer (MLS and international), basketball (NBA and Superliga), MMA, tennis, and boxing. Baseball is our largest category with 490+ athletes tracked.",
                },
              },
              {
                "@type": "Question",
                name: "What does 'Taguchi Winsorized Mean' mean?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "It's a statistical method that removes extreme outliers (the highest and lowest 10% of prices) before calculating an average. This gives you a much more realistic price than a simple average, which can be skewed by a single very expensive or very cheap listing.",
                },
              },
              {
                "@type": "Question",
                name: "What are the investment signals (Buy Low, Flip Potential, etc.)?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "These are data-driven indicators calculated from our pricing models. 'Buy Low' means the sold price is below the listing price — a potential bargain. 'Flip Potential' flags volatile cards with wide price swings. 'Signal Strength' uses the Taguchi S/N ratio to measure how predictable pricing is. These are informational tools, not financial advice.",
                },
              },
              {
                "@type": "Question",
                name: "Can I suggest an athlete to add?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "Absolutely! We're always expanding our roster. Reach out through our Facebook community or eBay store and let us know which Venezuelan athletes you'd like to see tracked.",
                },
              },
              {
                "@type": "Question",
                name: "Is this financial advice?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: "No. All investment signals, price indexes, ROI calculations, and market analysis on this site are for informational purposes only and do not constitute financial or professional advice. Please read our full disclaimer on our Privacy Policy page.",
                },
              },
            ],
          },
        ]}
      />
      <VzlaNavbar />
      <VzlaSideBanner />

      <main className="page-shell">
        {/* ── Hero ── */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
          className="hero-panel text-center mb-8 p-10 md:p-14"
        >
          <div className="text-[10px] tracking-[0.22em] uppercase font-bold text-muted-foreground mb-4">
            {t("about.eyebrow")}
          </div>

          <h1 className="text-4xl md:text-5xl font-display font-bold mb-4 leading-[1.05] text-glow">
            VZLA <span className="text-flag-gradient">SPORTS ELITE</span>
          </h1>

          <p className="text-muted-foreground text-base max-w-2xl mx-auto leading-relaxed">
            {t("about.subtitle")}
          </p>
        </motion.section>

        {/* ── Our Story ── */}
        <motion.section {...fadeUp()} className="glass-panel p-6 md:p-8 rounded-xl mb-8">
          <h2 className="text-lg font-display font-bold text-flag-gradient mb-4 text-center">{t("about.story.title")}</h2>
          <div className="max-w-3xl mx-auto space-y-5 text-foreground/80 text-sm leading-7 text-justify text-pretty">
            <p>{t("about.story.p1")}</p>
            <p>{t("about.story.p2")}</p>
            <p>
              {t("about.story.p3a")}
              <a
                className="text-vzla-yellow font-bold no-underline hover:underline"
                href={EBAY_STORE}
                target="_blank"
                rel="noopener noreferrer"
              >
                @localheros_sportscards
              </a>
              {t("about.story.p3b")}
            </p>
            <p>{t("about.story.p4")}</p>
            <p>{t("about.story.p5")}</p>
          </div>
        </motion.section>

        {/* ── Mission, Beliefs, Why It Matters ── */}
        <motion.div {...fadeUp(0.1)} className="grid md:grid-cols-3 gap-6 mb-8">
          {[
            { title: "about.believe.title", paragraphs: ["about.believe.p1", "about.believe.p2"] },
            { title: "about.mission.title", paragraphs: ["about.mission.p1", "about.mission.p2", "about.mission.p3"] },
            { title: "about.why.title", paragraphs: ["about.why.p1", "about.why.p2"] },
          ].map((card) => (
            <div key={card.title} className="glass-panel p-6 flex flex-col">
              <h2 className="font-display font-bold text-base mb-3 uppercase tracking-wide">
                {t(card.title as TranslationKey)}
              </h2>
              {card.paragraphs.map((key, j) => (
                <p key={key} className={`text-foreground/75 leading-relaxed text-sm ${j > 0 ? "mt-4" : ""}`}>
                  {t(key as TranslationKey)}
                </p>
              ))}
            </div>
          ))}
        </motion.div>

        {/* ── How Our Data Works ── */}
        <motion.section {...fadeUp(0.1)} className="glass-panel p-6 md:p-8 rounded-xl mb-8">
          <h2 className="text-lg font-display font-bold text-flag-gradient mb-4">{t("about.data.title")}</h2>
          <p className="text-muted-foreground text-sm leading-7 text-justify mb-6">
            {t("about.data.intro")}
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { icon: "🔄", n: 1 },
              { icon: "📊", n: 2 },
              { icon: "📈", n: 3 },
              { icon: "🛡️", n: 4 },
              { icon: "📸", n: 5 },
              { icon: "🎯", n: 6 },
              { icon: "🔐", n: 7 },
            ].map(({ icon, n }) => (
              <div key={n} className="border border-border/50 rounded-lg p-4 bg-secondary/30">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{icon}</span>
                  <h3 className="font-display font-bold text-foreground text-sm">
                    {t(`about.data.${n}.title` as TranslationKey)}
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {t(`about.data.${n}.desc` as TranslationKey)}
                </p>
              </div>
            ))}
          </div>

          <p className="text-xs text-muted-foreground mt-4 italic">
            {t("about.data.moreA")}
            <Link to="/how-it-works" className="text-vzla-yellow hover:underline">{t("about.data.moreLink")}</Link>
            {t("about.data.moreB")}
          </p>
        </motion.section>

        {/* ── Community ── */}
        <motion.section {...fadeUp(0.15)} className="glass-panel p-6 md:p-8 rounded-xl mb-8">
          <h2 className="text-lg font-display font-bold text-flag-gradient mb-4">{t("about.community.title")}</h2>
          <div className="max-w-3xl space-y-5 text-foreground/80 text-sm leading-7 text-justify">
            <p>{t("about.community.p1")}</p>
            <p>
              {t("about.community.p2a")}
              <a
                href="https://www.facebook.com/groups/1591729798708721"
                target="_blank"
                rel="noopener noreferrer"
                className="text-vzla-yellow font-bold no-underline hover:underline"
              >
                {t("about.community.link")}
              </a>
              {t("about.community.p2b")}
            </p>
          </div>
        </motion.section>

        {/* ── FAQ ── */}
        <motion.section {...fadeUp(0.2)} className="glass-panel p-6 md:p-8 rounded-xl mb-8">
          <h2 className="text-lg font-display font-bold text-flag-gradient mb-4">{t("about.faq.title")}</h2>
          <div className="space-y-5">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="border-b border-border/30 pb-4 last:border-0">
                <h3 className="font-display font-bold text-foreground text-sm mb-1.5">
                  {t(`about.faq.${n}.q` as TranslationKey)}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {t(`about.faq.${n}.a` as TranslationKey)}
                </p>
              </div>
            ))}
          </div>
        </motion.section>

        <VzlaStoreBanner />
        <VzlaFooter />
      </main>

      <VzlaEbayFooter />
    </div>
  );
};

export default About;
