/**
 * Universal sports-card checklist analyzer — TypeScript port.
 * Runs entirely in-browser. No server needed.
 */

// ── Types ──────────────────────────────────────────────────────────────
export interface ChecklistEntry {
  section: string;
  cardCode: string | null;
  athlete: string;
  team: string | null;
  rawText: string;
  cardTypes: string[];
  serialNumber: number | null;
  rarityTier: "standard" | "notable" | "premium" | "elite";
  score: number;
  matchedOdds: { name: string; rawText: string; unit: string } | null;
  estimatedPackOdds: number | null;
}

export interface OddsEntry {
  name: string;
  ratioValue: number;
  unit: string;
  formatName: string | null;
  rawText: string;
}

export interface AnalysisSummary {
  count: number;
  byTier: Record<string, number>;
  byType: Record<string, number>;
}

// ── Pull Signal Scoring (Taguchi S/N under the hood) ──────────────────
export interface RobustScore {
  /** Multi-factor card score (0-100) */
  desirability: number;
  /** Mean score across uncertainty simulations */
  meanScore: number;
  /** Variance across simulations — higher = less stable */
  variance: number;
  /** Signal Strength: 10*log10(mean²/variance), capped at 40 */
  signalStrength: number;
  /** Risk vs ideal card profile: variance + (mean - target)² */
  risk: number;
  /** Stability grade */
  grade: "exceptional" | "strong" | "moderate" | "weak";
  /** One-line insight */
  insight: string;
}

export interface AnalysisResult {
  athlete: string;
  summary: AnalysisSummary;
  results: (ChecklistEntry & { displayOdds: string; robust?: RobustScore })[];
  /** Product-level pull signal summary */
  robustSummary?: {
    bestSignalCard: string;
    avgSignalStrength: number;
    recommendation: string;
  };
}

// ── Constants ──────────────────────────────────────────────────────────
const SECTION_HINTS = [
  "base", "insert", "autograph", "autographs", "auto", "relic", "memorabilia", "variation",
  "parallel", "prizm", "refractor", "signatures", "prospects", "rookie",
  "image variation", "short print", "ssp", "case hit", "downtown", "kaboom",
  "superfractor", "gold", "orange", "red", "blue", "green", "black", "purple", "pink",
  "silver", "sepia", "shimmer", "mojo", "x-fractor", "wave", "nebula", "finite",
  "chrome", "optic", "select", "mosaic", "bowman", "sapphire", "fractors",
];

const CARD_TYPE_KEYWORDS: Record<string, string[]> = {
  autograph: ["autograph", "autographs", "auto", "signature", "signatures", "signed"],
  relic: ["relic", "memorabilia", "memorablia", "patch", "jersey", "material"],
  variation: ["variation", "image variation", "photo variation", "sp", "ssp", "super short print"],
  parallel: [
    "parallel", "refractor", "prizm", "mojo", "x-fractor", "wave", "shimmer",
    "gold", "orange", "red", "blue", "green", "black", "purple", "pink", "sepia",
    "silver", "teal", "aqua", "gold vinyl", "superfractor", "finite", "nebula",
  ],
  insert: [
    "insert", "downtown", "kaboom", "color blast", "bomb squad", "net marvels",
    "my house", "stained glass", "planetary pursuit", "adios", "spotlight", "ascension",
  ],
  base: ["base", "base cards"],
};

const ELITE_KEYWORDS = [
  "1/1", "superfractor", "gold vinyl", "black finite", "finite", "nebula",
  "shield", "laundry tag", "logoman",
];
const PREMIUM_KEYWORDS = [
  "autograph", "signature", "patch auto", "rpa", "booklet", "downtown", "kaboom",
  "color blast", "stained glass", "ssp", "super short print", "case hit",
];
const STRONG_COLOR_KEYWORDS = ["gold", "orange", "red", "black", "green", "blue", "purple"];

const CARD_CODE_RE = /^(#?[A-Z]{1,6}[-]?[A-Z0-9]{0,5}|\d{1,4}[A-Z]?)$/;
const ODDS_RE = /(?<name>.+?)\s+(?:(?:odds|pack odds|hobby odds|retail odds|jumbo odds|blaster odds)\s*)?(?<ratio>1\s*:\s*[\d,]+|one\s*in\s*[\d,]+)\s*(?<unit>packs?|boxes?|cases?)?/i;
const HEADER_CLEAN_RE = /[^A-Za-z0-9#/\- ]+/g;

// ── Helpers ────────────────────────────────────────────────────────────
function normalizeSpaces(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function normalizeName(text: string): string {
  let t = text.toLowerCase();
  t = t.replace(/á/g, "a").replace(/é/g, "e").replace(/í/g, "i").replace(/ó/g, "o").replace(/ú/g, "u").replace(/ñ/g, "n");
  t = t.replace(/[^a-z0-9 ]+/g, " ");
  return normalizeSpaces(t);
}

function similarity(a: string, b: string): number {
  const sa = normalizeName(a);
  const sb = normalizeName(b);
  if (sa === sb) return 1;
  const longer = sa.length >= sb.length ? sa : sb;
  const shorter = sa.length < sb.length ? sa : sb;
  if (longer.length === 0) return 1;
  // Longest common subsequence ratio
  const m = shorter.length;
  const n = longer.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = shorter[i - 1] === longer[j - 1]
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return (2 * dp[m][n]) / (m + n);
}

function looksLikeHeader(line: string): boolean {
  const s = normalizeSpaces(line);
  if (s.length < 3 || s.length > 80) return false;
  const letters = s.replace(/[^A-Za-z]/g, "");
  if (!letters) return false;

  // Lines starting with a card code (e.g. "AD-8", "BCP-12", "#45") are entries, not headers
  if (/^#?\d+[A-Z]?\s/.test(s) || /^[A-Z]{1,6}-?\d+\s/.test(s)) return false;

  const words = s.split(" ");

  // If the line has many words (4+) with mixed case, it's likely a player entry, not a header
  const mixedCaseWords = words.filter((w) => /[a-z]/.test(w) && /[A-Z]/.test(w));
  if (words.length >= 4 && mixedCaseWords.length >= 2) return false;

  // Reject lines that look like "Name - Team" player entries
  if (/\s-\s/.test(s) && words.length >= 4) return false;

  const alphaCount = [...s].filter((c) => /[A-Za-z]/.test(c)).length;
  const upperCount = [...s].filter((c) => /[A-Z]/.test(c)).length;
  const upperRatio = upperCount / Math.max(1, alphaCount);

  // Strong header signal: mostly uppercase
  if (upperRatio > 0.7) return true;

  const lower = s.toLowerCase();
  const hint = SECTION_HINTS.some((h) => lower.includes(h));

  // Short lines (≤3 words) containing a section hint are almost always headers
  // e.g. "Autographs", "Gold Refractor /50", "Rookie Autographs"
  if (hint && words.length <= 4) return true;

  // Lines with a serial number pattern and a hint (e.g. "Red Refractor /5")
  if (hint && /\/\d{1,4}\b/.test(s)) return true;

  // Hint-based with moderate uppercase
  if (hint && words.length <= 6 && upperRatio > 0.3) return true;

  // Standalone "1/1" type headers
  if (/\b1\/1\b/.test(s) && words.length <= 4) return true;

  return false;
}

function detectCardTypes(text: string, section: string): string[] {
  const hay = `${section} ${text}`.toLowerCase();
  const found: string[] = [];
  for (const [ctype, keywords] of Object.entries(CARD_TYPE_KEYWORDS)) {
    if (keywords.some((k) => hay.includes(k))) found.push(ctype);
  }
  if (!found.length) found.push("unknown");
  if (found.includes("autograph") && found.includes("relic")) {
    return ["autograph", "relic", ...found.filter((x) => x !== "autograph" && x !== "relic")];
  }
  return found;
}

function parseSerialNumber(text: string): number | null {
  const lower = text.toLowerCase();
  if (lower.includes("1/1")) return 1;
  let m = lower.match(/\/(\d{1,4})\b/);
  if (m) return parseInt(m[1], 10);
  m = lower.match(/(?:numbered|limited) to (\d{1,4})\b/);
  if (m) return parseInt(m[1], 10);
  return null;
}

type RarityTier = "standard" | "notable" | "premium" | "elite";

const TIER_ORDER: Record<RarityTier, number> = { standard: 0, notable: 1, premium: 2, elite: 3 };

function maxTier(a: RarityTier, b: RarityTier): RarityTier {
  return TIER_ORDER[a] >= TIER_ORDER[b] ? a : b;
}

function rarityFromText(text: string, serial: number | null, cardTypes: string[]): [RarityTier, number] {
  const lower = text.toLowerCase();
  let score = 0;
  let tier: RarityTier = "standard";

  if (ELITE_KEYWORDS.some((k) => lower.includes(k)) || serial === 1) return ["elite", 100];
  if (PREMIUM_KEYWORDS.some((k) => lower.includes(k))) { score += 45; tier = "premium"; }
  if (cardTypes.includes("autograph")) { score += 30; tier = maxTier(tier, "premium"); }
  if (cardTypes.includes("relic")) { score += 20; tier = maxTier(tier, "premium"); }
  if (cardTypes.includes("variation")) { score += 15; tier = maxTier(tier, "notable"); }

  if (serial !== null) {
    if (serial <= 5) return ["elite", Math.max(score, 95)];
    if (serial <= 10) return ["elite", Math.max(score, 90)];
    if (serial <= 25) return ["premium", Math.max(score, 80)];
    if (serial <= 50) return ["premium", Math.max(score, 72)];
    if (serial <= 99) return ["notable", Math.max(score, 62)];
    if (serial <= 199) return ["notable", Math.max(score, 55)];
  }

  if (STRONG_COLOR_KEYWORDS.some((c) => lower.includes(c))) { score += 10; tier = maxTier(tier, "notable"); }
  if (cardTypes.includes("insert")) score += 6;
  if (cardTypes.includes("parallel")) score += 8;
  score = Math.max(score, tier === "premium" ? 35 : tier === "notable" ? 20 : 10);
  return [tier, score];
}

function plausiblePersonName(text: string): boolean {
  const parts = text.split(" ");
  if (parts.length < 2 || parts.length > 6) return false;
  const alphaWords = parts.filter((p) => /[A-Za-z]/.test(p));
  return alphaWords.length >= 2;
}

function splitAthleteTeam(tokens: string[]): [string | null, string | null] {
  for (let tail = 4; tail >= 1; tail--) {
    if (tokens.length <= tail) continue;
    const athlete = tokens.slice(0, -tail).join(" ");
    const team = tokens.slice(-tail).join(" ");
    if (plausiblePersonName(athlete)) return [athlete, team];
  }
  const athlete = tokens.join(" ");
  if (plausiblePersonName(athlete)) return [athlete, null];
  return [null, null];
}

// ── Core Functions ─────────────────────────────────────────────────────
export function parseChecklist(text: string): ChecklistEntry[] {
  const lines = text.split("\n").map(normalizeSpaces).filter(Boolean);
  let currentSection = "Uncategorized";
  const entries: ChecklistEntry[] = [];

  for (const line of lines) {
    if (looksLikeHeader(line)) {
      currentSection = line.replace(HEADER_CLEAN_RE, "").trim() || currentSection;
      continue;
    }
    const tokens = line.split(" ");
    if (tokens.length < 2) continue;

    let cardCode: string | null = null;
    let startIdx = 0;
    if (CARD_CODE_RE.test(tokens[0])) { cardCode = tokens[0]; startIdx = 1; }
    const remaining = tokens.slice(startIdx);
    if (remaining.length < 2) continue;

    const [athlete, team] = splitAthleteTeam(remaining);
    if (!athlete) continue;

    const cardTypes = detectCardTypes(line, currentSection);
    const serial = parseSerialNumber(line + " " + currentSection);
    const [tier, score] = rarityFromText(line + " " + currentSection, serial, cardTypes);
    entries.push({
      section: currentSection, cardCode, athlete, team, rawText: line,
      cardTypes, serialNumber: serial, rarityTier: tier, score,
      matchedOdds: null, estimatedPackOdds: null,
    });
  }

  // Dedupe
  const seen = new Set<string>();
  return entries.filter((e) => {
    const key = `${normalizeName(e.section)}|${normalizeName(e.athlete)}|${normalizeName(e.rawText)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function parseOdds(text: string): OddsEntry[] {
  const entries: OddsEntry[] = [];
  for (const raw of text.split("\n")) {
    const line = normalizeSpaces(raw);
    if (!line) continue;
    const m = ODDS_RE.exec(line);
    if (!m || !m.groups) continue;
    const ratioStr = m.groups.ratio.toLowerCase().replace(/\s/g, "");
    let value: number;
    if (ratioStr.startsWith("onein")) {
      value = parseFloat(ratioStr.replace("onein", "").replace(/,/g, ""));
    } else {
      const parts = ratioStr.split(":");
      if (parts.length < 2) continue;
      value = parseFloat(parts[1].replace(/,/g, ""));
    }
    if (isNaN(value)) continue;
    const name = normalizeSpaces(m.groups.name);
    const unit = (m.groups.unit || "packs").toLowerCase();
    let formatName: string | null = null;
    const lower = line.toLowerCase();
    for (const c of ["hobby", "jumbo", "retail", "blaster", "mega", "choice", "fat pack", "hanger", "fotl"]) {
      if (lower.includes(c)) { formatName = c; break; }
    }
    entries.push({ name, ratioValue: value, unit, formatName, rawText: line });
  }
  return entries;
}

function toPackEquivalent(odds: OddsEntry, ppb: number | null, bpc: number | null): number {
  const unit = odds.unit.replace(/s$/, "");
  if (unit === "pack") return odds.ratioValue;
  if (unit === "box") return ppb ? odds.ratioValue * ppb : odds.ratioValue;
  if (unit === "case") {
    if (ppb && bpc) return odds.ratioValue * ppb * bpc;
    if (ppb) return odds.ratioValue * ppb * 12;
    return odds.ratioValue;
  }
  return odds.ratioValue;
}

function matchOdds(
  entry: ChecklistEntry, oddsEntries: OddsEntry[],
  fmt: string | null, ppb: number | null, bpc: number | null,
): [OddsEntry, number] | null {
  if (!oddsEntries.length) return null;
  const hay = normalizeName(`${entry.section} ${entry.rawText} ${entry.cardTypes.join(" ")}`);
  const candidates: [number, OddsEntry][] = [];
  for (const oe of oddsEntries) {
    if (fmt && oe.formatName && !oe.formatName.toLowerCase().includes(fmt.toLowerCase())) continue;
    let nameScore = similarity(hay, oe.name);
    const oeNorm = normalizeName(oe.name);
    for (const word of new Set(hay.split(" "))) {
      if (word.length > 3 && oeNorm.includes(word)) nameScore += 0.02;
    }
    candidates.push([nameScore, oe]);
  }
  if (!candidates.length) return null;
  candidates.sort((a, b) => b[0] - a[0]);
  const [bestScore, best] = candidates[0];
  if (bestScore < 0.28) return null;
  return [best, toPackEquivalent(best, ppb, bpc)];
}

export function findMatches(entries: ChecklistEntry[], athlete: string, threshold = 0.88): ChecklistEntry[] {
  const athleteNorm = normalizeName(athlete);
  return entries.filter((e) => {
    const nameNorm = normalizeName(e.athlete);
    return athleteNorm.includes(nameNorm) || nameNorm.includes(athleteNorm) || similarity(athleteNorm, nameNorm) >= threshold;
  });
}

export function parseManualOdds(items: string[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const item of items) {
    if (!item.includes("=")) continue;
    const [label, value] = item.split("=", 2);
    const normLabel = normalizeName(label);
    const val = value.trim().toLowerCase().replace(/,/g, "");
    let m = val.match(/^1:(\d+(?:\.\d+)?)/);
    if (m) { result[normLabel] = parseFloat(m[1]); continue; }
    m = val.match(/^(\d+(?:\.\d+)?)\s*packs?/);
    if (m) { result[normLabel] = parseFloat(m[1]); continue; }
  }
  return result;
}

function applyManualOdds(
  entries: ChecklistEntry[], manualOdds: Record<string, number>,
): void {
  for (const e of entries) {
    let bestKey: string | null = null;
    let bestScore = 0;
    const target = normalizeName(`${e.section} ${e.rawText}`);
    for (const [label, packOdds] of Object.entries(manualOdds)) {
      let score = similarity(target, label);
      if (target.includes(label)) score += 0.2;
      if (score > bestScore) { bestScore = score; bestKey = label; }
    }
    if (bestKey && bestScore >= 0.35) {
      e.matchedOdds = { name: bestKey, rawText: `manual: ${bestKey}`, unit: "packs" };
      e.estimatedPackOdds = manualOdds[bestKey];
    }
  }
}

export function prettyOdds(value: number | null): string {
  if (value === null) return "unknown";
  return `1 in ${Math.round(value).toLocaleString()} packs`;
}

export function summarize(entries: ChecklistEntry[]): AnalysisSummary {
  const byTier: Record<string, number> = {};
  const byType: Record<string, number> = {};
  for (const e of entries) {
    byTier[e.rarityTier] = (byTier[e.rarityTier] || 0) + 1;
    for (const t of e.cardTypes) byType[t] = (byType[t] || 0) + 1;
  }
  return { count: entries.length, byTier, byType };
}

// ── Load pdf.js from CDN ───────────────────────────────────────────────
async function loadPdfJs(): Promise<any> {
  if ((window as any).pdfjsLib) return (window as any).pdfjsLib;
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.9.155/pdf.min.mjs";
    script.type = "module";
    // For module scripts we need a different approach - use dynamic import
    reject = () => {};
    import("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.9.155/pdf.min.mjs" as any)
      .then((mod) => {
        (window as any).pdfjsLib = mod;
        resolve(mod);
      })
      .catch(() => {
        // Fallback: load UMD build via script tag
        const s = document.createElement("script");
        s.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.9.155/pdf.min.js";
        s.onload = () => resolve((window as any).pdfjsLib);
        s.onerror = reject;
        document.head.appendChild(s);
      });
  });
}

// ── PDF text extraction (browser) ─────────────────────────────────────
export async function extractTextFromFile(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".txt") || name.endsWith(".csv")) {
    return file.text();
  }
  if (name.endsWith(".pdf")) {
    const pdfjsLib = await loadPdfJs();
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.9.155/pdf.worker.min.js`;
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const pages: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      // Reconstruct lines using y-position changes and hasEOL flags
      let currentLine = "";
      let lastY: number | null = null;
      for (const item of content.items as any[]) {
        const y = item.transform ? item.transform[5] : null;
        // Detect line break: significant y-position change
        if (lastY !== null && y !== null && Math.abs(y - lastY) > 2) {
          if (currentLine.trim()) pages.push(currentLine.trim());
          currentLine = "";
        }
        currentLine += item.str;
        if (item.hasEOL) {
          if (currentLine.trim()) pages.push(currentLine.trim());
          currentLine = "";
          lastY = null;
        } else {
          lastY = y;
        }
      }
      if (currentLine.trim()) pages.push(currentLine.trim());
    }
    return pages.join("\n");
  }
  throw new Error(`Unsupported file type: ${file.name}`);
}

export function previewText(text: string, maxLines = 20, maxChars = 4000): string {
  const lines = text.split("\n").map(normalizeSpaces).filter(Boolean);
  let preview = lines.slice(0, maxLines).join("\n");
  if (preview.length > maxChars) preview = preview.slice(0, maxChars).trimEnd() + "\n...";
  return preview;
}

// ── Progress callback type ─────────────────────────────────────────────
export type ProgressStep = {
  step: number;
  totalSteps: number;
  label: string;
  detail?: string;
};

// ── Main analysis pipeline ─────────────────────────────────────────────
export async function analyzeChecklist(opts: {
  checklistFile: File;
  oddsFile?: File | null;
  athlete: string;
  formatName?: string | null;
  packsPerBox?: number | null;
  boxesPerCase?: number | null;
  manualOddsLines?: string[];
  onProgress?: (p: ProgressStep) => void;
}): Promise<AnalysisResult> {
  const report = opts.onProgress || (() => {});
  const totalSteps = 6;

  report({ step: 1, totalSteps, label: "Reading checklist", detail: opts.checklistFile.name });
  const checklistText = await extractTextFromFile(opts.checklistFile);

  // Yield to UI thread between steps
  await new Promise((r) => setTimeout(r, 0));

  report({ step: 2, totalSteps, label: "Parsing card entries" });
  const entries = parseChecklist(checklistText);
  const matches = findMatches(entries, opts.athlete);

  report({ step: 3, totalSteps, label: "Processing odds", detail: `${matches.length} cards matched` });
  await new Promise((r) => setTimeout(r, 0));

  let oddsEntries: OddsEntry[] = [];
  if (opts.oddsFile) {
    try {
      const oddsText = await extractTextFromFile(opts.oddsFile);
      oddsEntries = parseOdds(oddsText);
    } catch { /* skip */ }
  }

  const sectionCounts: Record<string, number> = {};
  for (const m of matches) sectionCounts[m.section] = (sectionCounts[m.section] || 0) + 1;

  const fmt = opts.formatName || null;
  const ppb = opts.packsPerBox || null;
  const bpc = opts.boxesPerCase || null;

  for (const m of matches) {
    const matched = matchOdds(m, oddsEntries, fmt, ppb, bpc);
    if (matched) {
      const [oe, packEquiv] = matched;
      m.matchedOdds = { name: oe.name, rawText: oe.rawText, unit: oe.unit };
      m.estimatedPackOdds = packEquiv * Math.max(1, sectionCounts[m.section]);
    }
  }

  const manualLines = (opts.manualOddsLines || []).filter(Boolean);
  const manual = parseManualOdds(manualLines);
  if (Object.keys(manual).length) applyManualOdds(matches, manual);

  report({ step: 4, totalSteps, label: "Ranking cards" });
  await new Promise((r) => setTimeout(r, 0));

  matches.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (a.serialNumber ?? 999999) - (b.serialNumber ?? 999999);
  });

  // ── Pull Signal Scoring ────────────────────────────────────────────
  report({ step: 5, totalSteps, label: "Running Pull Signal simulations", detail: `${matches.length} cards × 60 scenarios` });
  await new Promise((r) => setTimeout(r, 0));

  const resultsWithRobust = matches.map((m) => {
    const robust = computeRobustScore(m, opts.athlete);
    return { ...m, displayOdds: prettyOdds(m.estimatedPackOdds), robust };
  });

  report({ step: 6, totalSteps, label: "Generating summary" });
  await new Promise((r) => setTimeout(r, 0));

  // Product-level summary
  const cardsWithSn = resultsWithRobust.filter((r) => r.robust && isFinite(r.robust.signalStrength));
  let robustSummary: AnalysisResult["robustSummary"];
  if (cardsWithSn.length > 0) {
    const avgSn = cardsWithSn.reduce((s, r) => s + r.robust!.signalStrength, 0) / cardsWithSn.length;
    const best = cardsWithSn.reduce((a, b) => (a.robust!.signalStrength > b.robust!.signalStrength ? a : b));
    const bestLabel = `${best.section} — ${best.rawText}`.slice(0, 80);
    robustSummary = {
      bestSignalCard: bestLabel,
      avgSignalStrength: Math.round(avgSn * 10) / 10,
      recommendation: generateProductRecommendation(resultsWithRobust, opts.athlete),
    };
  }

  return {
    athlete: opts.athlete,
    summary: summarize(matches),
    results: resultsWithRobust,
    robustSummary,
  };
}

// ── Taguchi Engine ────────────────────────────────────────────────────

/** Multi-factor desirability score (deterministic, 0–100) */
function computeDesirability(entry: ChecklistEntry): number {
  let d = 0;

  // Factor weights
  if (entry.cardTypes.includes("autograph")) d += 28;
  if (entry.cardTypes.includes("relic")) d += 18;
  if (entry.cardTypes.includes("variation")) d += 12;
  if (entry.cardTypes.includes("insert")) d += 10;
  if (entry.cardTypes.includes("parallel")) d += 8;

  // Serial numbering (lower = rarer = better)
  if (entry.serialNumber !== null) {
    if (entry.serialNumber <= 1) d += 25;
    else if (entry.serialNumber <= 5) d += 22;
    else if (entry.serialNumber <= 10) d += 18;
    else if (entry.serialNumber <= 25) d += 14;
    else if (entry.serialNumber <= 50) d += 10;
    else if (entry.serialNumber <= 99) d += 7;
    else if (entry.serialNumber <= 199) d += 4;
    else d += 2;
  }

  // Rookie/prospect bonus
  const hay = `${entry.section} ${entry.rawText}`.toLowerCase();
  if (/\b(rookie|prospect|1st bowman|first bowman)\b/.test(hay)) d += 12;

  // Section quality (autograph sections > insert > base)
  const sectionLower = entry.section.toLowerCase();
  if (/auto|signature/.test(sectionLower)) d += 6;
  else if (/insert|downtown|kaboom/.test(sectionLower)) d += 4;
  else if (/parallel|refractor|prizm/.test(sectionLower)) d += 3;

  // Manufacturer prestige keywords
  if (/\b(chrome|sapphire|sterling|national treasures|immaculate|flawless)\b/.test(hay)) d += 5;

  return Math.min(100, d);
}

const SIM_RUNS = 60;
const NOISE_ODDS = 0.30;      // ±30% odds uncertainty
const NOISE_MAPPING = 0.15;   // ±15% fuzzy mapping error
const NOISE_FORMAT = 0.10;    // ±10% format assumption noise

/** Seeded-ish pseudo-random for reproducibility within a session */
function noise(center: number, pct: number, rng: () => number): number {
  return center * (1 + (rng() * 2 - 1) * pct);
}

function simpleRng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function computeRobustScore(entry: ChecklistEntry, athlete: string): RobustScore {
  const baseDesirability = computeDesirability(entry);
  const baseOdds = entry.estimatedPackOdds ?? 500; // default uncertainty when missing
  const hasRealOdds = entry.estimatedPackOdds !== null;
  const oddsUncertainty = hasRealOdds ? NOISE_ODDS : 0.60; // much wider when guessing

  const rng = simpleRng(hashCode(`${entry.rawText}${athlete}`));
  const scores: number[] = [];

  for (let i = 0; i < SIM_RUNS; i++) {
    // Perturb desirability by mapping noise
    const simDesirability = Math.max(0, Math.min(100, noise(baseDesirability, NOISE_MAPPING, rng)));

    // Perturb odds
    const simOdds = Math.max(1, noise(baseOdds, oddsUncertainty, rng));

    // Format assumption noise on odds
    const simOddsAdj = Math.max(1, noise(simOdds, NOISE_FORMAT, rng));

    // Combined score: desirability weighted by accessibility (inverse odds)
    // Higher desirability + lower odds = better score
    const accessibility = 100 / Math.sqrt(simOddsAdj);
    const combined = 0.65 * simDesirability + 0.35 * accessibility;
    scores.push(combined);
  }

  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance = scores.reduce((a, b) => a + (b - mean) ** 2, 0) / scores.length;
  const snRatio = variance > 0.001 ? 10 * Math.log10((mean * mean) / variance) : 40; // cap at 40
  const cappedSn = Math.min(40, snRatio);

  // Target: user ideally wants desirability=90 accessibility=high → target combined ~70
  const target = 70;
  const expectedLoss = variance + (mean - target) ** 2;

  let grade: RobustScore["grade"];
  if (cappedSn >= 25) grade = "exceptional";
  else if (cappedSn >= 18) grade = "strong";
  else if (cappedSn >= 10) grade = "moderate";
  else grade = "weak";

  const insight = generateCardInsight(entry, cappedSn, mean, hasRealOdds, grade);

  return {
    desirability: Math.round(baseDesirability),
    meanScore: Math.round(mean * 10) / 10,
    variance: Math.round(variance * 10) / 10,
    signalStrength: Math.round(cappedSn * 10) / 10,
    risk: Math.round(expectedLoss),
    grade,
    insight,
  };
}

function generateCardInsight(
  entry: ChecklistEntry, sn: number, mean: number,
  hasOdds: boolean, grade: RobustScore["grade"],
): string {
  const tier = entry.rarityTier;
  if (grade === "exceptional") {
    return `High-confidence pull with predictable value${tier === "elite" ? " — elite ceiling" : ""}.`;
  }
  if (grade === "strong") {
    if (!hasOdds) return "Strong desirability despite uncertain odds — worth the gamble.";
    return `Reliable card with solid fundamentals${mean > 40 ? " and good accessibility" : ""}.`;
  }
  if (grade === "moderate") {
    if (tier === "elite" || tier === "premium") {
      return "High raw ceiling but volatile pull probability — boom-or-bust.";
    }
    return "Moderate robustness; odds uncertainty limits confidence.";
  }
  return "Uncertain value under realistic conditions — high variance play.";
}

function generateProductRecommendation(
  results: { robust?: RobustScore; rarityTier: string; rawText: string }[],
  athlete: string,
): string {
  const withRobust = results.filter((r) => r.robust);
  if (!withRobust.length) return "Insufficient data for a product recommendation.";

  const avgSn = withRobust.reduce((s, r) => s + r.robust!.signalStrength, 0) / withRobust.length;
  const premiumPlus = withRobust.filter((r) => r.rarityTier === "elite" || r.rarityTier === "premium");
  const strongPremium = premiumPlus.filter((r) => r.robust!.grade === "exceptional" || r.robust!.grade === "strong");

  if (avgSn >= 22 && strongPremium.length >= 2) {
    return `This product offers the best robust chance of producing a premium ${athlete} card under uncertain odds.`;
  }
  if (avgSn >= 15 && strongPremium.length >= 1) {
    return `Solid product with reliable pull paths to premium ${athlete} cards, though some variance exists.`;
  }
  if (premiumPlus.length > 0) {
    return `Premium ${athlete} cards exist here, but high odds uncertainty makes this a higher-variance play.`;
  }
  return `Limited premium upside for ${athlete} — mostly standard cards with uncertain pull rates.`;
}

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}
