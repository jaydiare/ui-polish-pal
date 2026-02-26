// Budget Knapsack Optimizer
// Ported from scripts/budget-knapsack.js

export interface KnapsackItem {
  id: string;
  name: string;
  priceCents: number;
  stabilityPct: number | null;
  daysOnMarket: number | null;
  valueScore: number;
}

export interface KnapsackResult {
  chosen: KnapsackItem[];
  spentCents: number;
  budgetCents: number;
  maxCards: number | null;
}

function stabilityPoints(pct: number | null): number {
  if (pct == null || !Number.isFinite(pct)) return 0;
  if (pct <= 10) return 100;
  if (pct <= 20) return 70;
  if (pct <= 35) return 35;
  return 10;
}

function liquidityMultiplier(days: number | null): number {
  if (days == null || !Number.isFinite(days)) return 1.0;
  if (days <= 7) return 1.3;
  if (days <= 14) return 1.15;
  if (days <= 30) return 1.0;
  if (days <= 60) return 0.9;
  return 0.75;
}

/** Standard 0/1 Knapsack: maximize valueScore under budget */
function knapsackPick(items: KnapsackItem[], budgetCents: number): KnapsackItem[] {
  const dp = new Float64Array(budgetCents + 1);
  const pick = Array.from({ length: items.length }, () =>
    new Uint8Array(budgetCents + 1)
  );

  for (let i = 0; i < items.length; i++) {
    const w = items[i].priceCents;
    const v = items[i].valueScore;

    for (let b = budgetCents; b >= w; b--) {
      const cand = dp[b - w] + v;
      if (cand > dp[b]) {
        dp[b] = cand;
        pick[i][b] = 1;
      }
    }
  }

  let b = budgetCents;
  const chosen: KnapsackItem[] = [];
  for (let i = items.length - 1; i >= 0; i--) {
    if (pick[i][b]) {
      chosen.push(items[i]);
      b -= items[i].priceCents;
    }
  }

  chosen.reverse();
  return chosen;
}

/** Knapsack with max card count constraint */
function knapsackPickWithMaxCount(
  items: KnapsackItem[],
  budgetCents: number,
  maxCount: number
): KnapsackItem[] {
  type PathNode = { itemIndex: number; prev: PathNode | null };

  const B = budgetCents;
  const K = Math.max(1, maxCount | 0);
  const width = B + 1;
  const size = (K + 1) * width;

  const dp = new Float64Array(size);
  dp.fill(-Infinity);
  dp[0] = 0;

  const pathHead: Array<PathNode | null> = Array(size).fill(null);

  for (let i = 0; i < items.length; i++) {
    const w = items[i].priceCents;
    const v = items[i].valueScore;

    for (let k = K; k >= 1; k--) {
      const row = k * width;
      const prevRow = (k - 1) * width;

      for (let b = B; b >= w; b--) {
        const from = prevRow + (b - w);
        const to = row + b;
        const base = dp[from];
        if (base === -Infinity) continue;

        const cand = base + v;
        if (cand > dp[to]) {
          dp[to] = cand;
          pathHead[to] = { itemIndex: i, prev: pathHead[from] };
        }
      }
    }
  }

  let bestB = -1;
  let bestK = 0;
  let bestVal = -Infinity;

  for (let b = B; b >= 0; b--) {
    let foundAny = false;
    let localBestVal = -Infinity;
    let localBestK = 0;

    for (let k = 1; k <= K; k++) {
      const val = dp[k * width + b];
      if (val === -Infinity) continue;
      foundAny = true;
      if (val > localBestVal || (val === localBestVal && k > localBestK)) {
        localBestVal = val;
        localBestK = k;
      }
    }

    if (foundAny) {
      bestB = b;
      bestK = localBestK;
      bestVal = localBestVal;
      break;
    }
  }

  if (bestB < 0 || bestVal === -Infinity) return [];

  const chosen: KnapsackItem[] = [];
  let node = pathHead[bestK * width + bestB];

  while (node) {
    chosen.push(items[node.itemIndex]);
    node = node.prev;
  }

  chosen.reverse();
  return chosen;
}

function normKey(s: string): string {
  return String(s || "").trim().toLowerCase().replace(/\s+/g, " ");
}

export function buildBudgetAthleteId(name: string, sport?: string | null): string {
  return `${normKey(name)}|${normKey(sport || "")}`;
}
export interface BudgetCandidate {
  name: string;
  sport?: string;
  price: number | null;
  stabilityPct: number | null;
  daysOnMarket: number | null;
}

export function runKnapsack(
  candidates: BudgetCandidate[],
  budgetDollars: number,
  maxCards: number | null
): KnapsackResult {
  const budgetCents = Math.round(budgetDollars * 100);

  const rawItems: KnapsackItem[] = candidates
    .filter((c) => c.price != null && Number.isFinite(c.price) && c.price! > 0)
    .map((c) => {
      const priceCents = Math.round(c.price! * 100);
      const base = stabilityPoints(c.stabilityPct);
      const liq = liquidityMultiplier(c.daysOnMarket);
      return {
        id: buildBudgetAthleteId(c.name, c.sport),
        name: c.name,
        priceCents,
        stabilityPct: c.stabilityPct,
        daysOnMarket: c.daysOnMarket,
        valueScore: base * liq,
      };
    })
    .filter((x) => x.valueScore > 0 && x.priceCents <= budgetCents);

  // Prevent the same athlete (same normalized name+sport) from being selected twice.
  // Keep the stronger duplicate by valueScore; on tie, keep the cheaper card.
  const deduped = new Map<string, KnapsackItem>();
  for (const item of rawItems) {
    const prev = deduped.get(item.id);
    if (!prev) {
      deduped.set(item.id, item);
      continue;
    }

    if (item.valueScore > prev.valueScore || (item.valueScore === prev.valueScore && item.priceCents < prev.priceCents)) {
      deduped.set(item.id, item);
    }
  }

  const items = Array.from(deduped.values());

  const chosen = maxCards
    ? knapsackPickWithMaxCount(items, budgetCents, maxCards)
    : knapsackPick(items, budgetCents);

  const spentCents = chosen.reduce((s, it) => s + it.priceCents, 0);

  return { chosen, spentCents, budgetCents, maxCards };
}
