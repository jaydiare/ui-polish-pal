import { useMemo } from "react";
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

/* ══════════════════════════════════════════════════════════════
   SNAPSHOT DATA — March 15 2026
   Source: vzla-athlete-market-data.json + index-history.json
   This is a point-in-time analysis, not live data.
   ══════════════════════════════════════════════════════════════ */

const SNAPSHOT = {
  date: "March 17, 2026",
  athleteCount: 567,
  avgRawListed: "9.56",
  avgRawSold: "4.10",
  avgGradedListed: "52.93",
  avgGradedSold: "38.93",
  totalPsaPop: "760,168",
  totalMarketCap: 72_186_425,
  annualConservative: 4_391_606,
  annualModerate: 10_979_015,
  annualAggressive: 21_958_030,
} as const;

const SPORT_BREAKDOWN = [
  { sport: "Baseball", "Athlete Count": 491, "Avg Sold Price": 3.89 },
  { sport: "Soccer", "Athlete Count": 53, "Avg Sold Price": 5.24 },
  { sport: "Basketball", "Athlete Count": 9, "Avg Sold Price": 6.41 },
  { sport: "MMA", "Athlete Count": 3, "Avg Sold Price": 4.12 },
  { sport: "Tennis", "Athlete Count": 1, "Avg Sold Price": 8.50 },
];

const INDEX_HISTORY = [
  { date: "03-02", All: 246.3, Baseball: 248.1, Soccer: 101.3 },
  { date: "03-04", All: 207.7, Baseball: 219.7, Soccer: 107.6, Basketball: 225.5 },
  { date: "03-05", All: 203.4, Baseball: 215.7, Soccer: 112, Basketball: 80.2 },
  { date: "03-06", All: 100, Baseball: 100, Soccer: 100, Basketball: 100 },
  { date: "03-08", All: 89.8, Baseball: 89.8, Soccer: 94.9, Basketball: 69.9 },
  { date: "03-09", All: 96.3, Baseball: 96.7, Soccer: 94.5, Basketball: 69.9 },
  { date: "03-10", All: 148.1, Baseball: 148.1 },
  { date: "03-11", All: 94.3, Baseball: 93.9, Soccer: 99.5, Basketball: 99.8 },
  { date: "03-15", All: 340.1, Baseball: 340.1 },
  { date: "03-16", All: 385.3, Baseball: 406.4, Soccer: 208, Basketball: 209.3 },
];

/* ── Projection helpers ── */
const PROJECTION_YEARS = [2026, 2027, 2028, 2029, 2030, 2031, 2032];

function buildGrowthProjection(baseCap: number, scenarios: { label: string; rate: number }[]) {
  return PROJECTION_YEARS.map((yr) => {
    const row: Record<string, number | string> = { year: yr.toString() };
    scenarios.forEach(({ label, rate }) => {
      row[label] = Math.round(baseCap * Math.pow(1 + rate, yr - 2026));
    });
    return row;
  });
}

const ROSTER_DATA = PROJECTION_YEARS.map((yr) => {
  const e = yr - 2026;
  return { year: yr.toString(), "MLB Athletes": 82 + e * 5, "MLS Athletes": 18 + e * 4, "Total Tracked": 570 + e * 15 };
});

const COLLECTIBLES_DATA = [
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

const GROWTH_DATA = buildGrowthProjection(SNAPSHOT.annualModerate, [
  { label: "Conservative (8%)", rate: 0.08 },
  { label: "Moderate (15%)", rate: 0.15 },
  { label: "Aggressive (25%)", rate: 0.25 },
]);

/* ── Shared chart tooltip style ── */
const tooltipStyle = {
  contentStyle: { background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 },
  labelStyle: { color: "hsl(var(--foreground))" },
};
const tickStyle = { fontSize: 11, fill: "hsl(var(--muted-foreground))" };

/* ── Component ── */
const MarketCapBlog = () => {
  const m = SNAPSHOT;
  const fmt = (n: number) => "$" + n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  const slug = "venezuelan-sports-cards-market-cap";

  return (
    <div className="min-h-screen">
      <SEOHead
        title="Why You Should Invest in Venezuelan Sports Cards — Market Cap & eBay Revenue Projections"
        description="Why collectors and investors should pay attention to Venezuelan athlete sports cards on eBay — market cap analysis, investment signals, revenue projections, and growth forecasts through 2032."
        path={`/blog/${slug}`}
        type="article"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: "Why You Should Invest in Venezuelan Sports Cards",
          description: "Data-driven investment thesis for the Venezuelan athlete card market on eBay.",
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
          Why You Should Invest in Venezuelan Sports Cards
        </h1>
        <p className="text-base text-muted-foreground mb-1">Market Cap, eBay Revenue & Growth Projections Through 2032</p>
        <div className="flex items-center justify-between mb-8">
          <p className="text-sm text-muted-foreground">{m.date} · VZLA Sports Elite</p>
          <SocialShare url={`https://vzlasportselite.com/blog/${slug}`} title="Why Invest in Venezuelan Sports Cards" compact />
        </div>

        {/* ── Intro ── */}
        <section className="glass-panel p-6 rounded-xl mb-8">
          <h2 className="text-lg font-display font-bold text-flag-gradient mb-3">The Investment Case for Venezuelan Cards</h2>
          <p className="text-muted-foreground text-sm leading-7 text-justify mb-4">
            If you're a collector looking for the next undervalued niche with explosive upside, Venezuelan athlete sports cards deserve your attention. With <strong className="text-foreground">{m.athleteCount} athletes</strong> currently tracked across MLB, MLS, and NBA, this is one of the deepest talent pools feeding into North American professional sports — and the card market hasn't fully priced it in yet.
          </p>
          <p className="text-muted-foreground text-sm leading-7 text-justify mb-4">
            This analysis uses <strong className="text-foreground">snapshot data from our platform</strong> — active eBay listings, sold comps, PSA population reports, Taguchi statistical pricing, and historical indices — to make the investment case. Whether you're a long-term holder, a flipper looking for arbitrage, or a new collector entering the hobby, the numbers tell a compelling story.
          </p>
          <p className="text-muted-foreground text-sm leading-7 text-justify">
            Below we break down the market cap, annual revenue potential, growth catalysts, and why the Venezuelan card market sits at the intersection of three powerful trends: <strong className="text-foreground">a global collectibles boom</strong>, <strong className="text-foreground">an unprecedented Latin American talent pipeline</strong>, and <strong className="text-foreground">eBay's expanding authentication infrastructure</strong>.
          </p>
        </section>

        {/* ── Why Invest: 5 Reasons ── */}
        <section className="glass-panel p-6 rounded-xl mb-10">
          <h2 className="text-lg font-display font-bold text-flag-gradient mb-4">5 Reasons to Invest Now</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: "📈", title: "Undervalued Market", desc: `Average raw card sells for just $${m.avgRawSold} — significantly below comparable markets for Dominican or Cuban athletes. Early entry means maximum upside.` },
              { icon: "⚾", title: "Deep Talent Pipeline", desc: "Venezuela produces ~80+ active MLB players annually with dozens more in minor league systems. Every call-up creates instant card demand." },
              { icon: "🏆", title: "Tournament Catalysts", desc: "WBC, Copa América, and Olympic cycles create recurring 200–400% price spikes every 2–4 years. Timing purchases between events maximizes returns." },
              { icon: "🔐", title: "PSA-Graded Liquidity", desc: `With ${m.totalPsaPop} total graded cards, the certified market provides price floors and institutional-grade liquidity that raw cards lack.` },
              { icon: "⚽", title: "Multi-Sport Diversification", desc: "Unlike most country-specific niches, Venezuelan cards span baseball, soccer, and basketball — hedging against single-sport downturns." },
              { icon: "💰", title: "Grading Premium Arbitrage", desc: `Raw cards average $${m.avgRawListed} listed vs $${m.avgGradedListed} graded — a ${Math.round(parseFloat(m.avgGradedListed) / parseFloat(m.avgRawListed))}x premium. Buy raw, grade, and capture the spread.` },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="border border-border/50 rounded-lg p-4 bg-secondary/30">
                <div className="text-2xl mb-2">{icon}</div>
                <h3 className="font-display font-bold text-foreground text-sm mb-1">{title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Investment Signal Snapshot ── */}
        <section className="glass-panel p-6 rounded-xl mb-10">
          <h2 className="text-lg font-display font-bold text-flag-gradient mb-3">Investment Signals From Our Data</h2>
          <p className="text-xs text-muted-foreground mb-4">Our platform tracks five key investment signals using Taguchi statistical methods and eBay market data</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {[
              { signal: "Buy Low", desc: "Listed price below avg sold — undervalued cards ready to buy", color: "text-green-400" },
              { signal: "Flip Potential", desc: "High volatility = arbitrage opportunities for active traders", color: "text-vzla-yellow" },
              { signal: "Signal Strength", desc: "Taguchi S/N ratio measures pricing predictability", color: "text-blue-400" },
              { signal: "Fast Mover", desc: "Low days on market — high-demand cards that sell quickly", color: "text-orange-400" },
              { signal: "Overpriced & Slow", desc: "High price gaps + high DOM — cards to avoid or negotiate", color: "text-red-400" },
            ].map(({ signal, desc, color }) => (
              <div key={signal} className="text-center p-3 rounded-lg bg-secondary/40 border border-border/30">
                <p className={`font-display font-bold text-sm ${color} mb-1`}>{signal}</p>
                <p className="text-[10px] text-muted-foreground leading-snug">{desc}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-4 italic">
            These signals are available for every athlete on our <Link to="/data" className="text-vzla-yellow hover:underline">Market Intel dashboard</Link>, updated daily with live eBay data.
          </p>
        </section>

        {/* ── Key Metrics Grid ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            { label: "Athletes Tracked", value: m.athleteCount.toString() },
            { label: "Est. Market Cap", value: fmt(m.totalMarketCap) },
            { label: "Total PSA Pop", value: m.totalPsaPop },
            { label: "Avg Raw Sold", value: `$${m.avgRawSold}` },
            { label: "Avg Raw Listed", value: `$${m.avgRawListed}` },
            { label: "Avg Graded Listed", value: `$${m.avgGradedListed}` },
            { label: "Avg Graded Sold", value: `$${m.avgGradedSold}` },
            { label: "Annual Rev (Moderate)", value: fmt(m.annualModerate) },
          ].map(({ label, value }) => (
            <div key={label} className="glass-panel p-4 rounded-xl text-center">
              <p className="text-xs text-muted-foreground mb-1">{label}</p>
              <p className="text-lg font-display font-bold text-vzla-yellow">{value}</p>
            </div>
          ))}
        </div>

        {/* ── Market Index History ── */}
        <section className="glass-panel p-6 rounded-xl mb-10">
          <h2 className="text-lg font-display font-bold text-flag-gradient mb-1">Market Index — Recent Trend</h2>
          <p className="text-xs text-muted-foreground mb-4">Base-100 price index across all tracked athletes (filtered for outliers)</p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={INDEX_HISTORY}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={tickStyle} />
                <YAxis tick={tickStyle} />
                <Tooltip {...tooltipStyle} />
                <Legend />
                <Line type="monotone" dataKey="All" stroke="hsl(var(--vzla-yellow))" strokeWidth={2} dot={false} name="All Sports" />
                <Line type="monotone" dataKey="Baseball" stroke="#ef4444" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="Soccer" stroke="#3b82f6" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="Basketball" stroke="#f97316" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* ── Sport Breakdown Bar Chart ── */}
        <section className="glass-panel p-6 rounded-xl mb-10">
          <h2 className="text-lg font-display font-bold text-flag-gradient mb-1">Market Breakdown by Sport</h2>
          <p className="text-xs text-muted-foreground mb-4">Athlete count and average sold price by sport</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={SPORT_BREAKDOWN}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="sport" tick={tickStyle} />
                <YAxis tick={tickStyle} />
                <Tooltip {...tooltipStyle} />
                <Legend />
                <Bar dataKey="Athlete Count" fill="#fbbf24" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Avg Sold Price" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* ── Revenue Projections ── */}
        <section className="glass-panel p-6 rounded-xl mb-10">
          <h2 className="text-lg font-display font-bold text-flag-gradient mb-1">Annual Revenue Projections (2026–2032)</h2>
          <p className="text-xs text-muted-foreground mb-4">Three growth scenarios based on current market data and athlete pipeline expansion</p>
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="text-center p-3 rounded-lg bg-secondary/50">
              <p className="text-xs text-muted-foreground">Conservative (8%/yr)</p>
              <p className="text-sm font-bold text-foreground">{fmt(m.annualConservative)}</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-secondary/50">
              <p className="text-xs text-muted-foreground">Moderate (15%/yr)</p>
              <p className="text-sm font-bold text-vzla-yellow">{fmt(m.annualModerate)}</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-secondary/50">
              <p className="text-xs text-muted-foreground">Aggressive (25%/yr)</p>
              <p className="text-sm font-bold text-foreground">{fmt(m.annualAggressive)}</p>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={GROWTH_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="year" tick={tickStyle} />
                <YAxis tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} tick={tickStyle} />
                <Tooltip formatter={(v: number) => fmt(v)} {...tooltipStyle} />
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
              <LineChart data={ROSTER_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="year" tick={tickStyle} />
                <YAxis tick={tickStyle} />
                <Tooltip {...tooltipStyle} />
                <Legend />
                <Line type="monotone" dataKey="MLB Athletes" stroke="#ef4444" strokeWidth={2} />
                <Line type="monotone" dataKey="MLS Athletes" stroke="#3b82f6" strokeWidth={2} />
                <Line type="monotone" dataKey="Total Tracked" stroke="#fbbf24" strokeWidth={2} strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* ── Global Collectibles Market ── */}
        <section className="glass-panel p-6 rounded-xl mb-10">
          <h2 className="text-lg font-display font-bold text-flag-gradient mb-1">The Global Collectibles Boom</h2>
          <p className="text-xs text-muted-foreground mb-4">Global collectibles market size ($ billions) — sports cards and eBay collectibles segments</p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={COLLECTIBLES_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="year" tick={tickStyle} />
                <YAxis tickFormatter={(v: number) => `$${v}B`} tick={tickStyle} />
                <Tooltip formatter={(v: number, name: string) => [`$${v}B`, name]} {...tooltipStyle} />
                <Legend />
                <Area type="monotone" dataKey="Global Collectibles" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.12} strokeWidth={2} />
                <Area type="monotone" dataKey="Sports Cards" stroke="#fbbf24" fill="#fbbf24" fillOpacity={0.2} strokeWidth={2} />
                <Area type="monotone" dataKey="eBay Collectibles" stroke="#22c55e" fill="#22c55e" fillOpacity={0.15} strokeWidth={1.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* ── Collectibles Industry Context ── */}
        <section className="glass-panel p-6 rounded-xl mb-10">
          <h2 className="text-lg font-display font-bold text-flag-gradient mb-3">The Collectibles Industry & Where Venezuelan Cards Fit</h2>
          <div className="space-y-4 text-muted-foreground text-sm leading-7 text-justify">
            <p>
              <strong className="text-foreground">A $580+ Billion Industry:</strong> The global collectibles market — spanning trading cards, memorabilia, art, coins, and luxury goods — has grown from $372 billion in 2020 to an estimated $579 billion in 2026, a compound annual growth rate (CAGR) of roughly 7.7%. Industry analysts project the market to surpass $900 billion by 2032, driven by digitalization, fractional ownership platforms, and a new generation of collectors entering through social media.
            </p>
            <p>
              <strong className="text-foreground">Sports Cards: The Fastest-Growing Segment:</strong> Within the broader collectibles universe, sports trading cards have been the breakout category. After the pandemic-driven "card boom" that pushed the segment to $22 billion in 2021, the market corrected but has rebounded strongly to an estimated $22 billion in 2026. The sports card market is projected to reach $50 billion by 2032, fueled by institutional investment (e.g., Alt Funds, Rally, PWCC vaults), PSA/BGS grading backlogs validating demand, and a shift toward cards as alternative investment assets.
            </p>
            <p>
              <strong className="text-foreground">eBay's Collectibles Dominance:</strong> eBay processes an estimated $16 billion in collectibles transactions annually (2026), making it the single largest marketplace for secondary card sales. The platform's authentication programs (eBay Authenticity Guarantee for cards over $750) and integrated grading partnerships have increased buyer confidence and average sale prices. Venezuelan athlete cards benefit directly from this infrastructure.
            </p>
            <p>
              <strong className="text-foreground">Venezuelan Market Share Opportunity:</strong> With an estimated market cap of <strong className="text-vzla-yellow">{fmt(m.totalMarketCap)}</strong> and projected moderate annual revenue of <strong className="text-vzla-yellow">{fmt(m.annualModerate)}</strong>, Venezuelan athlete cards represent a micro-niche with outsized growth potential. As the Venezuelan talent pipeline deepens — particularly with young MLB prospects and MLS expansion — this segment could capture an increasing share of the broader Latin American sports card market, estimated at $2–4 billion and growing 12–18% annually.
            </p>
            <p>
              <strong className="text-foreground">Emerging Trends Favoring Growth:</strong> Several macro trends align with bullish projections for Venezuelan sports cards: (1) Fanatics' takeover of Topps and aggressive licensing deals creating new product supply, (2) cross-sport collecting becoming mainstream (baseball + soccer cards from the same country), (3) Latin American collector bases growing with mobile-first eBay access, and (4) international tournament cycles (WBC, Copa América) creating recurring demand catalysts every 2–4 years.
            </p>
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
              <strong className="text-foreground">PSA Grading Volume:</strong> With a combined PSA population of <strong className="text-vzla-yellow">{m.totalPsaPop}</strong> graded cards across all tracked athletes, the certified card market provides price floors and institutional-grade liquidity. Graded cards command a significant premium — our data shows an average graded listed price of <strong className="text-vzla-yellow">${m.avgGradedListed}</strong> versus <strong className="text-vzla-yellow">${m.avgRawListed}</strong> for raw cards.
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
          <h2 className="text-lg font-display font-bold text-flag-gradient mb-3">📐 How We Estimated the Market Cap</h2>
          <div className="space-y-4 text-muted-foreground text-sm leading-7 text-justify">
            <p>Transparency matters. Here's exactly how the numbers in this article are calculated, so you can evaluate the analysis for yourself.</p>

            <div className="border border-border/50 rounded-lg p-4 bg-secondary/20">
              <h3 className="font-display font-bold text-foreground text-sm mb-2">1. Market Cap (Snapshot Value)</h3>
              <p className="mb-2">We estimate the <strong className="text-foreground">total market cap</strong> as the sum of each athlete's inventory value:</p>
              <div className="bg-background/60 rounded-md p-3 text-center font-mono text-xs text-vzla-yellow mb-2">
                Market Cap = Σ (Average Listed Price × PSA Population) for each athlete
              </div>
              <p className="text-xs">
                For <strong className="text-foreground">raw cards</strong>, we use the Taguchi Winsorized Mean of active eBay listings as the price, multiplied by the PSA population count (or a conservative default of 10 if no PSA data exists). For <strong className="text-foreground">graded cards</strong>, we apply the same formula using graded listing prices and graded PSA pop (default 5). The two are summed to produce the total market cap figure of <strong className="text-vzla-yellow">{fmt(m.totalMarketCap)}</strong>.
              </p>
            </div>

            <div className="border border-border/50 rounded-lg p-4 bg-secondary/20">
              <h3 className="font-display font-bold text-foreground text-sm mb-2">2. Annual Revenue Estimates</h3>
              <p className="mb-2">Revenue projections estimate how much money flows through the Venezuelan card market each year:</p>
              <div className="bg-background/60 rounded-md p-3 text-center font-mono text-xs text-vzla-yellow mb-2">
                Annual Revenue = Athletes × Monthly Sales per Athlete × Avg Sold Price × 12
              </div>
              <p className="text-xs">
                We model three scenarios based on estimated monthly transaction volume per athlete: <strong className="text-foreground">Conservative</strong> (30 sales/month), <strong className="text-foreground">Moderate</strong> (75 sales/month), and <strong className="text-foreground">Aggressive</strong> (150 sales/month). The average sold price is the midpoint of raw and graded sold averages from eBay completed listings.
              </p>
            </div>

            <div className="border border-border/50 rounded-lg p-4 bg-secondary/20">
              <h3 className="font-display font-bold text-foreground text-sm mb-2">3. Pricing Methodology</h3>
              <p className="text-xs">
                All prices use the <strong className="text-foreground">Taguchi Winsorized Mean</strong> — a robust statistical average that removes extreme outliers (top/bottom 10%) before calculating the mean. This produces more reliable price estimates than simple averages. The <strong className="text-foreground">Coefficient of Variation (CV)</strong> measures price stability, and the <strong className="text-foreground">Signal-to-Noise ratio</strong> (10 × log₁₀(1 / CV²)) quantifies pricing predictability on a decibel scale.
              </p>
            </div>

            <div className="border border-border/50 rounded-lg p-4 bg-secondary/20">
              <h3 className="font-display font-bold text-foreground text-sm mb-2">4. Growth Projections</h3>
              <p className="text-xs">
                Projections through 2032 apply compound annual growth rates (8%, 15%, 25%) to the moderate annual revenue baseline. These rates are informed by historical sports card market growth trends and broader collectibles industry forecasts — they are <strong className="text-foreground">not guarantees</strong> and represent scenarios, not predictions.
              </p>
            </div>

            <div className="border border-border/50 rounded-lg p-4 bg-secondary/20">
              <h3 className="font-display font-bold text-foreground text-sm mb-2">5. Data Sources</h3>
              <ul className="list-disc list-inside text-xs space-y-1">
                <li><strong className="text-foreground">eBay Browse API</strong> — active listing prices, days on market, and listing counts</li>
                <li><strong className="text-foreground">eBay Sold Listings</strong> — completed sale prices via HTML scraping for sold comps</li>
                <li><strong className="text-foreground">PSA Population Report</strong> — graded card counts by athlete (gem rate, total grades)</li>
                <li><strong className="text-foreground">SportsCardsPro</strong> — raw pricing benchmarks and historical price data</li>
                <li><strong className="text-foreground">VZLA Sports Elite Platform</strong> — proprietary index calculations, base-100 price indices, and daily automated snapshots</li>
              </ul>
              <p className="text-xs mt-2">All prices are normalized to USD. Data snapshot taken {m.date}.</p>
            </div>

            <p className="text-xs italic border-l-2 border-vzla-yellow/40 pl-3">
              <strong className="text-foreground">Important:</strong> These estimates are observational analyses derived from the data this platform collects and processes. They reflect market conditions at the time of calculation and should not be interpreted as precise valuations or financial forecasts. Actual market values depend on factors beyond what any data pipeline can capture — including buyer intent, card condition nuances, and real-time market sentiment.
            </p>
          </div>
        </section>

        {/* ── Disclaimer ── */}
        <section className="glass-panel p-6 rounded-xl mb-10 border-yellow-500/20">
          <h2 className="text-sm font-display font-bold text-muted-foreground mb-2">⚠️ Disclaimer — Not Financial Advice</h2>
          <div className="space-y-2 text-muted-foreground text-xs leading-6 text-justify">
            <p>
              This article is a <strong className="text-foreground">data-driven market analysis</strong> based entirely on publicly available information collected and processed by VZLA Sports Elite. All figures, projections, market cap estimates, revenue forecasts, and investment signals referenced herein are derived from automated data pipelines (eBay Browse API, sold listing scraping, PSA Population Reports, and SportsCardsPro benchmarks) and are presented <strong className="text-foreground">for informational and educational purposes only</strong>.
            </p>
            <p>
              <strong className="text-foreground">Nothing in this article constitutes financial, investment, or professional advice.</strong> The terms "invest," "investment," "returns," and similar language are used colloquially to describe collecting strategies and market observations — they do not imply guaranteed financial returns or recommend any specific purchase or sale of sports cards or other collectibles.
            </p>
            <p>
              Sports card values are highly volatile and influenced by factors including but not limited to: athlete performance, injuries, market sentiment, grading outcomes, product supply, and macroeconomic conditions. Past performance and historical data do not guarantee future results. All projections are speculative estimates based on current trends and assumptions that may not materialize.
            </p>
            <p>
              Readers should conduct their own research and consult qualified professionals before making any financial decisions. VZLA Sports Elite assumes no liability for decisions made based on the information presented in this article. For more details, please review our <Link to="/privacy" className="text-vzla-yellow hover:underline">Privacy Policy & Financial Disclaimer</Link>.
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
