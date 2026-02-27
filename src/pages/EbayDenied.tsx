import VzlaNavbar from "@/components/VzlaNavbar";
import VzlaFooter from "@/components/VzlaFooter";
import { Link } from "react-router-dom";

const BACKEND_CONNECT_URL = "https://api.vzlasportselite.com/api/ebay/connect";

export default function EbayDenied() {
  return (
    <div className="min-h-screen flex flex-col">
      <VzlaNavbar />
      <main className="page-shell flex-1 flex items-center justify-center py-20 px-6">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-destructive/15 flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-destructive">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground mb-3">
            Connection Denied
          </h1>
          <p className="text-foreground/60 text-sm mb-8">
            eBay access was not granted. You can try again whenever you're ready —
            no data was stored.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href={BACKEND_CONNECT_URL}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl cta-flag text-white font-semibold text-sm no-underline hover:opacity-90 transition-opacity"
            >
              Try Again
            </a>
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-border bg-secondary text-foreground font-semibold text-sm no-underline hover:bg-secondary/80 transition-colors"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </main>
      <VzlaFooter />
    </div>
  );
}
