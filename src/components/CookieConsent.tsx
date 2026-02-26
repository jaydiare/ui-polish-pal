import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const GA_ID = "G-3SCYEVBB9B";
const CONSENT_KEY = "vzla_cookie_consent";

function loadGA() {
  if (document.getElementById("ga-script")) return;

  const script = document.createElement("script");
  script.id = "ga-script";
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(script);

  const inline = document.createElement("script");
  inline.textContent = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${GA_ID}');
  `;
  document.head.appendChild(inline);
}

const CookieConsent = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(CONSENT_KEY);
    if (consent === "accepted") {
      loadGA();
    } else if (!consent) {
      setVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(CONSENT_KEY, "accepted");
    loadGA();
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="fixed bottom-24 left-4 right-4 md:left-auto md:right-6 md:max-w-sm z-[9998] glass-panel p-5 border border-border shadow-2xl"
        >
          <p className="text-sm text-foreground/85 leading-relaxed mb-4">
            We use cookies to analyze site traffic and improve your experience. By clicking <strong className="text-foreground">Accept</strong>, you consent to our use of analytics cookies.
          </p>
          <button
            onClick={handleAccept}
            className="w-full h-10 rounded-lg cta-yellow text-sm font-bold cursor-pointer"
          >
            Accept
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CookieConsent;
