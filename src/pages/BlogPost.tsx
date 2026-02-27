import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import VzlaNavbar from "@/components/VzlaNavbar";
import VzlaFooter from "@/components/VzlaFooter";
import VzlaEbayFooter from "@/components/VzlaEbayFooter";
import type { BlogPost as BlogPostType } from "@/data/blog-types";

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
      <VzlaNavbar />
      <main className="page-shell pt-8 max-w-3xl mx-auto">
        <Link to="/blog" className="text-sm text-muted-foreground hover:text-vzla-yellow transition-colors no-underline mb-4 inline-block">
          ← Back to Blog
        </Link>

        <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-2">{post.title}</h1>
        <p className="text-sm text-muted-foreground mb-8">{post.date} · {post.author}</p>

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
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}

        <VzlaFooter />
      </main>
      <VzlaEbayFooter />
    </div>
  );
};

export default BlogPost;
