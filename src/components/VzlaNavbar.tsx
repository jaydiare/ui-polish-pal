import { useState } from "react";

const SOCIAL_LINKS = {
  instagram: "https://www.instagram.com/localheros_sportscards/",
  twitter: "https://x.com/jdiegorceli1?s=21",
  facebook: "https://www.facebook.com/share/18NzEJirJZ/?mibextid=wwXIfr",
};

const EBAY_STORE = "https://www.ebay.ca/str/localherossportscards?mkcid=1&mkrid=706-53473-19255-0&siteid=2&campid=5339142305&toolid=10001&mkevt=1";

const InstagramIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="1" />
  </svg>
);

const TwitterIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
    <path d="M18.9 2H22l-6.8 7.8L23 22h-6.2l-4.8-7-6.1 7H2l7.3-8.4L1 2h6.4l4.4 6.4L18.9 2zm-1.1 18h1.7L7.2 3.9H5.4L17.8 20z" />
  </svg>
);

const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
    <path d="M22 12a10 10 0 1 0-11.6 9.9v-7H8v-3h2.4V9.7c0-2.4 1.4-3.8 3.6-3.8 1 0 2 .2 2 .2v2.2h-1.1c-1.1 0-1.4.7-1.4 1.4V12H16l-.4 3h-2.1v7A10 10 0 0 0 22 12z" />
  </svg>
);

const SocialIcons = () => (
  <div className="flex gap-3.5 justify-center">
    <a className="icon-btn" href={SOCIAL_LINKS.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram">
      <InstagramIcon />
    </a>
    <a className="icon-btn" href={SOCIAL_LINKS.twitter} target="_blank" rel="noopener noreferrer" aria-label="X (Twitter)">
      <TwitterIcon />
    </a>
    <a className="icon-btn" href={SOCIAL_LINKS.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook">
      <FacebookIcon />
    </a>
  </div>
);

const VzlaNavbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);

  return (
    <>
      <nav className="vzla-nav p-6 flex items-center justify-between relative">
        <a href="#top" className="flex items-center gap-3.5 no-underline select-none">
          <span className="flex flex-col items-center text-center leading-none">
            <span className="text-foreground font-black text-lg tracking-[0.14em] uppercase whitespace-nowrap">
              VZLA SPORTS
            </span>
            <span className="w-full text-center mt-1.5 pt-1.5 border-t-2 border-foreground/[0.18] text-foreground/85 font-black text-[9px] tracking-[0.42em] uppercase">
              ELITE
            </span>
          </span>
        </a>

        {/* Desktop nav */}
        <ul className="hidden md:flex gap-7 items-center text-lg tracking-[0.02em] m-0 p-0 list-none">
          <li><a href="#top" className="text-foreground/90 no-underline font-bold hover:text-vzla-yellow transition-colors text-flag-gradient">Home</a></li>
          <li><a href="#about" className="text-foreground/90 no-underline font-bold hover:text-vzla-yellow transition-colors">About</a></li>

          <li className="relative">
            <button
              onClick={() => { setShopOpen(!shopOpen); setContactOpen(false); }}
              className="text-foreground/90 font-bold text-lg bg-transparent border-none cursor-pointer hover:text-vzla-yellow transition-colors inline-flex items-center gap-2"
            >
              Shop <span className="text-sm opacity-90">▾</span>
            </button>
            {shopOpen && (
              <div className="absolute right-0 top-[calc(100%+12px)] min-w-[240px] bg-[rgba(10,10,10,0.95)] border border-foreground/10 rounded-[18px] p-3 shadow-[0_20px_60px_rgba(0,0,0,0.65)] backdrop-blur-xl z-[99999]">
                <a
                  className="block px-3 py-2.5 rounded-xl text-foreground/90 text-[15px] no-underline hover:bg-vzla-yellow/10 hover:text-vzla-yellow transition-colors"
                  href={EBAY_STORE}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Visit my eBay Store
                </a>
              </div>
            )}
          </li>

          <li className="relative">
            <button
              onClick={() => { setContactOpen(!contactOpen); setShopOpen(false); }}
              className="text-foreground/90 font-bold text-lg bg-transparent border-none cursor-pointer hover:text-vzla-yellow transition-colors inline-flex items-center gap-2"
            >
              Contact <span className="text-sm opacity-90">▾</span>
            </button>
            {contactOpen && (
              <div className="absolute right-0 top-[calc(100%+12px)] min-w-[240px] bg-[rgba(10,10,10,0.95)] border border-foreground/10 rounded-[18px] p-3 shadow-[0_20px_60px_rgba(0,0,0,0.65)] backdrop-blur-xl z-[99999]">
                <SocialIcons />
              </div>
            )}
          </li>
        </ul>

        {/* Hamburger */}
        <button
          className="flex md:hidden w-11 h-11 rounded-xl border border-foreground/10 bg-foreground/[0.06] items-center justify-center cursor-pointer hover:border-vzla-mint/25 hover:bg-vzla-mint/10 transition-all"
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
        >
          <span className="relative block w-[22px] h-0.5 rounded-full bg-foreground before:content-[''] before:absolute before:left-0 before:w-[22px] before:h-0.5 before:rounded-full before:bg-foreground before:-top-[7px] after:content-[''] after:absolute after:left-0 after:w-[22px] after:h-0.5 after:rounded-full after:bg-foreground after:top-[7px]" />
        </button>
      </nav>

      {/* Mobile menu overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[10000] bg-[rgba(10,10,10,0.92)] backdrop-blur-[14px] p-[18px]">
          <div className="flex items-center justify-between gap-3">
            <a href="#top" className="flex items-center gap-3 no-underline select-none" onClick={() => setMobileOpen(false)}>
              <span className="flex flex-col items-center text-center leading-none">
                <span className="text-foreground font-black text-[13px] tracking-[0.10em] uppercase whitespace-nowrap">VZLA SPORTS</span>
                <span className="w-full text-center mt-1.5 pt-1.5 border-t-2 border-foreground/[0.18] text-foreground/85 font-black text-[8px] tracking-[0.28em] uppercase">ELITE</span>
              </span>
            </a>
            <button
              className="w-[46px] h-[46px] rounded-[14px] border border-foreground/10 bg-foreground/[0.06] text-vzla-yellow text-[28px] leading-none cursor-pointer"
              onClick={() => setMobileOpen(false)}
            >
              ✕
            </button>
          </div>

          <div className="mt-[22px] flex flex-col gap-3.5 max-w-[520px] mx-auto">
            <a href="#top" onClick={() => setMobileOpen(false)} className="flex items-center justify-center w-full px-[18px] py-[18px] rounded-[18px] border border-foreground/[0.16] bg-foreground/[0.06] text-foreground/90 no-underline font-extrabold text-xl">Home</a>
            <a href="#about" onClick={() => setMobileOpen(false)} className="flex items-center justify-center w-full px-[18px] py-[18px] rounded-[18px] border border-foreground/[0.16] bg-foreground/[0.06] text-foreground/90 no-underline font-extrabold text-xl">About</a>

            <a
              href={EBAY_STORE}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center w-full px-[18px] py-[18px] rounded-[18px] border border-foreground/[0.16] bg-foreground/[0.06] text-foreground/90 no-underline font-extrabold text-xl"
            >
              Shop
            </a>

            <div className="mt-2.5 p-3.5 rounded-[18px] border border-foreground/10 bg-[rgba(0,0,0,0.35)]">
              <SocialIcons />
            </div>

            <a href="#top" onClick={() => setMobileOpen(false)} className="mt-2.5 flex justify-center py-4 px-[18px] rounded-full font-black cta-flag no-underline">
              Top
            </a>
          </div>
        </div>
      )}
    </>
  );
};

export default VzlaNavbar;
