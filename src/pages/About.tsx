import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useEffect } from "react";
import SEOHead from "@/components/SEOHead";
import VzlaNavbar from "@/components/VzlaNavbar";
import VzlaFooter from "@/components/VzlaFooter";
import VzlaEbayFooter from "@/components/VzlaEbayFooter";
import VzlaStoreBanner from "@/components/VzlaStoreBanner";
import VzlaSideBanner from "@/components/VzlaSideBanner";

const TwitterFeed = () => {
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://platform.twitter.com/widgets.js";
    script.async = true;
    script.charset = "utf-8";
    document.body.appendChild(script);
    return () => { document.body.removeChild(script); };
  }, []);

  return (
    <aside className="hidden xl:block fixed right-4 top-24 w-[350px] max-h-[calc(100vh-120px)] overflow-y-auto z-30 rounded-xl">
      <a
        className="twitter-timeline"
        data-theme="dark"
        data-height="600"
        data-chrome="noheader nofooter noborders transparent"
        href="https://twitter.com/jdiegorceli1"
      >
        Tweets by @jdiegorceli1
      </a>
    </aside>
  );
};

const EBAY_STORE =
  "https://www.ebay.ca/str/localherossportscards?mkcid=1&mkrid=706-53473-19255-0&siteid=2&campid=5339142305&toolid=10001&mkevt=1";

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] as const },
});

const About = () => {
  return (
    <div id="top" className="min-h-screen">
      <SEOHead
        title="About Us — Our Story, Mission & Methodology"
        description="VZLA Sports Elite was born from a shared Venezuelan passion for sports cards. Learn how we track 550+ athletes daily with Taguchi statistical pricing, automated eBay data pipelines, and PSA population analytics to help collectors make smarter decisions."
        path="/about"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "AboutPage",
          name: "About VZLA Sports Elite",
          description: "The story, mission, and methodology behind VZLA Sports Elite — the daily eBay price index for Venezuelan athletes' trading cards.",
          mainEntityOfPage: "https://vzlasportselite.com/about",
        }}
      />
      <VzlaNavbar />
      <VzlaSideBanner />
      <TwitterFeed />
      <main className="page-shell">
        {/* ── Hero ── */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
          className="hero-panel text-center mb-8 p-10 md:p-14"
        >
          <div className="text-[10px] tracking-[0.22em] uppercase font-bold text-muted-foreground mb-4">
            ABOUT
          </div>

          <h1 className="text-4xl md:text-5xl font-display font-bold mb-4 leading-[1.05] text-glow">
            VZLA <span className="text-flag-gradient">SPORTS ELITE</span>
          </h1>

          <p className="text-muted-foreground text-base max-w-2xl mx-auto leading-relaxed">
            The daily market intelligence platform tracking 550+ Venezuelan athletes' trading cards across baseball, soccer, basketball, MMA, and tennis — built by collectors, for collectors.
          </p>
        </motion.section>

        {/* ── Our Story ── */}
        <motion.section {...fadeUp()} className="glass-panel p-6 md:p-8 rounded-xl mb-8">
          <h2 className="text-lg font-display font-bold text-flag-gradient mb-4 text-center">Our Story</h2>
          <div className="max-w-3xl mx-auto space-y-5 text-foreground/80 text-sm leading-7 text-justify text-pretty">
            <p>
              In Venezuela, many of us grew up trading sports cards, especially baseball cards, and collecting World Cup sticker albums. We remember the excitement of racing to complete an album before kickoff and the pride of finally finishing it.
            </p>
            <p>
              For a long time, we believed these collectibles were only sentimental. Today, we understand something more. Sports cards and memorabilia can hold real value over time, especially when properly preserved and cared for.
            </p>
            <p>
              This is how, in September of 2023, we decided to embark on this journey and open the store{" "}
              <a
                className="text-vzla-yellow font-bold no-underline hover:underline"
                href={EBAY_STORE}
                target="_blank"
                rel="noopener noreferrer"
              >
                @localheros_sportscards
              </a>
              . We started growing our personal collection and selling valuable cards we had no idea were worth so much after holding them for so many years.
            </p>
            <p>
              What began as a personal hobby quickly grew into something bigger. We realized that there was no dedicated platform for tracking the market value of Venezuelan athletes' sports cards. Collectors had to piece together information from scattered eBay searches, social media groups, and word of mouth. There was no single source of truth — no price index, no stability scores, no way to compare raw vs graded values across hundreds of athletes at once.
            </p>
            <p>
              So we built one. VZLA Sports Elite started as a simple spreadsheet tracking a handful of players. Today it's a full-stack market intelligence platform with 15+ automated data pipelines running daily, statistical pricing models, and analytics covering every major sport where Venezuelan athletes compete.
            </p>
          </div>
        </motion.section>

        {/* ── Mission, Beliefs, Why It Matters ── */}
        <motion.div {...fadeUp(0.1)} className="grid md:grid-cols-3 gap-6 mb-8">
          {[
            {
              title: "What We Believe",
              paragraphs: [
                "For many Venezuelans, sports cards are simply memories. Yet behind every card lies real potential. When condition, rarity, and demand align, collectibles become assets.",
                "At VZLA Sports Elite, knowledge is what empowers Venezuelan buyers and collectors around the world who follow Venezuelan athletes to make informed, confident decisions.",
              ],
            },
            {
              title: "Our Mission",
              paragraphs: [
                "VZLA Sports Elite was created to make it easy for Venezuelans around the world to discover and support their favorite hometown athletes.",
                "We also aim to help buyers from Venezuela and collectors worldwide who are passionate about Venezuelan athletes find the cards and memorabilia they're looking for.",
                "Beyond simply showcasing athletes, our mission is to share knowledge about this hobby and help collectors understand how to preserve and protect the long-term value of their collections.",
              ],
            },
            {
              title: "Why It Matters",
              paragraphs: [
                "Whether you started collecting recently, have been doing it quietly for many years, inherited a large collection from your father or grandfather, or received cards from a friend, your collection has potential.",
                "We want to help you collect with confidence — understanding what your cards are worth, when to buy, when to hold, and how to protect what you have.",
              ],
            },
          ].map((card, i) => (
            <div key={card.title} className="glass-panel p-6 flex flex-col">
              <h2 className="font-display font-bold text-base mb-3 uppercase tracking-wide">
                {card.title}
              </h2>
              {card.paragraphs.map((p, j) => (
                <p key={j} className={`text-foreground/75 leading-relaxed text-sm ${j > 0 ? "mt-4" : ""}`}>
                  {p}
                </p>
              ))}
            </div>
          ))}
        </motion.div>

        {/* ── How Our Data Works ── */}
        <motion.section {...fadeUp(0.1)} className="glass-panel p-6 md:p-8 rounded-xl mb-8">
          <h2 className="text-lg font-display font-bold text-flag-gradient mb-4">How Our Data Works</h2>
          <p className="text-muted-foreground text-sm leading-7 text-justify mb-6">
            Transparency is core to what we do. Every number on this site is backed by real eBay market data, processed through automated pipelines, and validated using robust statistical methods. Here's how it all comes together:
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              {
                icon: "🔄",
                title: "15+ Automated Pipelines",
                desc: "GitHub Actions workflows run daily to scan eBay listings, track sold prices, update PSA/BGS population data, and snapshot historical trends. No manual data entry — every number is programmatically sourced and verified.",
              },
              {
                icon: "📊",
                title: "Taguchi Statistical Pricing",
                desc: "We don't use simple averages. Our Taguchi Winsorized Mean removes extreme outliers (top and bottom 10%) before calculating prices, giving you a more accurate picture of what cards actually sell for — not what one outlier listing says.",
              },
              {
                icon: "📈",
                title: "Stability & Signal Scores",
                desc: "Every athlete gets a Coefficient of Variation (CV) stability score and a Signal-to-Noise ratio measured in decibels. These tell you how predictable an athlete's pricing is — essential for identifying reliable investments vs speculative flips.",
              },
              {
                icon: "🛡️",
                title: "Multi-Source Verification",
                desc: "Prices are cross-referenced across eBay US and Canada, listed and sold data, raw and graded markets, and PSA population reports. A 6-variant name normalization strategy ensures we match the right cards to the right athletes every time.",
              },
              {
                icon: "📸",
                title: "Daily Snapshots & History",
                desc: "We take daily snapshots of every athlete's pricing data, building a historical record that powers sparkline trends, market index calculations, and the bi-weekly market analysis reports you see on the homepage.",
              },
              {
                icon: "🎯",
                title: "ISO 9241 UX Standards",
                desc: "Our interface follows ISO 9241 usability guidelines — the international standard for human–computer interaction. This means WCAG-compliant contrast ratios, keyboard-accessible navigation, reduced-motion support, and search/filter layouts designed for efficiency and minimal cognitive load.",
              },
              {
                icon: "🔐",
                title: "Resilient by Design",
                desc: "Every pipeline includes exponential backoff for API failures, batch checkpointing to resume after crashes, and rebase-safe Git commits. If something goes wrong at 3 AM, the system recovers automatically without losing data.",
              },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="border border-border/50 rounded-lg p-4 bg-secondary/30">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{icon}</span>
                  <h3 className="font-display font-bold text-foreground text-sm">{title}</h3>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          <p className="text-xs text-muted-foreground mt-4 italic">
            Want the full technical deep-dive? Check out our <Link to="/how-it-works" className="text-vzla-yellow hover:underline">How It Works</Link> page.
          </p>
        </motion.section>

        {/* ── Community ── */}
        <motion.section {...fadeUp(0.15)} className="glass-panel p-6 md:p-8 rounded-xl mb-8">
          <h2 className="text-lg font-display font-bold text-flag-gradient mb-4">Join the Community</h2>
          <div className="max-w-3xl space-y-5 text-foreground/80 text-sm leading-7 text-justify">
            <p>
              VZLA Sports Elite isn't just a data platform — it's a growing community of Venezuelan collectors, investors, and sports fans who share a passion for preserving and celebrating our athletic heritage through cards.
            </p>
            <p>
              Whether you're looking to learn about professional grading, understand how to protect your collection's value, find undervalued cards before the market catches on, or simply connect with other Venezuelans who love this hobby —{" "}
              <a
                href="https://www.facebook.com/groups/1591729798708721"
                target="_blank"
                rel="noopener noreferrer"
                className="text-vzla-yellow font-bold no-underline hover:underline"
              >
                join our Facebook community
              </a>{" "}
              and be part of the movement.
            </p>
          </div>
        </motion.section>

        {/* ── FAQ ── */}
        <motion.section {...fadeUp(0.2)} className="glass-panel p-6 md:p-8 rounded-xl mb-8">
          <h2 className="text-lg font-display font-bold text-flag-gradient mb-4">Frequently Asked Questions</h2>
          <div className="space-y-5">
            {[
              {
                q: "How often is the data updated?",
                a: "Our automated pipelines run daily. eBay listing prices, sold averages, and athlete rosters are refreshed every 24 hours. PSA and Beckett population data is updated on a regular schedule, and the bi-weekly market analysis report runs on the 1st and 15th of each month.",
              },
              {
                q: "What sports do you cover?",
                a: "We track Venezuelan athletes across baseball (MLB, minor leagues, and LVBP), soccer (MLS and international), basketball (NBA and Superliga), MMA, tennis, and boxing. Baseball is our largest category with 490+ athletes tracked.",
              },
              {
                q: "What does 'Taguchi Winsorized Mean' mean?",
                a: "It's a statistical method that removes extreme outliers (the highest and lowest 10% of prices) before calculating an average. This gives you a much more realistic price than a simple average, which can be skewed by a single very expensive or very cheap listing.",
              },
              {
                q: "What are the investment signals (Buy Low, Flip Potential, etc.)?",
                a: "These are data-driven indicators calculated from our pricing models. 'Buy Low' means the sold price is below the listing price — a potential bargain. 'Flip Potential' flags volatile cards with wide price swings. 'Signal Strength' uses the Taguchi S/N ratio to measure how predictable pricing is. These are informational tools, not financial advice.",
              },
              {
                q: "Can I suggest an athlete to add?",
                a: "Absolutely! We're always expanding our roster. Reach out through our Facebook community or eBay store and let us know which Venezuelan athletes you'd like to see tracked.",
              },
              {
                q: "Is this financial advice?",
                a: "No. All investment signals, price indexes, ROI calculations, and market analysis on this site are for informational purposes only and do not constitute financial or professional advice. Please read our full disclaimer on our Privacy Policy page.",
              },
            ].map(({ q, a }) => (
              <div key={q} className="border-b border-border/30 pb-4 last:border-0">
                <h3 className="font-display font-bold text-foreground text-sm mb-1.5">{q}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{a}</p>
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
