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

  const ebayUrl = `${EBAY_BASE}&campid=${CAMPAIGN_ID}&customid=${topBanner.id}`;

  return (
    <aside className="side-banner">
      <AdSenseBlock />
      <a href={CARDHEDGE} target="_blank" rel="noopener noreferrer" title="Card Hedge Sports & Trading Card Analytics">
        <img src="./assets/cardhedge.jpg" alt="Card Hedge Sports & Trading Card Analytics" />
      </a>
      <a href={ebayUrl} target="_blank" rel="noopener noreferrer">
        <img src={topBanner.img} alt={topBanner.alt} />
      </a>
      <a href={BCW} target="_blank" rel="noopener noreferrer">
        <img src="./assets/BCW.jpg" alt="BCW - Protect, Store, Display" />
      </a>
    </aside>
  );
};

export default VzlaSideBanner;
