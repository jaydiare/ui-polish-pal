import { lazy, Suspense } from "react";
import SEOHead from "@/components/SEOHead";
import VzlaNavbar from "@/components/VzlaNavbar";
import VzlaFooter from "@/components/VzlaFooter";
import VzlaEbayFooter from "@/components/VzlaEbayFooter";
import SocialShare from "@/components/SocialShare";

const BlogDataTable = lazy(() => import("@/components/BlogDataTable"));

const MarketData = () => {
  const url = "https://vzlasportselite.com/market-data";
  const title = "Venezuelan Athlete Card Market Data";
  const description =
    "Full market dataset for 500+ Venezuelan athlete cards — raw & graded listing prices, sold prices, stability scores, days on market, and index levels. Sortable by any column.";

  return (
    <div className="min-h-screen">
      <SEOHead
        title={title}
        description={description}
        path="/market-data"
        type="article"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Dataset",
          name: title,
          description,
          url,
          creator: { "@type": "Organization", name: "VZLA Sports Elite" },
        }}
      />
      <VzlaNavbar />
      <main className="page-shell pt-8">
        <div className="flex items-start justify-between gap-4 mb-2">
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">
            {title}
          </h1>
          <SocialShare url={url} title={title} compact />
        </div>
        <p className="text-sm text-muted-foreground mb-8">VZLA Sports Elite</p>

        <div className="max-w-3xl mb-12">
          <section className="mb-10 glass-panel p-6 rounded-xl">
            <h2 className="text-lg font-display font-bold text-flag-gradient mb-4">
              Complete Market Dataset
            </h2>
            <p className="text-muted-foreground text-sm leading-7 text-justify mb-4">
              This table contains the full dataset we track across 500+ Venezuelan athletes. It includes raw and graded listing averages, market stability (CV%), average days on market, and the price index level. Click any column header to sort and scroll down to explore the entire roster.
            </p>
            <p className="text-muted-foreground text-sm leading-7 text-justify">
              Raw prices reflect ungraded Near Mint / Excellent condition cards. Graded prices cover PSA authenticated cards only. The Stability column measures price consistency using the Coefficient of Variation (CV): Stable (CV &lt; 10%) means tight, predictable pricing; Active (10–20%) indicates moderate movement; Volatile (20–35%) shows significant price swings; and Unstable (&gt; 35%) signals highly erratic pricing. Days on Market shows average listing duration. The Index (base-100) tracks price movement over time.
            </p>
            <p className="text-muted-foreground text-sm leading-7 text-justify mt-4">
              Forecast 30d shows where our model expects the raw price to sit 30 days out, with a low-to-high range underneath (10th to 90th percentile). It is produced by quantile gradient boosting on the same features that drive the Deal Score: price lags, moving averages, momentum, stability and listing volume. Confidence is High when the range is tight (under 25% of the estimate) and backed by at least 60 days of history, Medium for ranges under 50%, and Low otherwise. These are model estimates, not investment advice.
            </p>
          </section>


        </div>

        <Suspense fallback={<p className="text-muted-foreground text-center py-8">Loading table…</p>}>
          <BlogDataTable />
        </Suspense>

        <VzlaFooter />
      </main>
      <VzlaEbayFooter />
    </div>
  );
};

export default MarketData;
