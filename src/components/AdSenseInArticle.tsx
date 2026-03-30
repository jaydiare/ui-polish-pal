import { useEffect, useRef, useState } from "react";

/**
 * In-article AdSense ad unit — lazy-loaded via IntersectionObserver.
 * Place between content sections on long-form pages.
 */
const AdSenseInArticle = () => {
  const pushed = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!inView || pushed.current) return;
    try {
      ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
      pushed.current = true;
    } catch {
      // adsbygoogle not loaded yet
    }
  }, [inView]);

  return (
    <div ref={containerRef} className="w-full flex justify-center my-6">
      {inView && (
        <ins
          className="adsbygoogle"
          style={{ display: "block", textAlign: "center" }}
          data-ad-client="ca-pub-1118000382291516"
          data-ad-slot="3005539188"
          data-ad-format="fluid"
          data-ad-layout="in-article"
        />
      )}
    </div>
  );
};

export default AdSenseInArticle;
