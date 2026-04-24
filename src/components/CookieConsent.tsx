import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const GA_ID = "G-3SCYEVBB9B";
const GTM_ID = "GTM-MMQ86CNB";
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

function loadGTM() {
  if (document.getElementById("gtm-script")) return;

  const inline = document.createElement("script");
  inline.id = "gtm-script";
  inline.textContent = `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');`;
  document.head.appendChild(inline);

  // GTM noscript fallback (must be in <body>, not <head>)
  if (!document.getElementById("gtm-noscript")) {
    const ns = document.createElement("noscript");
    ns.id = "gtm-noscript";
    ns.innerHTML = `<iframe src="https://www.googletagmanager.com/ns.html?id=${GTM_ID}" height="0" width="0" style="display:none;visibility:hidden"></iframe>`;
    document.body.insertBefore(ns, document.body.firstChild);
  }
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

  const handleReject = () => {
    localStorage.setItem(CONSENT_KEY, "rejected");
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
          className="fixed bottom-[110px] left-3 right-3 md:bottom-24 md:left-auto md:right-6 md:max-w-sm z-[10000] glass-panel p-5 border border-border shadow-2xl rounded-2xl"
        >
          <p className="text-sm text-foreground/85 leading-relaxed mb-4">
            We use cookies to analyze site traffic and improve your experience. You can accept or reject analytics cookies.
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleReject}
              className="flex-1 h-10 rounded-lg border border-border bg-muted text-foreground text-sm font-bold cursor-pointer hover:bg-muted/80 transition-colors"
            >
              Reject
            </button>
            <button
              onClick={handleAccept}
              className="flex-1 h-10 rounded-lg cta-yellow text-sm font-bold cursor-pointer"
            >
              Accept
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CookieConsent;
