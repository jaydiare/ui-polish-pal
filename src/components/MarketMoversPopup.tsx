import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

const CONSENT_KEY = "vzla_cookie_consent";
const PROMO_URL = "https://marketmoversapp.com/vzlaelite";
const LOGO_SRC = "/assets/mm-full-logo-white.svg";

const MarketMoversPopup = () => {
  const [visible, setVisible] = useState(false);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const check = () => {
      const consent = localStorage.getItem(CONSENT_KEY);
      if (consent) {
        setTimeout(() => setVisible(true), 800);
        return true;
      }
      return false;
    };
    if (check()) return;
    const id = setInterval(() => { if (check()) clearInterval(id); }, 500);
    return () => clearInterval(id);
  }, []);

  // Focus management + Escape to close + scroll lock
  useEffect(() => {
    if (!visible) return;
    lastFocusedRef.current = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Move focus into the dialog
    const t = setTimeout(() => closeBtnRef.current?.focus(), 50);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setVisible(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      lastFocusedRef.current?.focus?.();
    };
  }, [visible]);

  const close = () => setVisible(false);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[10001] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
          onClick={close}
          role="dialog"
          aria-modal="true"
          aria-labelledby="mm-popup-title"
          aria-describedby="mm-popup-desc"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            transition={{ duration: 0.25 }}
            className="relative w-full max-w-md glass-panel rounded-2xl overflow-hidden border border-border shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              ref={closeBtnRef}
              onClick={close}
              type="button"
              aria-label="Close Market Movers promotion"
              className="absolute top-2 right-2 z-10 inline-flex items-center justify-center w-11 h-11 min-w-11 min-h-11 rounded-full bg-background/70 hover:bg-background text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-colors"
            >
              <X size={18} aria-hidden="true" />
            </button>
            <a
              href={PROMO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-2xl"
              aria-label="Visit Market Movers app and use code VZLAELITE for 20% off"
            >
              <div className="w-full bg-background flex items-center justify-center px-6 py-10 sm:px-10 sm:py-14">
                <img
                  src={LOGO_SRC}
                  alt="Market Movers app logo"
                  className="w-[70%] max-w-[260px] sm:max-w-[300px] h-auto object-contain mx-auto"
                />
              </div>
              <div className="p-4 text-center">
                <h2 id="mm-popup-title" className="sr-only">Market Movers promotion</h2>
                <p id="mm-popup-desc" className="text-sm text-foreground/85 mb-2">
                  Track the sports card market in real time.
                </p>
                <p className="text-xs font-bold text-cyan-400">
                  20% OFF with code <span className="text-foreground">VZLAELITE</span>
                </p>
              </div>
            </a>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MarketMoversPopup;
