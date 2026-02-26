const EBAY_STORE = "https://www.ebay.ca/str/localherossportscards?mkcid=1&mkrid=706-53473-19255-0&siteid=2&campid=5339142305&toolid=10001&mkevt=1";

const SOCIAL = {
  instagram: "https://www.instagram.com/localheros_sportscards/",
  twitter: "https://x.com/jdiegorceli1?s=21",
  facebook: "https://www.facebook.com/share/18NzEJirJZ/?mibextid=wwXIfr",
};

const VzlaFooter = () => {
  return (
    <>
      <footer className="mt-[54px] border-t border-foreground/[0.08] bg-[#070707]">
        <div className="max-w-[1400px] mx-auto px-[18px] py-7 flex items-center justify-between gap-[18px] flex-wrap">
          <div className="flex flex-col leading-none">
            <div className="font-black tracking-[0.14em] uppercase">VZLA SPORTS</div>
            <div className="mt-1.5 pt-1.5 border-t-2 border-foreground/[0.18] font-black text-[10px] tracking-[0.42em] opacity-75 uppercase text-center">
              ELITE
            </div>
          </div>

          <div className="flex gap-[18px] font-extrabold uppercase tracking-[0.08em] text-xs flex-wrap justify-center">
            <a href="#top" className="text-foreground/85 no-underline px-2.5 py-2 rounded-[10px] hover:text-vzla-yellow hover:bg-vzla-yellow/[0.08] transition-all">Home</a>
            <a href="#about" className="text-foreground/85 no-underline px-2.5 py-2 rounded-[10px] hover:text-vzla-yellow hover:bg-vzla-yellow/[0.08] transition-all">About</a>
            <a href={EBAY_STORE} target="_blank" rel="noopener noreferrer" className="text-foreground/85 no-underline px-2.5 py-2 rounded-[10px] hover:text-vzla-yellow hover:bg-vzla-yellow/[0.08] transition-all">Shop</a>
            <a href="#top" className="text-foreground/85 no-underline px-2.5 py-2 rounded-[10px] hover:text-vzla-yellow hover:bg-vzla-yellow/[0.08] transition-all">Top</a>
          </div>

          <div className="flex gap-3">
            <a className="icon-btn !w-[42px] !h-[42px]" href={SOCIAL.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.5" cy="6.5" r="1" />
              </svg>
            </a>
            <a className="icon-btn !w-[42px] !h-[42px]" href={SOCIAL.twitter} target="_blank" rel="noopener noreferrer" aria-label="X (Twitter)">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M18.9 2H22l-6.8 7.8L23 22h-6.2l-4.8-7-6.1 7H2l7.3-8.4L1 2h6.4l4.4 6.4L18.9 2zm-1.1 18h1.7L7.2 3.9H5.4L17.8 20z" />
              </svg>
            </a>
            <a className="icon-btn !w-[42px] !h-[42px]" href={SOCIAL.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M22 12a10 10 0 1 0-11.6 9.9v-7H8v-3h2.4V9.7c0-2.4 1.4-3.8 3.6-3.8 1 0 2 .2 2 .2v2.2h-1.1c-1.1 0-1.4.7-1.4 1.4V12H16l-.4 3h-2.1v7A10 10 0 0 0 22 12z" />
              </svg>
            </a>
          </div>
        </div>

        <div className="text-center px-3 pt-3.5 pb-[18px] text-foreground/55">
          <div>© VZLA SPORTS ELITE 2026</div>
          <div className="mt-2 text-sm tracking-wide opacity-80">Whitby, Ontario, Canada</div>
        </div>
      </footer>

      <div className="footer-banner-spacer" />
    </>
  );
};

export default VzlaFooter;
