import { useEffect, useState } from "react";

export interface AthleteMlScore {
  predicted_up_7d_prob: number;
  volatility_cluster: "stable" | "momentum" | "volatile";
  deal_score: number;
  feature_importance?: { feature: string; impact: number }[];
  scored_at?: string;
}

export type MlScoreMap = Record<string, AthleteMlScore>;

const REMOTE_URL =
  "https://raw.githubusercontent.com/jaydiare/ui-polish-pal/main/data/athlete-ml-scores.json";
const LOCAL_URL = "/data/athlete-ml-scores.json";

const normalizeName = (s: string) =>
  String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.\-']/g, "")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim();

let cached: MlScoreMap | null = null;
let inflight: Promise<MlScoreMap> | null = null;

function normalizeMap(raw: any): MlScoreMap {
  const athletes = raw && typeof raw === "object" ? raw.athletes ?? raw : {};
  const out: MlScoreMap = {};
  for (const [name, value] of Object.entries(athletes)) {
    if (name === "_meta" || !value || typeof value !== "object") continue;
    out[normalizeName(name)] = value as AthleteMlScore;
  }
  return out;
}

async function fetchScores(): Promise<MlScoreMap> {
  if (cached) return cached;
  if (inflight) return inflight;
  inflight = (async () => {
    for (const url of [REMOTE_URL, LOCAL_URL]) {
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) continue;
        const map = normalizeMap(await res.json());
        if (Object.keys(map).length > 0) {
          cached = map;
          return map;
        }
      } catch {
        /* try next source */
      }
    }
    cached = {};
    return cached;
  })();
  return inflight;
}

export function useAthleteMlScores() {
  const [scores, setScores] = useState<MlScoreMap>(cached || {});
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    fetchScores()
      .then((map) => {
        if (!active) return;
        setScores(map);
        setError(Object.keys(map).length === 0);
      })
      .catch(() => active && setError(true))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const getScore = (name: string): AthleteMlScore | undefined =>
    scores[normalizeName(name)];

  return { scores, getScore, loading, error };
}

export interface MlHistoryPoint {
  deal_score: number;
  prob: number;
  cluster: "stable" | "momentum" | "volatile";
}

export type MlHistory = Record<string, Record<string, MlHistoryPoint>>;

const HISTORY_REMOTE =
  "https://raw.githubusercontent.com/jaydiare/ui-polish-pal/main/data/athlete-ml-scores-history.json";
const HISTORY_LOCAL = "/data/athlete-ml-scores-history.json";

let historyCache: { history: MlHistory; dates: string[] } | null = null;
let historyInflight: Promise<{ history: MlHistory; dates: string[] }> | null = null;

async function fetchHistory() {
  if (historyCache) return historyCache;
  if (historyInflight) return historyInflight;
  historyInflight = (async () => {
    for (const url of [HISTORY_REMOTE, HISTORY_LOCAL]) {
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) continue;
        const raw = await res.json();
        const history = (raw?.history ?? {}) as MlHistory;
        const dates = Object.keys(history).sort();
        if (dates.length > 0) {
          historyCache = { history, dates };
          return historyCache;
        }
      } catch {
        /* try next source */
      }
    }
    historyCache = { history: {}, dates: [] };
    return historyCache;
  })();
  return historyInflight;
}

export function useAthleteMlScoreHistory() {
  const [state, setState] = useState<{ history: MlHistory; dates: string[] }>(
    historyCache || { history: {}, dates: [] }
  );
  const [loading, setLoading] = useState(!historyCache);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    fetchHistory()
      .then((data) => {
        if (!active) return;
        setState(data);
        setError(data.dates.length === 0);
      })
      .catch(() => active && setError(true))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  return { history: state.history, dates: state.dates, loading, error };
}
