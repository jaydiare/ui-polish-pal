import { motion } from "framer-motion";
import VzlaNavbar from "@/components/VzlaNavbar";
import VzlaFooter from "@/components/VzlaFooter";
import VzlaEbayFooter from "@/components/VzlaEbayFooter";
import VzlaStoreBanner from "@/components/VzlaStoreBanner";

const EBAY_STORE =
  "https://www.ebay.ca/str/localherossportscards?mkcid=1&mkrid=706-53473-19255-0&siteid=2&campid=5339142305&toolid=10001&mkevt=1";

const About = () => {
  return (
    <div id="top" className="min-h-screen">
      <VzlaNavbar />

      <main className="page-shell">
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
          className="hero-panel text-center mb-8 p-10 md:p-14"
        >
          {/* ... keep existing code (about section content) */}
          <div className="text-[10px] tracking-[0.22em] uppercase font-bold text-muted-foreground mb-4">
            ABOUT
          </div>

          <h1 className="text-4xl md:text-5xl font-display font-bold mb-10 leading-[1.05] text-glow">
            VZLA <span className="text-flag-gradient">SPORTS ELITE</span>
          </h1>

          <div className="max-w-[920px] mx-auto text-left space-y-8">
            <p className="text-foreground/80 leading-[1.9] text-lg">
              In Venezuela, many of us grew up trading sports cards, especially baseball cards, and collecting World Cup sticker albums. We remember the excitement of racing to complete an album before kickoff and the pride of finally finishing it.
            </p>

            <p className="text-foreground/80 leading-[1.9] text-lg">
              For a long time, we believed these collectibles were only sentimental. Today, we understand something more. Sports cards and memorabilia can hold real value over time, especially when properly preserved and cared for.
            </p>

            <div className="h-6" />

            <p className="text-foreground/80 leading-[1.9] text-lg">
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
          </div>

          <div className="h-16" />

          <div className="grid md:grid-cols-3 gap-6 text-left items-stretch">
            {[
              {
                title: "What We Believe",
                paragraphs: [
                  "For many Venezuelans, sports cards are simply memories. Yet behind every card lies real potential. When condition, rarity, and demand align, collectibles become assets. At Vzla Sports Elite, knowledge is what empowers Venezuelan buyers and collectors around the world who follow Venezuelan athletes to make informed, confident decisions.",
                ],
                extra: null,
              },
              {
                title: "Our Mission",
                paragraphs: [
                  "VZLA Sports Elite was created to make it easy for Venezuelans around the world to discover and support their favorite hometown athletes.",
                  "We also aim to help buyers from Venezuela and collectors worldwide who are passionate about Venezuelan athletes find the cards and memorabilia they're looking for.",
                  "Beyond simply showcasing athletes, our mission is to share knowledge about this hobby and help collectors understand how to preserve and protect the long-term value of their collections.",
                ],
                extra: null,
              },
              {
                title: "Why It Matters",
                paragraphs: [
                  "Whether you started collecting recently, have been doing it quietly for many years, inherited a large collection from your father or grandfather, or received cards from a friend, your collection has potential.",
                  "I can help you find sports cards and memorabilia from active Venezuelan athletes today, and later from non-active athletes as well.",
                ] as (string | React.ReactNode)[],
                extra: (
                  <p className="text-foreground/75 leading-relaxed text-sm mt-4">
                    We want to help you collect with confidence.{" "}
                    <a
                      href="https://www.facebook.com/groups/1591729798708721"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-vzla-yellow font-bold no-underline hover:underline"
                    >
                      Join our Facebook community
                    </a>{" "}
                    to connect with other Venezuelan collectors!
                  </p>
                ),
              },
            ].map((card, i) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 + i * 0.1 }}
                className="glass-panel p-6 flex flex-col"
              >
                <h2 className="font-display font-bold text-base mb-3 uppercase tracking-wide">
                  {card.title}
                </h2>
                {card.paragraphs.map((p, j) => (
                  <p key={j} className={`text-foreground/75 leading-relaxed text-sm ${j > 0 ? "mt-4" : ""}`}>
                    {p}
                  </p>
                ))}
                {card.extra}
              </motion.div>
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
