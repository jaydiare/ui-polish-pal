import { useState, useEffect, useRef } from "react";

const EBAY_BASE = "https://www.ebay.ca/sch/i.html?_nkw=trading+cards&mkevt=1&mkcid=1&mkrid=706-53473-19255-0&toolid=10001";

const BCW = "https://www.bcwsupplies.com/?acc=vzlaelite";

const CAMPAIGN_ID = "5339142321";

interface EpnData {
  bestBanner?: string | null;
}

const BANNERS = [
  {
    id: "sidebar-ebay-right",
    img: "./assets/ebay-300x600-right.jpg",
    alt: "Shop Trading Cards on eBay",
  },
  {
    id: "sidebar-ebay-alt-right",
    img: "./assets/ebay-300x600-left.jpg",
    alt: "Shop Trading Cards on eBay",
  },
];

const AFFILIATES = [
  {
    id: "sidebar-bcw-right",
    href: BCW,
    img: "/assets/BCW.jpg",
    alt: "BCW - Protect, Store, Display",
  },
  {
    id: "sidebar-mm-right",
    href: "https://marketmoversapp.com/vzlaelite",
    img: "/assets/mm-full-logo-white.svg",
    alt: "Market Movers App",
    className: "p-3",
  },
];

const AdSenseBlock = () => {
  const pushed = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); observer.disconnect(); } },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!inView || pushed.current) return;
    try {
      ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
      pushed.current = true;
    } catch {
      // adsbygoogle not loaded yet
    }
  }, [inView]);

  return (
    <div ref={containerRef} className="w-full flex justify-center">
      {inView && (
        <ins
          className="adsbygoogle"
          style={{ display: "block" }}
          data-ad-client="ca-pub-1118000382291516"
          data-ad-slot="3005539188"
          data-ad-format="autorelaxed"
        />
      )}
    </div>
  );
};

const VzlaSideBannerRight = () => {
  const [topBanner, setTopBanner] = useState(BANNERS[0]);

  useEffect(() => {
    fetch("https://raw.githubusercontent.com/jaydiare/ui-polish-pal/main/data/epn-performance.json")
      .then((r) => r.ok ? r.json() : null)
      .then((data: EpnData | null) => {
        if (!data?.bestBanner) return;
        const match = BANNERS.find((b) => b.id.replace("-right", "") === data.bestBanner);
        if (match) setTopBanner(match);
      })
      .catch(() => {});
  }, []);

  const ebayUrl = `${EBAY_BASE}&campid=${CAMPAIGN_ID}&customid=${topBanner.id}`;

  return (
    <aside className="side-banner-right">
      <a href={ebayUrl} target="_blank" rel="noopener noreferrer" title={topBanner.alt}>
        <img src={topBanner.img} alt={topBanner.alt} />
      </a>
      {AFFILIATES.map((a) => (
        <div key={a.id} className="flex flex-col items-center">
          <a href={a.href} target="_blank" rel="noopener noreferrer" title={a.alt}>
            <img src={a.img} alt={a.alt} className={(a as any).className || ""} />
          </a>
          {a.id === "sidebar-mm-right" && (
            <a href={a.href} target="_blank" rel="noopener noreferrer" className="text-center text-xs text-cyan-400 font-semibold mt-1 hover:underline">
              20% Off with <span className="font-bold text-white">VZLAELITE</span> coupon code
            </a>
          )}
        </div>
      ))}
      <AdSenseBlock />
    </aside>
  );
};

export default VzlaSideBannerRight;
