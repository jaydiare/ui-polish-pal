import { useState, useEffect, useRef } from "react";

const EBAY_BASE = "https://www.ebay.ca/sch/i.html?_nkw=trading+cards&mkevt=1&mkcid=1&mkrid=706-53473-19255-0&toolid=10001";
const CARDHEDGE = "https://www.cardhedger.com?via=vzlaelite";
const BCW = "https://www.bcwsupplies.com/?acc=vzlaelite";

const CAMPAIGN_ID = "5339142321";

interface EpnData {
  bestBanner?: string | null;
}

const BANNERS = [
  {
    id: "sidebar-ebay",
    img: "./assets/ebay-300x600-left.jpg",
    alt: "Shop Trading Cards on eBay",
  },
  {
    id: "sidebar-ebay-alt",
    img: "./assets/ebay-300x600-right.jpg",
    alt: "Shop Trading Cards on eBay",
  },
];

const AdSenseBlock = () => {
  const pushed = useRef(false);

  useEffect(() => {
    if (pushed.current) return;
    try {
      ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
      pushed.current = true;
    } catch {
      // adsbygoogle not loaded yet
    }
  }, []);

  return (
    <div className="w-full flex justify-center">
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client="ca-pub-1118000382291516"
        data-ad-slot="3005539188"
        data-ad-format="autorelaxed"
      />
    </div>
  );
};

const AFFILIATES = [
  {
    id: "sidebar-cardhedge",
    href: CARDHEDGE,
    img: "./assets/cardhedge.jpg",
    alt: "Card Hedge Sports & Trading Card Analytics",
  },
  {
    id: "sidebar-bcw",
    href: BCW,
    img: "./assets/BCW.jpg",
    alt: "BCW - Protect, Store, Display",
  },
];

const VzlaSideBanner = () => {
  const [topBanner, setTopBanner] = useState(BANNERS[0]);

  useEffect(() => {
    fetch("https://raw.githubusercontent.com/jaydiare/ui-polish-pal/main/data/epn-performance.json")
      .then((r) => r.ok ? r.json() : null)
      .then((data: EpnData | null) => {
        if (!data?.bestBanner) return;
        const match = BANNERS.find((b) => b.id === data.bestBanner);
        if (match) setTopBanner(match);
      })
      .catch(() => {});
  }, []);

  // Pick 2 of 3 affiliates randomly each mount (eBay + 1 of CardHedge/BCW)
  const [selectedAffiliates] = useState(() => {
    const shuffled = [...AFFILIATES].sort(() => Math.random() - 0.5);
    const ebayUrl = `${EBAY_BASE}&campid=${CAMPAIGN_ID}&customid=${topBanner.id}`;
    const ebayAffiliate = {
      id: topBanner.id,
      href: ebayUrl,
      img: topBanner.img,
      alt: topBanner.alt,
    };
    return [ebayAffiliate, shuffled[0]];
  });

  return (
    <aside className="side-banner">
      <AdSenseBlock />
      {selectedAffiliates.map((a) => (
        <a key={a.id} href={a.href} target="_blank" rel="noopener noreferrer" title={a.alt}>
          <img src={a.img} alt={a.alt} />
        </a>
      ))}
    </aside>
  );
};

export default VzlaSideBanner;
