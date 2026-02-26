import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useLocation } from "react-router-dom";

const SOCIAL_LINKS = {
  instagram: "https://www.instagram.com/localheros_sportscards/",
  twitter: "https://x.com/jdiegorceli1?s=21",
  facebook: "https://www.facebook.com/share/18NzEJirJZ/?mibextid=wwXIfr",
};

const EBAY_STORE = "https://www.ebay.ca/str/localherossportscards?mkcid=1&mkrid=706-53473-19255-0&siteid=2&campid=5339142305&toolid=10001&mkevt=1";

const InstagramIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="1" />
  </svg>
);

const TwitterIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
    <path d="M18.9 2H22l-6.8 7.8L23 22h-6.2l-4.8-7-6.1 7H2l7.3-8.4L1 2h6.4l4.4 6.4L18.9 2zm-1.1 18h1.7L7.2 3.9H5.4L17.8 20z" />
  </svg>
);

const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
    <path d="M22 12a10 10 0 1 0-11.6 9.9v-7H8v-3h2.4V9.7c0-2.4 1.4-3.8 3.6-3.8 1 0 2 .2 2 .2v2.2h-1.1c-1.1 0-1.4.7-1.4 1.4V12H16l-.4 3h-2.1v7A10 10 0 0 0 22 12z" />
  </svg>
);

const SocialIcons = () => (
  <div className="flex gap-2">
    <a className="icon-btn" href={SOCIAL_LINKS.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram"><InstagramIcon /></a>
    <a className="icon-btn" href={SOCIAL_LINKS.twitter} target="_blank" rel="noopener noreferrer" aria-label="X (Twitter)"><TwitterIcon /></a>
    <a className="icon-btn" href={SOCIAL_LINKS.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook"><FacebookIcon /></a>
  </div>
);

const VzlaNavbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const location = useLocation();

  return (
    <>
      <nav className="vzla-nav px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 no-underline select-none group">
          <div className="w-9 h-9 rounded-lg cta-flag flex items-center justify-center">
            <span className="font-display font-bold text-xs text-white">VZ</span>
          </div>
          <span className="flex flex-col leading-none">
            <span className="font-display font-bold text-sm tracking-wide text-foreground">
              VZLA SPORTS
            </span>
            <span className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground font-semibold mt-0.5">
              ELITE INDEX
            </span>
          </span>
        </Link>

        {/* Desktop nav */}
        <ul className="hidden md:flex gap-1 items-center m-0 p-0 list-none">
          {[
            { label: "Home", to: "/" },
            { label: "About", to: "/about" },
          ].map((item) => (
            <li key={item.label}>
              <Link
                to={item.to}
                className={`px-4 py-2 rounded-lg text-sm font-semibold no-underline transition-colors ${
                  location.pathname === item.to
                    ? "text-vzla-yellow"
                    : "text-foreground/70 hover:text-foreground hover:bg-secondary"
                }`}
              >
                {item.label}
              </Link>
            </li>
          ))}

          <li className="relative">
            <button
              onClick={() => { setShopOpen(!shopOpen); setContactOpen(false); }}
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-transparent border-none cursor-pointer text-foreground/70 hover:text-foreground hover:bg-secondary transition-colors inline-flex items-center gap-1.5"
            >
              Shop
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`transition-transform ${shopOpen ? "rotate-180" : ""}`}>
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
            <AnimatePresence>
              {shopOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-[calc(100%+8px)] min-w-[220px] glass-panel p-2 z-[99999]"
                >
                  <a
                    className="block px-3 py-2.5 rounded-lg text-foreground/80 text-sm no-underline hover:bg-secondary hover:text-vzla-yellow transition-colors"
                    href={EBAY_STORE}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    🛒 Visit my eBay Store
                  </a>
                </motion.div>
              )}
            </AnimatePresence>
          </li>

          <li className="relative">
            <button
              onClick={() => { setContactOpen(!contactOpen); setShopOpen(false); }}
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-transparent border-none cursor-pointer text-foreground/70 hover:text-foreground hover:bg-secondary transition-colors inline-flex items-center gap-1.5"
            >
              Contact
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`transition-transform ${contactOpen ? "rotate-180" : ""}`}>
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
            <AnimatePresence>
              {contactOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-[calc(100%+8px)] min-w-[200px] glass-panel p-3 z-[99999]"
                >
                  <SocialIcons />
                </motion.div>
              )}
            </AnimatePresence>
          </li>
        </ul>

        {/* Hamburger */}
        <button
          className="flex md:hidden w-10 h-10 rounded-lg border border-border bg-secondary items-center justify-center cursor-pointer hover:border-vzla-yellow/25 transition-all"
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10000] bg-background/95 backdrop-blur-xl p-5"
          >
            <div className="flex items-center justify-between">
              <Link to="/" className="flex items-center gap-3 no-underline" onClick={() => setMobileOpen(false)}>
                <div className="w-8 h-8 rounded-lg cta-flag flex items-center justify-center">
                  <span className="font-display font-bold text-xs text-white">VZ</span>
                </div>
                <span className="font-display font-bold text-sm text-foreground">VZLA SPORTS</span>
              </Link>
              <button
                className="w-10 h-10 rounded-lg border border-border bg-secondary text-foreground flex items-center justify-center cursor-pointer"
                onClick={() => setMobileOpen(false)}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mt-8 flex flex-col gap-3 max-w-md mx-auto"
            >
              {[
                { label: "Home", to: "/" },
                { label: "About", to: "/about" },
              ].map((item) => (
                <Link
                  key={item.label}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-center w-full py-4 rounded-xl border border-border bg-secondary text-foreground no-underline font-display font-bold text-lg hover:bg-vzla-yellow/10 hover:border-vzla-yellow/20 transition-colors"
                >
                  {item.label}
                </Link>
              ))}
              <a
                href={EBAY_STORE}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-full py-4 rounded-xl border border-border bg-secondary text-foreground no-underline font-display font-bold text-lg"
              >
                🛒 Shop
              </a>
              <div className="mt-4 p-4 rounded-xl border border-border bg-secondary/50 flex justify-center">
                <SocialIcons />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default VzlaNavbar;
