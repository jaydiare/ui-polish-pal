import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

const FEATURED_CARDS = [
  {
    title: "Carl Yastrzemski 1964 Venezuela Topps #210 SGC 2.5 POP 1",
    price: "C $750",
    img: "https://i.ebayimg.com/images/g/etcAAOSwHMlmx9zE/s-l300.webp",
    url: "https://www.ebay.ca/itm/387460090857",
  },
  {
    title: "Sandy Koufax 1966 Venezuela Topps #100 SGC 1",
    price: "C $485",
    img: "https://i.ebayimg.com/images/g/RJoAAOSwPWlmx9z3/s-l300.webp",
    url: "https://www.ebay.ca/itm/387460090851",
  },
  {
    title: "1964 Venezuelan Topps #350 Willie McCovey PSA 2 HOF",
    price: "C $350",
    img: "https://i.ebayimg.com/images/g/wtgAAeSwyqlpKML6/s-l300.webp",
    url: "https://www.ebay.ca/itm/389298118420",
  },
  {
    title: "2024 Topps Now Ballon D'Or Lamine Yamal RC SGC 10",
    price: "C $350",
    img: "https://i.ebayimg.com/images/g/ZRkAAeSwzgdn-7GH/s-l300.webp",
    url: "https://www.ebay.ca/itm/388642978342",
  },
  {
    title: "Jackson Chourio 2022 Leaf Metal Auto /3 SGC 9.5",
    price: "C $350",
    img: "https://i.ebayimg.com/images/g/pzgAAOSwsbRnDA9t/s-l300.webp",
    url: "https://www.ebay.ca/itm/387340542370",
  },
  {
    title: "Miguel Cabrera 2000 Topps Chrome Traded RC SGC 8",
    price: "C $350",
    img: "https://i.ebayimg.com/images/g/AkQAAOSwUPdnG~U8/s-l300.webp",
    url: "https://www.ebay.ca/itm/389404762804",
  },
  {
    title: "Lamine Yamal & Pau Cubarsi 2024 Topps Now UCL RC SGC 10",
    price: "C $300",
    img: "https://i.ebayimg.com/images/g/F8AAAeSwxgFn-7G9/s-l300.webp",
    url: "https://www.ebay.ca/itm/388642975400",
  },
  {
    title: "Victor Wembanyama 2023-24 Panini Stickers RC SGC 10",
    price: "C $250",
    img: "https://i.ebayimg.com/images/g/An0AAOSwt6dnG~bx/s-l300.webp",
    url: "https://www.ebay.ca/itm/387437068686",
  },
  {
    title: "Lionel Messi 2023-24 Megacracks EA Magicos SGC 10 POP 1",
    price: "C $165",
    img: "https://i.ebayimg.com/images/g/etcAAOSwVwFmBMSd/s-l300.webp",
    url: "https://www.ebay.ca/itm/386857947465",
  },
  {
    title: "Victor Wembanyama 2023-24 Hoops Teal Explosion RC SGC 9.5",
    price: "C $199",
    img: "https://i.ebayimg.com/images/g/vJYAAOSwhu1mx9~J/s-l300.webp",
    url: "https://www.ebay.ca/itm/387307819965",
  },
];

const VzlaStoreBanner = () => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    let raf: number;
    const speed = 0.5; // px per frame

    const step = () => {
      if (!paused && el) {
        el.scrollLeft += speed;
        // Reset to start when we've scrolled through the first set
        if (el.scrollLeft >= el.scrollWidth / 2) {
          el.scrollLeft = 0;
        }
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [paused]);

  // Duplicate cards for infinite scroll effect
  const cards = [...FEATURED_CARDS, ...FEATURED_CARDS];

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="mb-8"
    >
      <div className="text-center mb-5">
        <h2 className="font-display font-bold text-lg uppercase tracking-wider text-foreground">
          🏆 Featured Cards from Our Store
        </h2>
        <p className="text-muted-foreground text-xs mt-1">
          Top graded cards &amp; rare finds — tap to view on eBay
        </p>
      </div>

      <div
        ref={scrollRef}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={() => setPaused(true)}
        onTouchEnd={() => setPaused(false)}
        className="flex gap-4 overflow-x-auto scrollbar-hide pb-2"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {cards.map((card, i) => (
          <a
            key={`${card.url}-${i}`}
            href={`${card.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 w-[180px] group no-underline"
          >
            <div className="glass-panel overflow-hidden rounded-xl border border-border/50 hover:border-vzla-yellow/40 transition-all duration-300 hover:shadow-lg hover:shadow-vzla-yellow/5">
              <div className="relative aspect-square bg-secondary/50 flex items-center justify-center overflow-hidden">
                <img
                  src={card.img}
                  alt={card.title}
                  className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
                <div className="absolute top-1.5 right-1.5 px-2 py-0.5 rounded-md bg-background/90 border border-border text-[10px] font-bold text-vzla-yellow">
                  {card.price}
                </div>
              </div>
              <div className="p-2.5">
                <p className="text-[11px] font-semibold leading-tight line-clamp-2 text-foreground/80 group-hover:text-vzla-yellow transition-colors">
                  {card.title}
                </p>
              </div>
            </div>
          </a>
        ))}
      </div>
    </motion.section>
  );
};

export default VzlaStoreBanner;
