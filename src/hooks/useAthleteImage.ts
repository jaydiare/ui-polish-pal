import { useState, useEffect } from "react";

const cache = new Map<string, string | null>();

// ── MLB headshot via lookup API ──
// The statsapi.mlb.com API may block CORS, so we use the lookup endpoint
// and validate the image using an Image() element (not subject to CORS).
async function fetchMlbHeadshot(name: string): Promise<string | null> {
  try {
    const q = encodeURIComponent(name);
    const res = await fetch(
      `https://lookup-service-prod.mlb.com/json/named.search_player_all.bam?sport_code=%27mlb%27&active_sw=%27Y%27&name_part=%27${q}%27`
    );
    const data = await res.json();
    const results = data?.search_player_all?.queryResults;
    const row = results?.totalSize === "1"
      ? results.row
      : Array.isArray(results?.row) ? results.row[0] : null;
    if (!row?.player_id) return null;

    const headshotUrl = `https://img.mlb.com/mlb/images/players/head_shot/${row.player_id}.jpg`;

    // Validate image loads (Image element bypasses CORS)
    return new Promise<string | null>((resolve) => {
      const img = new Image();
      img.onload = () => {
        // Generic silhouettes are very small; real headshots are larger
        resolve(img.naturalWidth > 50 ? headshotUrl : null);
      };
      img.onerror = () => resolve(null);
      img.src = headshotUrl;
    });
  } catch {
    return null;
  }
}

// ── Wikipedia fallback ──
const SPORT_TO_WIKI: Record<string, string> = {
  Baseball: "baseball",
  Soccer: "footballer",
  Football: "American football",
  Basketball: "basketball",
  Tennis: "tennis",
  Golf: "golfer",
  MMA: "mixed martial artist",
  BMX: "cyclist",
  Bowling: "bowler",
};

async function fetchImageByTitle(title: string): Promise<string | null> {
  const q = encodeURIComponent(title);
  const res = await fetch(
    `https://en.wikipedia.org/w/api.php?action=query&titles=${q}&prop=pageimages&format=json&pithumbsize=200&origin=*`
  );
  const data = await res.json();
  const pages = data?.query?.pages;
  if (pages) {
    const page = Object.values(pages)[0] as any;
    if (page?.thumbnail?.source) return page.thumbnail.source;
  }
  return null;
}

async function searchAndFetchImage(query: string): Promise<string | null> {
  const q = encodeURIComponent(query);
  const searchRes = await fetch(
    `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${q}&srlimit=1&format=json&origin=*`
  );
  const searchData = await searchRes.json();
  const hit = searchData?.query?.search?.[0];
  if (!hit?.title) return null;
  return fetchImageByTitle(hit.title);
}

async function fetchWikiImage(name: string, sport?: string): Promise<string | null> {
  const exact = await fetchImageByTitle(name);
  if (exact) return exact;

  if (sport) {
    const wikiSuffix = SPORT_TO_WIKI[sport] || sport.toLowerCase();
    const disambig = await fetchImageByTitle(`${name} (${wikiSuffix})`);
    if (disambig) return disambig;
  }

  if (sport) {
    const sportSearch = await searchAndFetchImage(`${name} ${sport}`);
    if (sportSearch) return sportSearch;
  }

  return searchAndFetchImage(name);
}

// ── Main hook: MLB first for baseball, then Wikipedia ──
async function fetchAthleteImage(name: string, sport?: string): Promise<string | null> {
  // Try MLB headshot first for baseball players
  if (sport === "Baseball") {
    const mlb = await fetchMlbHeadshot(name);
    if (mlb) return mlb;
  }

  // Fallback to Wikipedia
  return fetchWikiImage(name, sport);
}

export function useAthleteImage(name: string, sport?: string): string | null {
  const cacheKey = sport ? `${name}__${sport}` : name;
  const [url, setUrl] = useState<string | null>(cache.get(cacheKey) ?? null);

  useEffect(() => {
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
  }, [name, sport, cacheKey]);

  return url;
}
