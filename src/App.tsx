import { Suspense } from "react";
import { lazyRetry } from "@/lib/lazy-retry";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

const Index = lazyRetry(() => import("./pages/Index"));
const About = lazyRetry(() => import("./pages/About"));
const CardTrackerPage = lazyRetry(() => import("./pages/CardTrackerPage"));
const Privacy = lazyRetry(() => import("./pages/privacy"));
const EbaySuccess = lazyRetry(() => import("./pages/EbaySuccess"));
const EbayDenied = lazyRetry(() => import("./pages/EbayDenied"));
const Blog = lazyRetry(() => import("./pages/Blog"));
const BlogPost = lazyRetry(() => import("./pages/BlogPost"));
const Data = lazyRetry(() => import("./pages/Data"));
const MarketData = lazyRetry(() => import("./pages/MarketData"));
const MarketCapBlog = lazyRetry(() => import("./pages/MarketCapBlog"));
const HowItWorks = lazyRetry(() => import("./pages/HowItWorks"));
const ChecklistIntel = lazyRetry(() => import("./pages/ChecklistIntel"));
const Methodology = lazyRetry(() => import("./pages/Methodology"));
const MlbVenezuelanLeaders = lazyRetry(() => import("./pages/MlbVenezuelanLeaders"));
const NotFound = lazyRetry(() => import("./pages/NotFound"));
const Toaster = lazyRetry(() => import("@/components/ui/toaster").then(m => ({ default: m.Toaster })));
const Sonner = lazyRetry(() => import("@/components/ui/sonner").then(m => ({ default: m.Toaster })));
const CookieConsent = lazyRetry(() => import("./components/CookieConsent"));
const MarketMoversPopup = lazyRetry(() => import("./components/MarketMoversPopup"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Suspense fallback={null}>
        <Toaster />
        <Sonner />
      </Suspense>
      <BrowserRouter>
        <Suspense fallback={<div className="min-h-screen" />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/about" element={<About />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/ebay/success" element={<EbaySuccess />} />
            <Route path="/ebay/denied" element={<EbayDenied />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/acuna-torres-tracker" element={<CardTrackerPage />} />
            <Route path="/blog/venezuelan-sports-cards-market-cap" element={<MarketCapBlog />} />
            <Route path="/blog/:slug" element={<BlogPost />} />
            <Route path="/data" element={<Data />} />
            <Route path="/market-data" element={<MarketData />} />
            <Route path="/checklist-intel" element={<ChecklistIntel />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
            <Route path="/methodology" element={<Methodology />} />
            <Route path="/mlb-venezuelan-leaders" element={<MlbVenezuelanLeaders />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
        <Suspense fallback={null}>
          <CookieConsent />
          <MarketMoversPopup />
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
