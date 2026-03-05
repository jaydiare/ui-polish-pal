import { useState, useEffect } from "react";

interface HotSeller {
  name: string;
  conversions: number;
}

interface EpnPerformance {
  placements: Record<string, { clicks: number; ctr: number; earnings: number; conversions: number }>;
  bestBanner: string | null;
  hotSellers: HotSeller[];
}

const EMPTY: EpnPerformance = { placements: {}, bestBanner: null, hotSellers: [] };

let cachedData: EpnPerformance | null = null;
let fetchPromise: Promise<EpnPerformance> | null = null;

function doFetch(): Promise<EpnPerformance> {
  if (cachedData) return Promise.resolve(cachedData);
  if (fetchPromise) return fetchPromise;
  fetchPromise = fetch("https://raw.githubusercontent.com/jaydiare/ui-polish-pal/main/data/epn-performance.json")
    .then((r) => r.ok ? r.json() : EMPTY)
    .then((d) => { cachedData = d; return d; })
    .catch(() => EMPTY);
  return fetchPromise;
}

export function useEpnPerformance() {
  const [data, setData] = useState<EpnPerformance>(cachedData || EMPTY);

  useEffect(() => {
    doFetch().then(setData);
  }, []);

  return data;
}

export function useHotSellers(): Set<string> {
  const { hotSellers } = useEpnPerformance();
  const [set, setSet] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (hotSellers.length > 0) {
      setSet(new Set(hotSellers.map((h) => h.name)));
    }
  }, [hotSellers]);

  return set;
}
