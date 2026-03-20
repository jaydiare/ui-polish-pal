import { lazy, Suspense } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

const Index = lazy(() => import("./pages/Index"));
const About = lazy(() => import("./pages/About"));
const CardTrackerPage = lazy(() => import("./pages/CardTrackerPage"));
const Privacy = lazy(() => import("./pages/privacy"));
const EbaySuccess = lazy(() => import("./pages/EbaySuccess"));
const EbayDenied = lazy(() => import("./pages/EbayDenied"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const Data = lazy(() => import("./pages/Data"));
const MarketCapBlog = lazy(() => import("./pages/MarketCapBlog"));
const HowItWorks = lazy(() => import("./pages/HowItWorks"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Toaster = lazy(() => import("@/components/ui/toaster").then(m => ({ default: m.Toaster })));
const Sonner = lazy(() => import("@/components/ui/sonner").then(m => ({ default: m.Toaster })));
const CookieConsent = lazy(() => import("./components/CookieConsent"));

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
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
        <Suspense fallback={null}>
          <CookieConsent />
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
