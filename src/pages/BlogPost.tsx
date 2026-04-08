import { useEffect, useState, lazy, Suspense } from "react";
import AdSenseInArticle from "@/components/AdSenseInArticle";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import SEOHead from "@/components/SEOHead";
import WbcPolymarketOdds from "@/components/WbcPolymarketOdds";
import SocialShare from "@/components/SocialShare";
import VzlaNavbar from "@/components/VzlaNavbar";
import VzlaFooter from "@/components/VzlaFooter";
import VzlaEbayFooter from "@/components/VzlaEbayFooter";
import AthleteCard from "@/components/AthleteCard";
import type { BlogPost as BlogPostType } from "@/data/blog-types";
import { useAthleteData } from "@/hooks/useAthleteData";
import type { Athlete } from "@/data/athletes";

const BlogDataTable = lazy(() => import("@/components/BlogDataTable"));
const BlogShowRanking = lazy(() => import("@/components/BlogShowRanking"));

/** Auto-link URLs in text */
function renderLinkedText(text: string) {
  const urlRegex = /(https?:\/\/[^\s]+|facebook\.com\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) => {
    if (urlRegex.test(part)) {
      const href = part.startsWith("http") ? part : `https://${part}`;
      return (
        <a key={i} href={href} target="_blank" rel="noopener noreferrer" className="text-vzla-yellow font-bold no-underline hover:underline">
          {part.includes("facebook.com/groups") ? "Join our Facebook community" : part}
        </a>
      );
    }
    return part;
  });
}

const BlogPost = () => {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<BlogPostType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/data/blog-posts.json", { cache: "no-store" })
      .then((r) => r.json())
      .then((posts: BlogPostType[]) => {
        setPost(posts.find((p) => p.slug === slug) ?? null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen">
        <VzlaNavbar />
        <main className="page-shell pt-8">
          <p className="text-muted-foreground text-center py-12">Loading…</p>
        </main>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen">
        <VzlaNavbar />
        <main className="page-shell pt-8 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Post not found</h1>
          <Link to="/blog" className="text-vzla-yellow underline">← Back to Blog</Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <SEOHead
        title={post.title}
        description={post.excerpt}
        path={`/blog/${slug}`}
        image={post.coverImage?.startsWith("http") ? post.coverImage : undefined}
        type="article"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Article",
          "headline": post.title,
          "description": post.excerpt,
          "datePublished": post.date,
          "author": { "@type": "Person", "name": post.author },
          "publisher": { "@type": "Organization", "name": "VZLA Sports Elite" },
          "mainEntityOfPage": `https://vzlasportselite.com/blog/${slug}`,
        }}
      />
      <VzlaNavbar />
      <main className="page-shell pt-8">
        <Link to="/blog" className="text-sm text-muted-foreground hover:text-vzla-yellow transition-colors no-underline mb-4 inline-block">
          ← Back to Blog
        </Link>

        <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-2">{post.title}</h1>
        <div className="flex items-center justify-between mb-8">
          <p className="text-sm text-muted-foreground">{post.date} · {post.author}</p>
          <SocialShare
            url={`https://vzlasportselite.com/blog/${slug}`}
            title={post.title}
            compact
          />
        </div>

        {/* Cover / inline image */}
        {(post.coverImage || (post as any).inlineImage) && (
          <div className="flex justify-center mb-8">
            <img src={(post as any).inlineImage || post.coverImage} alt={post.title} className="max-h-32 w-auto" loading="lazy" />
          </div>
        )}

        {/* Text sections (facts, predictions, etc.) */}
        {post.textSections && post.textSections.length > 0 && (
          <div className="max-w-3xl mb-12">
            {post.textSections.map((ts, i) => (
              <section key={i} className="mb-10 glass-panel p-6 rounded-xl">
                <h2 className="text-lg font-display font-bold text-flag-gradient mb-4">{ts.heading}</h2>
                {ts.paragraphs.map((p, j) => (
                  <p key={j} className="text-muted-foreground text-sm leading-7 text-justify mb-4 last:mb-0">
                    {renderLinkedText(p)}
                  </p>
                ))}
              </section>
            ))}
            {post.slug === "venezuelan-wbc-2026-roster" && <WbcPolymarketOdds />}
          </div>
        )}

        {post.type === "article" ? (
          <div className="max-w-3xl mb-12">
            {post.textSections?.map((ts, i) => (
              <section key={i}>
                <div className="mb-10 glass-panel p-6 rounded-xl">
                  <h2 className="text-lg font-display font-bold text-flag-gradient mb-4">{ts.heading}</h2>
                  {ts.paragraphs.map((p, j) => (
                    <p key={j} className="text-foreground/80 text-sm leading-7 text-justify mb-4 last:mb-0">
                      {renderLinkedText(p)}
                    </p>
                  ))}
                </div>
                {i === 1 && <AdSenseInArticle />}
              </section>
            ))}
          </div>
        ) : post.type === "data-table" ? (
          <Suspense fallback={<p className="text-muted-foreground text-center py-8">Loading table…</p>}>
            <BlogDataTable />
          </Suspense>
        ) : post.type === "the-show-ranking" && (post.showRankingPlayers || post.showRankingSections) ? (
          <Suspense fallback={<p className="text-muted-foreground text-center py-8">Loading ranking…</p>}>
            <BlogShowRanking players={post.showRankingPlayers} sections={post.showRankingSections} />
          </Suspense>
        ) : post.type === "roster" && post.playerNames ? (
          <RosterSection playerNames={post.playerNames} excerpt={post.excerpt} />
        ) : post.type === "ebay-cards" && post.ebayCards ? (
          <section className="mb-12">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {post.ebayCards.map((card, i) => (
                <motion.a
                  key={i}
                  href={card.ebayUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="glass-panel p-4 no-underline flex flex-col gap-3 hover:border-vzla-yellow/50 transition-colors group"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: Math.min(i * 0.06, 0.6) }}
                >
                  <img
                    src={card.imageUrl}
                    alt={card.title}
                    className="w-full h-56 object-contain rounded-lg bg-secondary"
                    loading="lazy"
                  />
                  <h3 className="text-sm font-semibold text-foreground leading-snug group-hover:text-vzla-yellow transition-colors">
                    {card.title}
                  </h3>
                  {card.price && (
                    <span className="text-vzla-yellow font-display font-bold text-lg">{card.price}</span>
                  )}
                  <span className="text-xs text-muted-foreground group-hover:text-vzla-yellow transition-colors">
                    View on eBay ↗
                  </span>
                </motion.a>
              ))}
            </div>
          </section>
        ) : (
          <div className="max-w-3xl">
            {post.sections.map((section, si) => (
              <section key={si} className="mb-12">
                <h2 className="text-xl font-display font-bold text-flag-gradient mb-2">{section.heading}</h2>
                <p className="text-muted-foreground text-sm mb-6">{section.description}</p>

                <div className="flex flex-col gap-4">
                  {section.items.map((item) => (
                    <div
                      key={item.rank}
                      className="glass-panel p-4 flex items-center gap-4"
                    >
                      <span className="flex-shrink-0 w-9 h-9 rounded-lg cta-flag flex items-center justify-center font-display font-bold text-sm text-white">
                        #{item.rank}
                      </span>

                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.title}
                          className="w-20 h-20 object-cover rounded-lg border border-border flex-shrink-0"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-lg bg-secondary border border-border flex items-center justify-center flex-shrink-0">
                          <span className="text-[10px] text-muted-foreground">No img</span>
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground text-sm leading-snug">{item.title}</p>
                        <p className="text-vzla-yellow font-display font-bold text-lg mt-1">
                          ${item.soldPrice.toLocaleString()}
                        </p>
                        {item.sourceUrl && (
                          <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-vzla-yellow transition-colors">
                            View source ↗
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        <VzlaFooter />
      </main>
      <VzlaEbayFooter />
    </div>
  );
};

/* ── Roster sub-component: renders live AthleteCards ── */
function RosterSection({ playerNames, excerpt }: { playerNames: string[]; excerpt: string }) {
  const {
    athletes,
    byName,
    byKey,
    gradedByName,
    gradedByKey,
    ebaySoldRaw,
    ebayGradedSoldRaw,
    athleteHistory,
  } = useAthleteData();

  // Normalize for matching
  const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

  const nameSet = new Set(playerNames.map(normalize));

  // Match athletes from the data
  const rosterAthletes: Athlete[] = [];
  const matchedNames = new Set<string>();

  for (const a of athletes) {
    const norm = normalize(a.name);
    if (nameSet.has(norm) && !matchedNames.has(norm)) {
      rosterAthletes.push(a);
      matchedNames.add(norm);
    }
  }

  // Also add players not found in athlete data as stubs
  const missingNames = playerNames.filter((n) => !matchedNames.has(normalize(n)));

  return (
    <section className="mb-12">
      <p className="text-muted-foreground text-sm mb-6">{excerpt}</p>
      <p className="text-xs text-muted-foreground mb-4">
        Showing {rosterAthletes.length} of {playerNames.length} players with live market data
      </p>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-5">
        {rosterAthletes.map((a, i) => (
          <motion.div
            key={`${a.name}-${a.sport}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: Math.min(i * 0.04, 0.8) }}
          >
            <AthleteCard
              athlete={a}
              byName={byName}
              byKey={byKey}
              gradedByName={gradedByName}
              gradedByKey={gradedByKey}
              ebaySoldRaw={ebaySoldRaw}
              ebayGradedSoldRaw={ebayGradedSoldRaw}
              history={athleteHistory?.[a.name]}
              priceMode="both"
            />
          </motion.div>
        ))}
      </div>

      {missingNames.length > 0 && (
        <div className="mt-6 glass-panel p-4">
          <p className="text-xs text-muted-foreground mb-2">Players not yet tracked:</p>
          <p className="text-sm text-foreground">{missingNames.join(", ")}</p>
        </div>
      )}
    </section>
  );
}

export default BlogPost;
