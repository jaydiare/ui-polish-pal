const EBAY_STORE = "https://www.ebay.ca/str/localherossportscards?mkcid=1&mkrid=706-53473-19255-0&siteid=2&campid=5339142305&toolid=10001&mkevt=1";
const CARDHEDGE = "https://www.cardhedger.com?via=vzlaelite";
const BCW = "https://www.bcwsupplies.com/?acc=vzlaelite";

const SOCIAL = {
  instagram: "https://www.instagram.com/localheros_sportscards/",
  twitter: "https://x.com/jdiegorceli1?s=21",
  facebook: "https://www.facebook.com/share/18NzEJirJZ/?mibextid=wwXIfr",
};

const VzlaFooter = () => {
  return (
    <>
      <footer id="about" className="mt-16 border-t border-border bg-card">
        {/* Sponsor banners */}
        <div className="max-w-5xl mx-auto px-6 pt-8 pb-4 flex flex-wrap items-center justify-center gap-6">
          <a href={CARDHEDGE} target="_blank" rel="noopener noreferrer" title="Card Hedge Sports & Trading Card Analytics">
            <img
              src="./assets/cardhedge_806_318.jpg"
              alt="Card Hedge Sports & Trading Card Analytics"
              className="h-16 md:h-20 w-auto rounded-lg shadow-lg hover:scale-[1.03] transition-transform"
              loading="lazy"
            />
          </a>
          <a href={BCW} target="_blank" rel="noopener noreferrer" title="BCW - Protect, Store, Display">
            <img
              src="./assets/BCW.jpg"
              alt="BCW - Protect, Store, Display"
              className="h-16 md:h-20 w-auto rounded-lg shadow-lg hover:scale-[1.03] transition-transform"
              loading="lazy"
            />
          </a>
        </div>

        <div className="max-w-5xl mx-auto px-6 py-10">
          {/* Top row — 3-column like CardHedge */}
          <div className="grid grid-cols-1 md:grid-cols-[1.5fr_1fr_1fr] gap-10 mb-10">
            {/* Brand column */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl cta-flag flex items-center justify-center">
                  <span className="font-display font-bold text-sm text-white">VZ</span>
                </div>
                <div>
                  <div className="font-display font-bold text-foreground">VZLA SPORTS ELITE</div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed mb-5 max-w-sm">
                Your Venezuelan athletes trading card index. Get real-time prices, market stability insights, and smart budget tools for sports card collecting.
              </p>
              <div className="flex gap-2">
                <a className="icon-btn" href={SOCIAL.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="5" />
                    <circle cx="12" cy="12" r="4" />
                    <circle cx="17.5" cy="6.5" r="1" />
                  </svg>
                </a>
                <a className="icon-btn" href={SOCIAL.twitter} target="_blank" rel="noopener noreferrer" aria-label="X (Twitter)">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                    <path d="M18.9 2H22l-6.8 7.8L23 22h-6.2l-4.8-7-6.1 7H2l7.3-8.4L1 2h6.4l4.4 6.4L18.9 2zm-1.1 18h1.7L7.2 3.9H5.4L17.8 20z" />
                  </svg>
                </a>
                <a className="icon-btn" href={SOCIAL.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                    <path d="M22 12a10 10 0 1 0-11.6 9.9v-7H8v-3h2.4V9.7c0-2.4 1.4-3.8 3.6-3.8 1 0 2 .2 2 .2v2.2h-1.1c-1.1 0-1.4.7-1.4 1.4V12H16l-.4 3h-2.1v7A10 10 0 0 0 22 12z" />
                  </svg>
                </a>
              </div>
            </div>

            {/* Resources column */}
            <div>
              <h4 className="font-display font-bold text-foreground text-sm mb-4">Resources</h4>
              <nav className="flex flex-col gap-2.5">
                <a href="#top" className="text-sm text-muted-foreground no-underline hover:text-foreground transition-colors">Home</a>
                <a href={EBAY_STORE} target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground no-underline hover:text-foreground transition-colors">eBay Store</a>
                <a href={CARDHEDGE} target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground no-underline hover:text-foreground transition-colors">Card Hedge AI</a>
                <a href={BCW} target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground no-underline hover:text-foreground transition-colors">BCW Supplies</a>
              </nav>
            </div>

            {/* Quick Links column */}
            <div>
              <h4 className="font-display font-bold text-foreground text-sm mb-4">Quick Links</h4>
              <nav className="flex flex-col gap-2.5">
                <a href="#top" className="text-sm text-muted-foreground no-underline hover:text-foreground transition-colors">Back to Top</a>
              </nav>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>© {new Date().getFullYear()} VZLA Sports Elite. All rights reserved.</span>
            <span className="flex items-center gap-2">
              Powered by real market data
              <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Data
              </span>
            </span>
          </div>
        </div>
      </footer>

      <div className="footer-banner-spacer" />
    </>
  );
};

export default VzlaFooter;
