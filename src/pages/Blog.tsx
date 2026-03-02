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
