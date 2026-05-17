import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

const CONSENT_KEY = "vzla_cookie_consent";
const PROMO_URL = "https://marketmoversapp.com/vzlaelite";
const LOGO_SRC = "/assets/mm-full-logo-white.svg";

const MarketMoversPopup = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Show every visit, after cookie banner is dismissed (accepted/rejected)
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
              onClick={close}
              aria-label="Close"
              className="absolute top-2 right-2 z-10 w-8 h-8 rounded-full bg-background/70 hover:bg-background flex items-center justify-center text-foreground"
            >
              <X size={16} />
            </button>
            <a href={PROMO_URL} target="_blank" rel="noopener noreferrer" className="block">
              <div className="w-full bg-background flex items-center justify-center px-6 py-10 sm:px-10 sm:py-14">
                <img
                  src={LOGO_SRC}
                  alt="Market Movers App"
                  className="w-[70%] max-w-[260px] sm:max-w-[300px] h-auto object-contain mx-auto"
                />
              </div>
              <div className="p-4 text-center">
                <p className="text-sm text-foreground/85 mb-2">
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
