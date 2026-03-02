import { useState, useEffect } from "react";

const cache = new Map<string, string | null>();

async function tryWikiPages(query: string): Promise<string | null> {
  const q = encodeURIComponent(query);
  // Try exact title match
  const res = await fetch(
    `https://en.wikipedia.org/w/api.php?action=query&titles=${q}&prop=pageimages&format=json&pithumbsize=200&origin=*`
  );
  const data = await res.json();
  const pages = data?.query?.pages;
  if (pages) {
    const page = Object.values(pages)[0] as any;
    if (page?.thumbnail?.source) return page.thumbnail.source;
  }

  // Fallback: search API
  const searchRes = await fetch(
    `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${q}&srlimit=1&format=json&origin=*`
  );
  const searchData = await searchRes.json();
  const hit = searchData?.query?.search?.[0];
  if (!hit?.title) return null;

  const titleQ = encodeURIComponent(hit.title);
  const imgRes = await fetch(
    `https://en.wikipedia.org/w/api.php?action=query&titles=${titleQ}&prop=pageimages&format=json&pithumbsize=200&origin=*`
  );
  const imgData = await imgRes.json();
  const imgPages = imgData?.query?.pages;
  if (imgPages) {
    const imgPage = Object.values(imgPages)[0] as any;
    if (imgPage?.thumbnail?.source) return imgPage.thumbnail.source;
  }
  return null;
}

async function fetchWikiImage(name: string, sport?: string): Promise<string | null> {
  // Try with sport disambiguation first (e.g. "Luis Rodriguez baseball")
  if (sport) {
    const result = await tryWikiPages(`${name} ${sport}`);
    if (result) return result;
  }
  // Fallback to name only
  return tryWikiPages(name);
}

export function useWikipediaImage(name: string, sport?: string): string | null {
  const cacheKey = sport ? `${name}__${sport}` : name;
  const [url, setUrl] = useState<string | null>(cache.get(cacheKey) ?? null);

  useEffect(() => {
    if (cache.has(cacheKey)) {
      setUrl(cache.get(cacheKey) ?? null);
      return;
    }

    let cancelled = false;

    fetchWikiImage(name, sport)
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
