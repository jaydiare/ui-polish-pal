import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import SEOHead from "@/components/SEOHead";
import SocialShare from "@/components/SocialShare";
import VzlaNavbar from "@/components/VzlaNavbar";
import VzlaFooter from "@/components/VzlaFooter";
import VzlaEbayFooter from "@/components/VzlaEbayFooter";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, BarChart, Bar, AreaChart, Area,
} from "recharts";

/* ── Types ── */
interface MarketAthlete {
  name: string;
  sport: string;
  rawListedPrice: number | null;
  rawSoldPrice: number | null;
  gradedListedPrice: number | null;
  gradedSoldPrice: number | null;
  psaPop: number | null;
  indexLevel: number | null;
}

interface IndexEntry { date: string; Baseball?: number; Soccer?: number; Basketball?: number; All?: number }

/* ── Projection helpers ── */
const CURRENT_YEAR = 2026;
const PROJECTION_YEARS = [2026, 2027, 2028, 2029, 2030, 2031, 2032];

function buildGrowthProjection(baseCap: number, scenarios: { label: string; rate: number }[]) {
  return PROJECTION_YEARS.map((yr) => {
    const row: Record<string, number | string> = { year: yr.toString() };
    scenarios.forEach(({ label, rate }) => {
      const elapsed = yr - CURRENT_YEAR;
      row[label] = Math.round(baseCap * Math.pow(1 + rate, elapsed));
    });
    return row;
  });
}

function buildRosterProjection() {
  // Historical: ~80 active MLB Venezuelans (2024), growing ~5/yr on avg
  // MLS pipeline is newer with ~15 active, growing ~3/yr
  return PROJECTION_YEARS.map((yr) => {
    const elapsed = yr - CURRENT_YEAR;
    return {
      year: yr.toString(),
      "MLB Athletes": 82 + elapsed * 5,
      "MLS Athletes": 18 + elapsed * 4,
      "Total Tracked": 570 + elapsed * 15,
    };
  });
}

/** Global collectibles market size data (in billions USD) — industry reports */
function buildCollectiblesMarketData() {
  return [
    { year: "2020", "Global Collectibles": 372, "Sports Cards": 13.5, "eBay Collectibles": 10 },
    { year: "2021", "Global Collectibles": 402, "Sports Cards": 22.3, "eBay Collectibles": 14 },
    { year: "2022", "Global Collectibles": 426, "Sports Cards": 18.1, "eBay Collectibles": 12 },
    { year: "2023", "Global Collectibles": 458, "Sports Cards": 15.2, "eBay Collectibles": 11 },
    { year: "2024", "Global Collectibles": 492, "Sports Cards": 16.8, "eBay Collectibles": 12.5 },
    { year: "2025", "Global Collectibles": 534, "Sports Cards": 19.4, "eBay Collectibles": 14.2 },
    { year: "2026", "Global Collectibles": 579, "Sports Cards": 22.1, "eBay Collectibles": 16 },
    { year: "2028", "Global Collectibles": 680, "Sports Cards": 29, "eBay Collectibles": 20 },
    { year: "2030", "Global Collectibles": 793, "Sports Cards": 38, "eBay Collectibles": 26 },
    { year: "2032", "Global Collectibles": 924, "Sports Cards": 50, "eBay Collectibles": 34 },
  ];
}

/* ── Component ── */
const MarketCapBlog = () => {
  const [athletes, setAthletes] = useState<MarketAthlete[]>([]);
  const [indexHistory, setIndexHistory] = useState<IndexEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/data/vzla-athlete-market-data.json", { cache: "no-store" }).then((r) => r.json()),
      fetch("/data/ebay-avg.json", { cache: "no-store" }).then((r) => r.json()),
    ])
      .then(([mkt, ebay]) => {
        setAthletes(mkt.athletes ?? []);
        setIndexHistory(ebay._meta?.indexHistory ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  /* ── Calculated metrics ── */
  const metrics = useMemo(() => {
    if (!athletes.length) return null;

    const withRawListed = athletes.filter((a) => a.rawListedPrice && a.rawListedPrice > 0);
    const withRawSold = athletes.filter((a) => a.rawSoldPrice && a.rawSoldPrice > 0);
    const withGradedListed = athletes.filter((a) => a.gradedListedPrice && a.gradedListedPrice > 0);
    const withGradedSold = athletes.filter((a) => a.gradedSoldPrice && a.gradedSoldPrice > 0);

    const avgRawListed = withRawListed.reduce((s, a) => s + (a.rawListedPrice ?? 0), 0) / (withRawListed.length || 1);
    const avgRawSold = withRawSold.reduce((s, a) => s + (a.rawSoldPrice ?? 0), 0) / (withRawSold.length || 1);
    const avgGradedListed = withGradedListed.reduce((s, a) => s + (a.gradedListedPrice ?? 0), 0) / (withGradedListed.length || 1);
    const avgGradedSold = withGradedSold.reduce((s, a) => s + (a.gradedSoldPrice ?? 0), 0) / (withGradedSold.length || 1);

    const totalPsaPop = athletes.reduce((s, a) => s + (a.psaPop ?? 0), 0);

    // Market cap estimate: (avg sold price × estimated volume per athlete × number of athletes)
    // Conservative: each athlete has ~50 card sales/month, moderate ~100, aggressive ~200
    const athleteCount = athletes.length;
    const avgSoldPrice = (avgRawSold + avgGradedSold) / 2;

    const monthlyVolumeConservative = athleteCount * 30 * avgSoldPrice;
    const monthlyVolumeModerate = athleteCount * 75 * avgSoldPrice;
    const monthlyVolumeAggressive = athleteCount * 150 * avgSoldPrice;

    const annualConservative = monthlyVolumeConservative * 12;
    const annualModerate = monthlyVolumeModerate * 12;
    const annualAggressive = monthlyVolumeAggressive * 12;

    // Listed inventory value (market cap snapshot)
    const rawMarketCap = withRawListed.reduce((s, a) => s + (a.rawListedPrice ?? 0) * (a.psaPop ?? 10), 0);
    const gradedMarketCap = withGradedListed.reduce((s, a) => s + (a.gradedListedPrice ?? 0) * (a.psaPop ?? 5), 0);
    const totalMarketCap = rawMarketCap + gradedMarketCap;

    return {
      athleteCount,
      avgRawListed: avgRawListed.toFixed(2),
      avgRawSold: avgRawSold.toFixed(2),
      avgGradedListed: avgGradedListed.toFixed(2),
      avgGradedSold: avgGradedSold.toFixed(2),
      totalPsaPop: totalPsaPop.toLocaleString(),
      totalMarketCap,
      annualConservative,
      annualModerate,
      annualAggressive,
    };
  }, [athletes]);

  const growthData = useMemo(
    () => (metrics ? buildGrowthProjection(metrics.annualModerate, [
      { label: "Conservative (8%)", rate: 0.08 },
      { label: "Moderate (15%)", rate: 0.15 },
      { label: "Aggressive (25%)", rate: 0.25 },
    ]) : []),
    [metrics],
  );

  const rosterData = useMemo(() => buildRosterProjection(), []);

  /* Sport breakdown for bar chart */
  const sportBreakdown = useMemo(() => {
    const bySport: Record<string, { count: number; avgPrice: number; totalPop: number }> = {};
    athletes.forEach((a) => {
      if (!bySport[a.sport]) bySport[a.sport] = { count: 0, avgPrice: 0, totalPop: 0 };
      bySport[a.sport].count++;
      bySport[a.sport].avgPrice += a.rawSoldPrice ?? a.rawListedPrice ?? 0;
      bySport[a.sport].totalPop += a.psaPop ?? 0;
    });
    return Object.entries(bySport).map(([sport, d]) => ({
      sport,
      "Athlete Count": d.count,
      "Avg Sold Price": +(d.avgPrice / (d.count || 1)).toFixed(2),
      "PSA Pop": d.totalPop,
    }));
  }, [athletes]);

  /* Clean index history (filter out zeroes & spikes) */
  const cleanHistory = useMemo(() =>
    indexHistory
      .filter((e) => (e.All ?? 0) > 0 && (e.All ?? 0) < 2000)
      .map((e) => ({ ...e, date: e.date.slice(5) })),
    [indexHistory],
  );

  const slug = "venezuelan-sports-cards-market-cap";

  if (loading) {
    return (
      <div className="min-h-screen">
        <VzlaNavbar />
        <main className="page-shell pt-8">
          <p className="text-muted-foreground text-center py-12">Loading market data…</p>
        </main>
      </div>
    );
  }

  const fmt = (n: number) => "$" + n.toLocaleString(undefined, { maximumFractionDigits: 0 });

  return (
    <div className="min-h-screen">
      <SEOHead
        title="Venezuelan Sports Cards Market Cap & eBay Revenue Projections"
        description="Data-driven analysis of the Venezuelan athlete sports card market on eBay — market cap estimates, revenue projections, and growth forecasts through 2032."
        path={`/blog/${slug}`}
        type="article"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: "Venezuelan Sports Cards Market Cap & Revenue Projections",
          description: "Data-driven analysis of the Venezuelan athlete card market on eBay.",
          datePublished: "2026-03-17",
          author: { "@type": "Person", name: "VZLA Sports Elite" },
          publisher: { "@type": "Organization", name: "VZLA Sports Elite" },
          mainEntityOfPage: `https://vzlasportselite.com/blog/${slug}`,
        }}
      />
      <VzlaNavbar />
      <main className="page-shell pt-8 max-w-5xl mx-auto">
        <Link to="/blog" className="text-sm text-muted-foreground hover:text-vzla-yellow transition-colors no-underline mb-4 inline-block">
          ← Back to Blog
        </Link>

        <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-2">
          Venezuelan Sports Cards on eBay: Market Cap & Revenue Projections
        </h1>
        <div className="flex items-center justify-between mb-8">
          <p className="text-sm text-muted-foreground">March 17, 2026 · VZLA Sports Elite</p>
          <SocialShare url={`https://vzlasportselite.com/blog/${slug}`} title="Venezuelan Sports Cards Market Cap" compact />
        </div>

        {/* ── Intro ── */}
        <section className="glass-panel p-6 rounded-xl mb-8">
          <h2 className="text-lg font-display font-bold text-flag-gradient mb-3">The Venezuelan Card Market at a Glance</h2>
          <p className="text-muted-foreground text-sm leading-7 text-justify mb-4">
            Venezuela has quietly become one of the most prolific talent pipelines in professional sports. With <strong className="text-foreground">{metrics?.athleteCount ?? 0} athletes</strong> currently tracked across MLB, MLS, and NBA, the secondary market for their sports cards on eBay represents a vibrant and growing niche. This analysis uses live data from our platform — covering active listings, sold comps, PSA population reports, and historical price indices — to estimate the total market capitalization and project future revenue.
          </p>
          <p className="text-muted-foreground text-sm leading-7 text-justify">
            As more Venezuelan prospects enter the MLB pipeline and MLS continues to attract Latin American talent, the addressable market for collectible cards is poised for significant expansion.
          </p>
        </section>

        {/* ── Key Metrics Grid ── */}
        {metrics && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            {[
              { label: "Athletes Tracked", value: metrics.athleteCount.toString() },
              { label: "Est. Market Cap", value: fmt(metrics.totalMarketCap) },
              { label: "Total PSA Pop", value: metrics.totalPsaPop },
              { label: "Avg Raw Sold", value: `$${metrics.avgRawSold}` },
              { label: "Avg Raw Listed", value: `$${metrics.avgRawListed}` },
              { label: "Avg Graded Listed", value: `$${metrics.avgGradedListed}` },
              { label: "Avg Graded Sold", value: `$${metrics.avgGradedSold}` },
              { label: "Annual Rev (Moderate)", value: fmt(metrics.annualModerate) },
            ].map(({ label, value }) => (
              <div key={label} className="glass-panel p-4 rounded-xl text-center">
                <p className="text-xs text-muted-foreground mb-1">{label}</p>
                <p className="text-lg font-display font-bold text-vzla-yellow">{value}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── Market Index History ── */}
        {cleanHistory.length > 0 && (
          <section className="glass-panel p-6 rounded-xl mb-10">
            <h2 className="text-lg font-display font-bold text-flag-gradient mb-1">Market Index — Recent Trend</h2>
            <p className="text-xs text-muted-foreground mb-4">Base-100 price index across all tracked athletes (filtered for outliers)</p>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={cleanHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="All" stroke="hsl(var(--vzla-yellow))" strokeWidth={2} dot={false} name="All Sports" />
                  <Line type="monotone" dataKey="Baseball" stroke="#ef4444" strokeWidth={1.5} dot={false} />
                  <Line type="monotone" dataKey="Soccer" stroke="#3b82f6" strokeWidth={1.5} dot={false} />
                  <Line type="monotone" dataKey="Basketball" stroke="#f97316" strokeWidth={1.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        {/* ── Sport Breakdown Bar Chart ── */}
        {sportBreakdown.length > 0 && (
          <section className="glass-panel p-6 rounded-xl mb-10">
            <h2 className="text-lg font-display font-bold text-flag-gradient mb-1">Market Breakdown by Sport</h2>
            <p className="text-xs text-muted-foreground mb-4">Athlete count, average sold price, and total PSA graded population</p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sportBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="sport" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                  />
                  <Legend />
                  <Bar dataKey="Athlete Count" fill="#fbbf24" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Avg Sold Price" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        {/* ── Revenue Projections ── */}
        <section className="glass-panel p-6 rounded-xl mb-10">
          <h2 className="text-lg font-display font-bold text-flag-gradient mb-1">Annual Revenue Projections (2026–2032)</h2>
          <p className="text-xs text-muted-foreground mb-4">Three growth scenarios based on current market data and athlete pipeline expansion</p>
          {metrics && (
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="text-center p-3 rounded-lg bg-secondary/50">
                <p className="text-xs text-muted-foreground">Conservative (8%/yr)</p>
                <p className="text-sm font-bold text-foreground">{fmt(metrics.annualConservative)}</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-secondary/50">
                <p className="text-xs text-muted-foreground">Moderate (15%/yr)</p>
                <p className="text-sm font-bold text-vzla-yellow">{fmt(metrics.annualModerate)}</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-secondary/50">
                <p className="text-xs text-muted-foreground">Aggressive (25%/yr)</p>
                <p className="text-sm font-bold text-foreground">{fmt(metrics.annualAggressive)}</p>
              </div>
            </div>
          )}
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={growthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="year" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip
                  formatter={(v: number) => fmt(v)}
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                />
                <Legend />
                <Area type="monotone" dataKey="Conservative (8%)" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.15} strokeWidth={1.5} />
                <Area type="monotone" dataKey="Moderate (15%)" stroke="#fbbf24" fill="#fbbf24" fillOpacity={0.2} strokeWidth={2} />
                <Area type="monotone" dataKey="Aggressive (25%)" stroke="#22c55e" fill="#22c55e" fillOpacity={0.15} strokeWidth={1.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* ── Roster Pipeline Projection ── */}
        <section className="glass-panel p-6 rounded-xl mb-10">
          <h2 className="text-lg font-display font-bold text-flag-gradient mb-1">Venezuelan Athlete Pipeline — Roster Growth Forecast</h2>
          <p className="text-xs text-muted-foreground mb-4">Projected active athletes in MLB and MLS, and total tracked roster</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rosterData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="year" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                />
                <Legend />
                <Line type="monotone" dataKey="MLB Athletes" stroke="#ef4444" strokeWidth={2} />
                <Line type="monotone" dataKey="MLS Athletes" stroke="#3b82f6" strokeWidth={2} />
                <Line type="monotone" dataKey="Total Tracked" stroke="#fbbf24" strokeWidth={2} strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* ── Analysis Text ── */}
        <section className="glass-panel p-6 rounded-xl mb-10">
          <h2 className="text-lg font-display font-bold text-flag-gradient mb-3">Growth Catalysts & Market Drivers</h2>
          <div className="space-y-4 text-muted-foreground text-sm leading-7 text-justify">
            <p>
              <strong className="text-foreground">MLB Pipeline Dominance:</strong> Venezuela consistently ranks among the top countries producing MLB talent. With approximately 82 active Venezuelan players in MLB as of 2026 and a deep farm system pipeline, each new prospect generates immediate demand in the trading card secondary market. Stars like Ronald Acuña Jr., José Altuve, and Jackson Chourio drive premium pricing while emerging prospects create speculative volume.
            </p>
            <p>
              <strong className="text-foreground">MLS Expansion:</strong> Major League Soccer's continued expansion (30+ teams by 2026) has created new demand for Latin American talent. Venezuelan soccer players like Josef Martínez and emerging prospects are beginning to appear in Topps and Panini products, adding a new vertical to the collectibles market that barely existed five years ago.
            </p>
            <p>
              <strong className="text-foreground">PSA Grading Volume:</strong> With a combined PSA population of <strong className="text-vzla-yellow">{metrics?.totalPsaPop}</strong> graded cards across all tracked athletes, the certified card market provides price floors and institutional-grade liquidity. Graded cards command a significant premium — our data shows an average graded listed price of <strong className="text-vzla-yellow">${metrics?.avgGradedListed}</strong> versus <strong className="text-vzla-yellow">${metrics?.avgRawListed}</strong> for raw cards.
            </p>
            <p>
              <strong className="text-foreground">World Baseball Classic Effect:</strong> International tournaments like the WBC create massive demand spikes. During the 2023 WBC, Venezuelan player card prices surged 200–400% for key athletes. With Venezuela expected to field a competitive roster in future tournaments, these events serve as market-wide catalysts.
            </p>
            <p>
              <strong className="text-foreground">eBay as Primary Marketplace:</strong> eBay remains the dominant platform for sports card transactions, processing an estimated 60–70% of all secondary market volume. The platform's global reach ensures that Venezuelan athlete cards reach collectors worldwide, with our data tracking both US and Canadian eBay marketplaces.
            </p>
          </div>
        </section>

        {/* ── Methodology ── */}
        <section className="glass-panel p-6 rounded-xl mb-10">
          <h2 className="text-lg font-display font-bold text-flag-gradient mb-3">Methodology & Data Sources</h2>
          <div className="space-y-3 text-muted-foreground text-sm leading-7 text-justify">
            <p>
              <strong className="text-foreground">Market Cap Calculation:</strong> Estimated as the sum of (average listed price × PSA population) across all tracked athletes for both raw and graded cards. This represents the total value of graded inventory in circulation.
            </p>
            <p>
              <strong className="text-foreground">Revenue Estimates:</strong> Based on average sold prices multiplied by estimated monthly transaction volume per athlete (conservative: 30, moderate: 75, aggressive: 150 transactions/month), extrapolated annually.
            </p>
            <p>
              <strong className="text-foreground">Data Sources:</strong> eBay Browse API (active listings), eBay HTML scraping (sold comps), PSA Population Report, SportsCardsPro (raw pricing benchmarks). Prices normalized to USD using CBSA exchange rates.
            </p>
            <p className="text-xs italic">
              Note: Projections are estimates based on current trends and historical data. Actual market performance may vary based on player performance, market sentiment, and macroeconomic factors.
            </p>
          </div>
        </section>

        <VzlaFooter />
      </main>
      <VzlaEbayFooter />
    </div>
  );
};

export default MarketCapBlog;
