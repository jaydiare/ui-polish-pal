import { useState, useEffect } from "react";

const EBAY_BASE = "https://www.ebay.ca/sch/i.html?_nkw=trading+cards&mkevt=1&mkcid=1&mkrid=706-53473-19255-0&toolid=10001";
const CAMPAIGN_ID = "5339142321";

const FOOTER_BANNERS = [
  { id: "footer-main", img: "/assets/Baseball-728x90.jpg", alt: "eBay banner" },
  { id: "footer-alt", img: "/assets/Baseball-728x90_1.jpg", alt: "eBay banner" },
];

interface EpnData {
  bestBanner?: string | null;
}

const VzlaEbayFooter = () => {
  const [banner, setBanner] = useState(FOOTER_BANNERS[0]);

  useEffect(() => {
    fetch("https://raw.githubusercontent.com/jaydiare/ui-polish-pal/main/data/epn-performance.json")
      .then((r) => r.ok ? r.json() : null)
      .then((data: EpnData | null) => {
        if (!data?.bestBanner) return;
        const match = FOOTER_BANNERS.find((b) => b.id === data.bestBanner);
        if (match) setBanner(match);
      })
      .catch(() => {});
  }, []);

  const url = `${EBAY_BASE}&campid=${CAMPAIGN_ID}&customid=${banner.id}`;

  return (
    <footer className="ebay-footer">
      <div className="flex items-center justify-center gap-2 sm:gap-4">
        <a href={url} target="_blank" rel="noopener noreferrer">
          <img src={banner.img} alt={banner.alt} className="ebay-banner-img" loading="lazy" width="728" height="90" />
        </a>
        <a href="https://marketmoversapp.com/vzlaelite" target="_blank" rel="noopener noreferrer" title="Market Movers App">
          <img src="/assets/mm-circle-logo-white.png" alt="Market Movers App" className="h-10 sm:h-[100px] w-auto p-1" loading="eager" />
        </a>
      </div>
    </footer>
  );
};

export default VzlaEbayFooter;
