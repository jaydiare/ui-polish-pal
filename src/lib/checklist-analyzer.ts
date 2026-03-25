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

export interface AnalysisResult {
  athlete: string;
  summary: AnalysisSummary;
  results: (ChecklistEntry & { displayOdds: string })[];
}

// ── Constants ──────────────────────────────────────────────────────────
const SECTION_HINTS = [
  "base", "insert", "autograph", "auto", "relic", "memorabilia", "variation",
  "parallel", "prizm", "refractor", "signatures", "prospects", "rookie",
  "image variation", "short print", "ssp", "case hit", "downtown", "kaboom",
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
  const alphaCount = [...s].filter((c) => /[A-Za-z]/.test(c)).length;
  const upperCount = [...s].filter((c) => /[A-Z]/.test(c)).length;
  const upperRatio = upperCount / Math.max(1, alphaCount);
  const hint = SECTION_HINTS.some((h) => s.toLowerCase().includes(h));
  return upperRatio > 0.6 || hint;
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

// ── PDF text extraction (browser) ─────────────────────────────────────
export async function extractTextFromFile(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".txt") || name.endsWith(".csv")) {
    return file.text();
  }
  if (name.endsWith(".pdf")) {
    const { getDocument, GlobalWorkerOptions } = await import("pdfjs-dist");
    GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.9.155/pdf.worker.min.mjs`;
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await getDocument({ data: arrayBuffer }).promise;
    const pages: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      pages.push(content.items.map((item: any) => item.str).join(" "));
    }
    return pages.join("\n");
  }
  throw new Error(`Unsupported file type: ${file.name}`);
}

// ── Main analysis pipeline ─────────────────────────────────────────────
export async function analyzeChecklist(opts: {
  checklistFile: File;
  oddsFile?: File | null;
  athlete: string;
  formatName?: string | null;
  packsPerBox?: number | null;
  boxesPerCase?: number | null;
  manualOddsLines?: string[];
}): Promise<AnalysisResult> {
  const checklistText = await extractTextFromFile(opts.checklistFile);
  const entries = parseChecklist(checklistText);
  const matches = findMatches(entries, opts.athlete);

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

  matches.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (a.serialNumber ?? 999999) - (b.serialNumber ?? 999999);
  });

  return {
    athlete: opts.athlete,
    summary: summarize(matches),
    results: matches.map((m) => ({ ...m, displayOdds: prettyOdds(m.estimatedPackOdds) })),
  };
}
