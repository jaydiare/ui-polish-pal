import { useState, useEffect, useRef } from "react";

const cache = new Map<string, string | null>();

// ── ESPN headshot for baseball players (CORS-friendly, no auth) ──
async function fetchEspnHeadshot(name: string): Promise<string | null> {
  try {
    const q = encodeURIComponent(name);
    const res = await fetch(
      `https://site.api.espn.com/apis/common/v3/search?query=${q}&limit=1&type=player&sport=baseball&league=mlb`
    );
    if (!res.ok) return null;
    const data = await res.json();
    const item = data?.items?.[0];
    const imageUrl = item?.headshot?.href;
    if (!imageUrl) return null;
    return imageUrl;
  } catch {
    return null;
  }
}

// ── TheSportsDB fallback (free key "3" is public/publishable) ──
const SPORT_TO_TSDB: Record<string, string[]> = {
  Baseball: ["Baseball"],
  Soccer: ["Soccer"],
  Football: ["American Football"],
  Basketball: ["Basketball"],
  Tennis: ["Tennis"],
  Golf: ["Golf"],
  MMA: ["Fighting"],
  BMX: ["Cycling", "Motorsport"],
  Bowling: ["Bowling"],
};

async function fetchSportsDbHeadshot(name: string, sport?: string): Promise<string | null> {
  try {
    const q = encodeURIComponent(name);
    const res = await fetch(
      `https://www.thesportsdb.com/api/v1/json/3/searchplayers.php?p=${q}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    const players = data?.player;
    if (!Array.isArray(players) || players.length === 0) return null;

    if (sport) {
      const tsdbSports = SPORT_TO_TSDB[sport] || [sport];
      const sportMatch = players.find(
        (p: any) => tsdbSports.some((s) => p?.strSport?.toLowerCase() === s.toLowerCase()) && (p?.strThumb || p?.strCutout)
      );
      if (sportMatch) return sportMatch.strThumb || sportMatch.strCutout;
    }

    const withThumb = players.find((p: any) => p?.strThumb || p?.strCutout);
    return withThumb ? (withThumb.strThumb || withThumb.strCutout) : null;
  } catch {
    return null;
  }
}

// ── Main hook: ESPN → TheSportsDB (Wikipedia removed to avoid CORS errors on published site) ──
async function fetchAthleteImage(name: string, sport?: string): Promise<string | null> {
  if (sport === "Baseball") {
    const espn = await fetchEspnHeadshot(name);
    if (espn) return espn;
  }

  const tsdb = await fetchSportsDbHeadshot(name, sport);
  if (tsdb) return tsdb;

  return null;
}

export function useAthleteImage(name: string, sport?: string, containerRef?: React.RefObject<HTMLElement>): string | null {
  const cacheKey = sport ? `${name}__${sport}` : name;
  const [url, setUrl] = useState<string | null>(cache.get(cacheKey) ?? null);
  const [isVisible, setIsVisible] = useState(false);

  // IntersectionObserver: defer fetching until card is near viewport
  useEffect(() => {
    if (!containerRef?.current) {
      setIsVisible(true); // no ref = fetch immediately
      return;
    }
    const el = containerRef.current;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [containerRef]);

  useEffect(() => {
    if (!isVisible) return;
    if (cache.has(cacheKey)) {
      setUrl(cache.get(cacheKey) ?? null);
      return;
    }

    let cancelled = false;

    fetchAthleteImage(name, sport)
      .then((thumb) => {
        cache.set(cacheKey, thumb);
        if (!cancelled) setUrl(thumb);
      })
      .catch(() => {
        cache.set(cacheKey, null);
        if (!cancelled) setUrl(null);
      });

    return () => { cancelled = true; };
  }, [name, sport, cacheKey, isVisible]);

  return url;
}
