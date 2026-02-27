import VzlaNavbar from "@/components/VzlaNavbar";
import VzlaFooter from "@/components/VzlaFooter";
import { Link } from "react-router-dom";

export default function EbaySuccess() {
  return (
    <div className="min-h-screen flex flex-col">
      <VzlaNavbar />
      <main className="page-shell flex-1 flex items-center justify-center py-20 px-6">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-green-500/15 flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-green-400">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground mb-3">
            eBay Connected!
          </h1>
          <p className="text-foreground/60 text-sm mb-8">
            Your eBay account has been successfully linked. Market data and analytics
            are now syncing.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl cta-flag text-white font-semibold text-sm no-underline hover:opacity-90 transition-opacity"
          >
            Go to Dashboard
          </Link>
        </div>
      </main>
      <VzlaFooter />
    </div>
  );
}
