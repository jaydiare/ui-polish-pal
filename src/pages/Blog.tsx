import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import SEOHead from "@/components/SEOHead";
import SocialShare from "@/components/SocialShare";
import VzlaNavbar from "@/components/VzlaNavbar";
import VzlaFooter from "@/components/VzlaFooter";
import VzlaEbayFooter from "@/components/VzlaEbayFooter";
import type { BlogPost } from "@/data/blog-types";

const Blog = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);

  useEffect(() => {
    fetch("/data/blog-posts.json", { cache: "no-store" })
      .then((r) => r.json())
      .then(setPosts)
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen">
      <SEOHead
        title="Blog"
        description="Market insights, top Venezuelan athlete card sales, and collecting guides. Stay informed on sports card trends and investment opportunities."
        path="/blog"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Blog",
          name: "VZLA Sports Elite Blog",
          description: "Market insights, top Venezuelan athlete card sales, and collecting guides for sports card collectors and investors.",
          url: "https://vzlasportselite.com/blog",
          publisher: {
            "@type": "Organization",
            name: "VZLA Sports Elite",
            url: "https://vzlasportselite.com",
          },
          blogPosts: [
            { "@type": "BlogPosting", headline: "Top 6 Venezuelan Athlete Card Sales", url: "https://vzlasportselite.com/blog/top-venezuelan-athlete-card-sales" },
            { "@type": "BlogPosting", headline: "Top 10 Cards Printed in Venezuela", url: "https://vzlasportselite.com/blog/top-cards-printed-in-venezuela" },
            { "@type": "BlogPosting", headline: "Venezuela in WBC 2026", url: "https://vzlasportselite.com/blog/venezuelan-wbc-2026-roster" },
            { "@type": "BlogPosting", headline: "How to Use VZLA Sports Elite for Smarter Card Buying", url: "https://vzlasportselite.com/blog/how-to-use-vzla-sports-elite" },
            { "@type": "BlogPosting", headline: "Acuña & Torres RC Tracker", url: "https://vzlasportselite.com/blog/acuna-torres-tracker" },
            { "@type": "BlogPosting", headline: "Team Venezuela in WBC Cards on eBay", url: "https://vzlasportselite.com/blog/team-venezuela-wbc-cards-on-ebay" },
            { "@type": "BlogPosting", headline: "The Case for Investing in Venezuelan Athletes Sports Cards", url: "https://vzlasportselite.com/blog/venezuelan-sports-cards-market-cap" },
            { "@type": "BlogPosting", headline: "Venezuelan Players in MLB The Show 26 Rankings", url: "https://vzlasportselite.com/blog/venezuelan-players-mlb-the-show-26-top-100" },
            { "@type": "BlogPosting", headline: "Venezuelan Players in EA SPORTS FC 26: Complete Ratings Guide", url: "https://vzlasportselite.com/blog/venezuelan-players-ea-fc-26-ratings" },
            { "@type": "BlogPosting", headline: "How We Ensure Data Quality: Why Bad Data Is Worse Than No Data", url: "https://vzlasportselite.com/blog/how-we-ensure-data-quality-sports-cards" },
            { "@type": "BlogPosting", headline: "Building Resilient Data Pipelines: How Our System Recovers From Failure", url: "https://vzlasportselite.com/blog/building-resilient-data-pipelines-sports-cards" },
            { "@type": "BlogPosting", headline: "Inside Our Data Architecture: From eBay API to Your Screen", url: "https://vzlasportselite.com/blog/data-architecture-sports-card-pricing" },
            { "@type": "BlogPosting", headline: "About Market Movers – The Premier Trading Card Data Platform", url: "https://vzlasportselite.com/blog/about-market-movers" },
          ],
        }}
      />
      <VzlaNavbar />
      <main className="page-shell pt-8">
        <h1 className="text-3xl md:text-4xl font-display font-bold text-flag-gradient mb-2">Blog</h1>
        <div className="flex items-center justify-between mb-8">
          <p className="text-muted-foreground">Market insights, top sales, and more.</p>
          <SocialShare url="https://vzlasportselite.com/blog" title="VZLA Sports Elite Blog – Market Insights & Top Sales" compact />
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <Link
              key={post.slug}
              to={`/blog/${post.slug}`}
              className="glass-panel-hover p-5 no-underline flex flex-col gap-3"
            >
              {post.coverImage && (
                <img src={post.coverImage} alt="" className="w-full h-40 object-cover rounded-lg" />
              )}
              <span className="text-xs text-muted-foreground">{post.date}</span>
              <h2 className="text-lg font-display font-bold text-foreground">{post.title}</h2>
              <p className="text-sm text-muted-foreground line-clamp-3">{post.excerpt}</p>
            </Link>
          ))}
        </div>

        {posts.length === 0 && (
          <p className="text-muted-foreground text-center py-12">No posts yet.</p>
        )}

        <VzlaFooter />
      </main>
      <VzlaEbayFooter />
    </div>
  );
};

export default Blog;
