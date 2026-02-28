import { useState, useEffect } from "react";

const cache = new Map<string, string | null>();

async function fetchWikiImage(name: string): Promise<string | null> {
  // Try exact title match first
  const q = encodeURIComponent(name);
  const res = await fetch(
    `https://en.wikipedia.org/w/api.php?action=query&titles=${q}&prop=pageimages&format=json&pithumbsize=200&origin=*`
  );
  const data = await res.json();
  const pages = data?.query?.pages;
  if (pages) {
    const page = Object.values(pages)[0] as any;
    if (page?.thumbnail?.source) return page.thumbnail.source;
  }

  // Fallback: use search API (handles accents, redirects, partial matches)
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

export function useWikipediaImage(name: string): string | null {
  const [url, setUrl] = useState<string | null>(cache.get(name) ?? null);

  useEffect(() => {
    if (cache.has(name)) {
      setUrl(cache.get(name) ?? null);
      return;
    }

    let cancelled = false;

    fetchWikiImage(name)
      .then((thumb) => {
        cache.set(name, thumb);
        if (!cancelled) setUrl(thumb);
      })
      .catch(() => {
        cache.set(name, null);
        if (!cancelled) setUrl(null);
      });

    return () => { cancelled = true; };
  }, [name]);

  return url;
}
