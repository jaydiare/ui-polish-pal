import { useState, useEffect } from "react";

const cache = new Map<string, string | null>();

export function useWikipediaImage(name: string): string | null {
  const [url, setUrl] = useState<string | null>(cache.get(name) ?? null);

  useEffect(() => {
    if (cache.has(name)) {
      setUrl(cache.get(name) ?? null);
      return;
    }

    let cancelled = false;

    const fetchImage = async () => {
      try {
        const q = encodeURIComponent(name);
        const res = await fetch(
          `https://en.wikipedia.org/w/api.php?action=query&titles=${q}&prop=pageimages&format=json&pithumbsize=200&origin=*`
        );
        const data = await res.json();
        const pages = data?.query?.pages;
        if (!pages) throw new Error("no pages");

        const page = Object.values(pages)[0] as any;
        const thumb: string | null = page?.thumbnail?.source ?? null;

        cache.set(name, thumb);
        if (!cancelled) setUrl(thumb);
      } catch {
        cache.set(name, null);
        if (!cancelled) setUrl(null);
      }
    };

    fetchImage();
    return () => { cancelled = true; };
  }, [name]);

  return url;
}
