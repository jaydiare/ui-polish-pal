import { useState, useCallback, useMemo } from "react";
import SEOHead from "@/components/SEOHead";
import VzlaNavbar from "@/components/VzlaNavbar";
import BackToTop from "@/components/BackToTop";
import VzlaSideBanner from "@/components/VzlaSideBanner";
import VzlaSideBannerRight from "@/components/VzlaSideBannerRight";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  type AnalysisResult,
  type ChecklistEntry,
  type RobustScore,
  type ProgressStep,
  type TeamAnalysisResult,
  analyzeChecklist,
  analyzeTeamChecklist,
  extractTeams,
  extractTextFromFile,
  parseChecklist,
  prettyOdds,
} from "@/lib/checklist-analyzer";

const TIER_COLORS: Record<string, string> = {
  elite: "bg-vzla-yellow/20 text-vzla-yellow border-vzla-yellow/30",
  premium: "bg-vzla-purple/20 text-vzla-purple border-vzla-purple/30",
  notable: "bg-vzla-mint/20 text-vzla-mint border-vzla-mint/30",
  standard: "bg-secondary text-muted-foreground border-border",
};

const TIER_ICONS: Record<string, string> = {
  elite: "👑",
  premium: "⭐",
  notable: "🔹",
  standard: "📄",
};

const GRADE_COLORS: Record<string, string> = {
  exceptional: "text-vzla-yellow",
  strong: "text-vzla-mint",
  moderate: "text-vzla-purple",
  weak: "text-muted-foreground",
};

const GRADE_LABELS: Record<string, string> = {
  exceptional: "🎯 Exceptional",
  strong: "✅ Strong",
  moderate: "⚠️ Moderate",
  weak: "❓ Weak",
};

const ChecklistIntel = () => {
  const [mode, setMode] = useState<"player" | "team">("player");
  const [checklistFile, setChecklistFile] = useState<File | null>(null);
  const [oddsFile, setOddsFile] = useState<File | null>(null);
  const [athlete, setAthlete] = useState("");
  const [team, setTeam] = useState("");
  const [availableTeams, setAvailableTeams] = useState<string[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [multiResults, setMultiResults] = useState<AnalysisResult[]>([]);
  const [formatName, setFormatName] = useState("auto-detect");
  const [packsPerBox, setPacksPerBox] = useState("");
  const [boxesPerCase, setBoxesPerCase] = useState("12");
  const [manualOdds, setManualOdds] = useState("");
  const [showStandard, setShowStandard] = useState(true);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<ProgressStep | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [teamResult, setTeamResult] = useState<TeamAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Auto-extract teams whenever a checklist file is uploaded
  const handleChecklistChange = useCallback(async (file: File | null) => {
    setChecklistFile(file);
    setAvailableTeams([]);
    setTeam("");
    if (!file) return;
    setTeamsLoading(true);
    try {
      const text = await extractTextFromFile(file);
      const entries = parseChecklist(text);
      const teams = extractTeams(entries);
      setAvailableTeams(teams);
    } catch (e) {
      console.warn("[ChecklistIntel] Could not extract teams:", e);
    } finally {
      setTeamsLoading(false);
    }
  }, []);

  const handleAnalyze = useCallback(async () => {
    const needsAthlete = mode === "player" && !athlete.trim();
    const needsTeam = mode === "team" && !team.trim();
    if (!checklistFile || needsAthlete || needsTeam) {
      setError(mode === "player"
        ? "Please upload a checklist and enter an athlete name."
        : "Please upload a checklist and select a team.");
      return;
    }
    setError(null);
    setLoading(true);
    setProgress(null);
    setMultiResults([]);
    setResult(null);
    setTeamResult(null);

    const athletes = athlete.split(",").map((a) => a.trim()).filter(Boolean);
    const ANALYSIS_TIMEOUT = 120_000;

    try {
      const allResults: AnalysisResult[] = [];
      const notFound: string[] = [];

      for (let i = 0; i < athletes.length; i++) {
        const name = athletes[i];
        setProgress({ step: 1, totalSteps: 6, label: `Analyzing ${name}${athletes.length > 1 ? ` (${i + 1}/${athletes.length})` : ""}`, detail: checklistFile.name });

        const analysisPromise = analyzeChecklist({
          checklistFile,
          oddsFile,
          athlete: name,
          formatName: formatName === "auto-detect" ? null : formatName,
          packsPerBox: packsPerBox ? parseInt(packsPerBox) : null,
          boxesPerCase: boxesPerCase ? parseInt(boxesPerCase) : null,
          manualOddsLines: manualOdds.split("\n").filter(Boolean),
          onProgress: (p) => setProgress({ ...p, label: `${name}${athletes.length > 1 ? ` (${i + 1}/${athletes.length})` : ""}: ${p.label}` }),
        });
        const timer = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Analysis timed out after 2 minutes. Try a smaller file or a different format (TXT/CSV).")), ANALYSIS_TIMEOUT),
        );
        const res = await Promise.race([analysisPromise, timer]);
        allResults.push(res);
        if (res.results.length === 0) notFound.push(name);
      }

      // Merge results for display — use first result as base, combine all
      if (allResults.length === 1) {
        setResult(allResults[0]);
      } else {
        const merged: AnalysisResult = {
          athlete: allResults.map((r) => r.athlete).join(", "),
          summary: {
            count: allResults.reduce((s, r) => s + r.summary.count, 0),
            byTier: {
              elite: allResults.reduce((s, r) => s + (r.summary.byTier.elite || 0), 0),
              premium: allResults.reduce((s, r) => s + (r.summary.byTier.premium || 0), 0),
              notable: allResults.reduce((s, r) => s + (r.summary.byTier.notable || 0), 0),
              standard: allResults.reduce((s, r) => s + (r.summary.byTier.standard || 0), 0),
            },
            byType: allResults.reduce((acc, r) => {
              Object.entries(r.summary.byType).forEach(([k, v]) => { acc[k] = (acc[k] || 0) + v; });
              return acc;
            }, {} as Record<string, number>),
          },
          results: allResults.flatMap((r) => r.results),
          robustSummary: allResults.find((r) => r.robustSummary)?.robustSummary,
        };
        setResult(merged);
        setMultiResults(allResults);
      }

      if (notFound.length > 0) {
        setError(`⚠️ Not found in checklist: ${notFound.join(", ")}. Check spelling, try full name (first + last), or verify the athlete is in this product.`);
      }
    } catch (e: any) {
      setError(e.message || "Analysis failed. Please try again.");
    } finally {
      setLoading(false);
      setProgress(null);
    }
  }, [checklistFile, oddsFile, athlete, formatName, packsPerBox, boxesPerCase, manualOdds]);

  const handleClear = () => {
    setChecklistFile(null);
    setOddsFile(null);
    setAthlete("");
    setResult(null);
    setError(null);
    setManualOdds("");
  };

  const visible = result
    ? showStandard
      ? result.results
      : result.results.filter((r) => r.rarityTier !== "standard")
    : [];

  const elite = visible.filter((r) => r.rarityTier === "elite");
  const premium = visible.filter((r) => r.rarityTier === "premium");
  const notable = visible.filter((r) => r.rarityTier === "notable");
  const standard = visible.filter((r) => r.rarityTier === "standard");

  const handleDownloadJSON = () => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${result.athlete.replace(/\s+/g, "_")}_checklist_analysis.json`;
    a.click();
    URL.revokeObjectURL(url);
  };


  return (
    <div className="min-h-screen">
      <VzlaSideBanner />
      <VzlaSideBannerRight />
      <SEOHead
        title="Checklist Intel – Sports Card Odds Analyzer | VZLA Sports Elite"
        description="Upload any sports card checklist and odds document to analyze your chances of pulling rare parallels, autographs, and numbered cards for any athlete."
        path="/checklist-intel"
      />
      <VzlaNavbar />

      <main className="page-shell" role="main">
        <section className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-3">
              Checklist Intel
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Upload a sports card set checklist (PDF, TXT, or CSV) and optionally an odds document.
              Enter an athlete's name to discover every parallel, autograph, and numbered card — with estimated pull odds and <span className="text-vzla-yellow font-semibold">Pull Signal Analysis</span>.
            </p>
          </div>

          {/* Upload form */}
          <div className="glass-panel p-6 rounded-2xl space-y-5 mb-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="checklist" className="text-foreground font-semibold">
                  Checklist File <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="checklist"
                  type="file"
                  accept=".pdf,.txt,.csv"
                  onChange={(e) => setChecklistFile(e.target.files?.[0] || null)}
                  className="file:text-vzla-yellow file:font-semibold file:border-0 file:bg-secondary file:rounded-lg file:px-3 file:py-1 file:mr-3 cursor-pointer"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="odds" className="text-foreground font-semibold">
                  Odds File <span className="text-muted-foreground text-xs">(optional)</span>
                </Label>
                <Input
                  id="odds"
                  type="file"
                  accept=".pdf,.txt,.csv"
                  onChange={(e) => setOddsFile(e.target.files?.[0] || null)}
                  className="file:text-vzla-yellow file:font-semibold file:border-0 file:bg-secondary file:rounded-lg file:px-3 file:py-1 file:mr-3 cursor-pointer"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="athlete" className="text-foreground font-semibold">
                  Athlete Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="athlete"
                  placeholder="e.g. Ronald Acuña Jr., Julio Rodriguez"
                  value={athlete}
                  onChange={(e) => setAthlete(e.target.value)}
                  className="bg-secondary border-border"
                />
                <p className="text-[11px] text-muted-foreground">Separate multiple athletes with commas</p>
              </div>
              <div className="space-y-2">
                <Label className="text-foreground font-semibold">Format</Label>
                <Select value={formatName} onValueChange={setFormatName}>
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["auto-detect", "hobby", "jumbo", "retail", "blaster", "mega", "choice", "FOTL"].map((f) => (
                      <SelectItem key={f} value={f}>{f === "auto-detect" ? "Auto-detect" : f.charAt(0).toUpperCase() + f.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-foreground font-semibold">Packs per Box</Label>
                <Input
                  type="number"
                  placeholder="Leave empty for auto"
                  value={packsPerBox}
                  onChange={(e) => setPacksPerBox(e.target.value)}
                  className="bg-secondary border-border"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground font-semibold">Boxes per Case</Label>
                <Input
                  type="number"
                  value={boxesPerCase}
                  onChange={(e) => setBoxesPerCase(e.target.value)}
                  className="bg-secondary border-border"
                />
              </div>
            </div>

            <Accordion type="single" collapsible>
              <AccordionItem value="advanced" className="border-border">
                <AccordionTrigger className="text-sm text-muted-foreground hover:text-foreground">
                  Advanced: Manual Odds Overrides
                </AccordionTrigger>
                <AccordionContent>
                  <textarea
                    className="w-full min-h-[100px] rounded-lg bg-secondary border border-border p-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder={"gold=1:480\nautograph=1:24\ndowntown=1:2400"}
                    value={manualOdds}
                    onChange={(e) => setManualOdds(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    One per line: <code className="text-vzla-yellow">name=1:ratio</code> or <code className="text-vzla-yellow">name=N packs</code>
                  </p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <div className="flex gap-3 pt-2">
              <Button
                onClick={handleAnalyze}
                disabled={loading || !checklistFile || !athlete.trim()}
                className="cta-flag text-foreground font-bold flex-1 sm:flex-none sm:min-w-[160px]"
              >
                {loading ? "Analyzing…" : "🔍 Analyze"}
              </Button>
              <Button variant="outline" onClick={handleClear} className="border-border">
                Clear
              </Button>
            </div>

            {/* Progress indicator */}
            {loading && progress && (
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-foreground font-medium flex items-center gap-1.5">
                    <span className="inline-block h-2 w-2 rounded-full bg-vzla-yellow animate-pulse" />
                    {progress.label}
                  </span>
                  <span className="text-muted-foreground">
                    {progress.step}/{progress.totalSteps}
                  </span>
                </div>
                <Progress
                  value={(progress.step / progress.totalSteps) * 100}
                  className="h-1.5 bg-secondary"
                />
                {progress.detail && (
                  <p className="text-[11px] text-muted-foreground">{progress.detail}</p>
                )}
              </div>
            )}

            {error && (
              <p className="text-destructive text-sm font-medium">{error}</p>
            )}
          </div>

          {/* Results */}
          {result && (
            <div className="space-y-6">
              {/* Summary cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Total Cards", value: result.summary.count, color: "text-foreground" },
                  { label: "Elite", value: result.summary.byTier.elite || 0, color: "text-vzla-yellow" },
                  { label: "Premium", value: result.summary.byTier.premium || 0, color: "text-vzla-purple" },
                  { label: "Notable", value: result.summary.byTier.notable || 0, color: "text-vzla-mint" },
                ].map((s) => (
                  <div key={s.label} className="glass-panel rounded-xl p-4 text-center">
                    <div className={`text-2xl font-bold font-display ${s.color}`}>{s.value}</div>
                    <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Pull Signal Analysis */}
              {result.robustSummary && (
                <div className="glass-panel rounded-xl p-5 border border-vzla-yellow/20">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">📡</span>
                    <h3 className="font-display font-bold text-foreground">Pull Signal Analysis</h3>
                  </div>
                  <p className="text-sm text-foreground mb-3 leading-relaxed">
                    {result.robustSummary.recommendation}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="bg-secondary/60 rounded-lg p-3">
                      <span className="text-muted-foreground">Best Signal Card</span>
                      <p className="text-foreground font-medium mt-0.5 truncate">{result.robustSummary.bestSignalCard}</p>
                    </div>
                    <div className="bg-secondary/60 rounded-lg p-3">
                      <span className="text-muted-foreground">Avg Signal Strength</span>
                      <p className="text-foreground font-medium mt-0.5">
                        {result.robustSummary.avgSignalStrength} dB
                        <span className="text-muted-foreground ml-1">
                          ({result.robustSummary.avgSignalStrength >= 22 ? "highly predictable" : result.robustSummary.avgSignalStrength >= 15 ? "reliable" : "variable"})
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Beginner-friendly metric explainer */}
                  <Accordion type="single" collapsible className="mt-3">
                    <AccordionItem value="metrics-help" className="border-border/30">
                      <AccordionTrigger className="text-xs text-muted-foreground hover:text-foreground py-2">
                        💡 What do these metrics mean?
                      </AccordionTrigger>
                      <AccordionContent className="text-xs text-muted-foreground space-y-2 pb-2">
                        <p>
                          <strong className="text-foreground">Card Score (0–100):</strong> How desirable a card is based on what makes it special — autographs, relics, serial numbering (/50, /25, etc.), and rookie status. Higher = more valuable pull.
                        </p>
                        <p>
                          <strong className="text-foreground">Signal Strength (dB):</strong> How confident we are in the card's value. Think of it like a Wi-Fi signal — higher means we're more sure this card will hold its worth regardless of odds uncertainty. 20+ is strong, 10–20 is moderate.
                        </p>
                        <p>
                          <strong className="text-foreground">Grade:</strong> A quick verdict on the card's pull quality:
                        </p>
                        <ul className="list-disc ml-4 space-y-0.5">
                          <li><span className="text-vzla-yellow font-medium">🎯 Exceptional</span> — Chase card, worth hunting for</li>
                          <li><span className="text-vzla-mint font-medium">✅ Strong</span> — Solid pull with reliable value</li>
                          <li><span className="text-vzla-purple font-medium">⚡ Moderate</span> — Decent but uncertain upside</li>
                          <li><span className="text-muted-foreground font-medium">📄 Weak</span> — Common card, low collector demand</li>
                        </ul>
                        <p>
                          <strong className="text-foreground">Risk:</strong> How far a card is from being an "ideal hit." Lower risk = closer to the dream pull. High risk means the card is common or the odds are unpredictable.
                        </p>
                        <p>
                          <strong className="text-foreground">Estimated Odds:</strong> Roughly how many packs you'd need to open to pull this specific card. "1 in 4,800 packs" means you'd statistically need ~4,800 packs (or ~200 hobby boxes) to find it.
                        </p>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
              )}

              {/* Odds Comparison Chart */}
              {result.results.some((r) => r.estimatedPackOdds) && (
                <OddsComparisonChart results={result.results} />
              )}

              {/* Type breakdown */}
              <div className="glass-panel rounded-xl p-4">
                <h3 className="text-sm font-semibold text-foreground mb-2">Card Types Found</h3>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(result.summary.byType).map(([type, count]) => (
                    <Badge key={type} variant="secondary" className="text-xs">
                      {type} ({count})
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Toggle standard */}
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl font-bold text-foreground">
                  Results for {result.athlete}
                </h2>
                <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showStandard}
                    onChange={(e) => setShowStandard(e.target.checked)}
                    className="rounded border-border"
                  />
                  Show standard cards
                </label>
              </div>

              {result.results.length === 0 && (
                <div className="glass-panel rounded-xl p-8 text-center border border-destructive/30">
                  <p className="text-2xl mb-2">🔍</p>
                  <p className="text-foreground text-lg font-semibold">No matching cards found</p>
                  <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
                    <strong>"{result.athlete}"</strong> wasn't found in this checklist. This usually means:
                  </p>
                  <ul className="text-sm text-muted-foreground mt-2 space-y-1 text-left max-w-sm mx-auto">
                    <li>• The athlete isn't in this product's checklist</li>
                    <li>• Try the full name (e.g. "Ronald Acuña Jr." not "Acuña")</li>
                    <li>• Check for accented characters or suffixes (Jr., II, III)</li>
                    <li>• The PDF might have unusual formatting — try TXT or CSV</li>
                  </ul>
                </div>
              )}

              {/* Tier groups */}
              {[
                { label: "Elite", items: elite, defaultOpen: true },
                { label: "Premium", items: premium, defaultOpen: true },
                { label: "Notable", items: notable, defaultOpen: false },
                { label: "Standard", items: standard, defaultOpen: false },
              ].filter((g) => g.items.length > 0).map((group) => (
                <Accordion key={group.label} type="single" collapsible defaultValue={group.defaultOpen ? group.label : undefined}>
                  <AccordionItem value={group.label} className="glass-panel rounded-xl border-border overflow-hidden">
                    <AccordionTrigger className="px-4 py-3 hover:no-underline">
                      <span className="flex items-center gap-2">
                        <span>{TIER_ICONS[group.label.toLowerCase()]}</span>
                        <span className="font-display font-bold text-foreground">{group.label}</span>
                        <Badge variant="outline" className={TIER_COLORS[group.label.toLowerCase()]}>
                          {group.items.length}
                        </Badge>
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                      <div className="space-y-3">
                        {group.items.map((card, i) => (
                          <CardResult key={`${card.rawText}-${i}`} card={card} athleteName={result.athlete} />
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              ))}

              {/* Download */}
              <div className="flex gap-3">
                <Button onClick={handleDownloadJSON} variant="outline" className="border-border">
                  📥 Download JSON
                </Button>
              </div>
            </div>
          )}
        </section>
      </main>
      <BackToTop />
    </div>
  );
};

/** Horizontal bar chart showing relative rarity of each parallel tier */
function OddsComparisonChart({ results }: { results: Array<ChecklistEntry & { displayOdds: string; robust?: RobustScore }> }) {
  const data = useMemo(() => {
    const withOdds = results
      .filter((r) => r.estimatedPackOdds && r.estimatedPackOdds > 0)
      .sort((a, b) => (a.estimatedPackOdds ?? 0) - (b.estimatedPackOdds ?? 0));

    // Deduplicate by section label (keep the one with lowest odds per tier name)
    const seen = new Map<string, typeof withOdds[0]>();
    for (const card of withOdds) {
      const label = card.section.length > 40 ? card.section.slice(0, 37) + "…" : card.section;
      if (!seen.has(label)) seen.set(label, card);
    }
    return Array.from(seen.values()).slice(0, 12);
  }, [results]);

  if (data.length < 2) return null;

  const maxOdds = Math.max(...data.map((d) => d.estimatedPackOdds ?? 0));

  const tierBarColors: Record<string, string> = {
    elite: "bg-vzla-yellow",
    premium: "bg-vzla-purple",
    notable: "bg-vzla-mint",
    standard: "bg-muted-foreground",
  };

  return (
    <div className="glass-panel rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">📊</span>
        <h3 className="font-display font-bold text-foreground">Parallel Rarity Comparison</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Longer bars = rarer cards. Each bar shows how many packs you'd need to open on average.
      </p>
      <div className="space-y-2.5">
        {data.map((card, i) => {
          const odds = card.estimatedPackOdds ?? 0;
          const pct = maxOdds > 0 ? (odds / maxOdds) * 100 : 0;
          const barColor = tierBarColors[card.rarityTier] || "bg-muted-foreground";
          const label = card.section.length > 35 ? card.section.slice(0, 32) + "…" : card.section;

          return (
            <div key={`${card.rawText}-${i}`} className="space-y-0.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-foreground font-medium truncate max-w-[60%]">
                  {TIER_ICONS[card.rarityTier]} {label}
                  {card.serialNumber ? ` /${card.serialNumber}` : ""}
                </span>
                <span className="text-muted-foreground font-mono shrink-0 ml-2">
                  ~1:{odds.toLocaleString()} packs
                </span>
              </div>
              <div className="h-3 w-full bg-secondary rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${barColor} transition-all duration-500`}
                  style={{ width: `${Math.max(pct, 2)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-[10px] text-muted-foreground/60 mt-3 italic">
        Odds are estimates based on typical hobby box distributions and set size.
      </p>
    </div>
  );
}

function buildEbaySearchUrl(card: ChecklistEntry, athlete: string): string {
  const section = (card.section ?? "").replace(/\(implied\)/gi, "").trim();
  const terms = [athlete, section].filter(Boolean).join(" ");
  const params = new URLSearchParams({
    _nkw: terms,
    _sacat: "212",
    LH_BIN: "1",
    LH_ItemCondition: "3",
    mkcid: "1",
    mkrid: "711-53200-19255-0",
    campid: "5339142305",
    toolid: "10001",
    customid: "checklist-intel",
  });
  return `https://www.ebay.com/sch/i.html?${params.toString()}`;
}

function CardResult({ card, athleteName = "" }: { card: ChecklistEntry & { displayOdds: string; robust?: RobustScore }; athleteName?: string }) {
  const r = card.robust;
  const ebayUrl = buildEbaySearchUrl(card, athleteName);

  return (
    <div className="bg-secondary/50 rounded-lg p-3 border border-border/50 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{card.section}</p>
          <p className="text-xs text-muted-foreground truncate">{card.rawText}</p>
        </div>
        <Badge variant="outline" className={`shrink-0 text-xs ${TIER_COLORS[card.rarityTier]}`}>
          {card.rarityTier}
        </Badge>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>Types: {card.cardTypes.join(", ")}</span>
        {card.serialNumber && <span>Serial: /{card.serialNumber}</span>}
        <span>Score: {card.score}</span>
        <span className={card.estimatedPackOdds ? "text-vzla-yellow font-semibold" : ""}>
          Odds: {card.displayOdds}
        </span>
      </div>

      {/* Pull Signal Row */}
      {r && (
        <TooltipProvider>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] pt-1 border-t border-border/30">
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="font-medium text-foreground">
                  Card Score: {r.desirability}
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[220px]">
                <p>How desirable this card is (0–100) based on autographs, relics, serial numbering, and rookie status.</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-muted-foreground">
                  Signal: <span className="text-foreground font-medium">{r.signalStrength} dB</span>
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[260px]">
                <p>Like a Wi-Fi signal for card value — higher means we're more confident this card will hold its worth. 20+ = strong, 10–20 = moderate.</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <span className={`font-semibold ${GRADE_COLORS[r.grade]}`}>
                  {GRADE_LABELS[r.grade]}
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[260px]">
                <p>{r.grade === "exceptional" ? "🔥 Chase card — worth hunting for!" : r.grade === "strong" ? "Solid pull with reliable collector demand." : r.grade === "moderate" ? "Decent card but uncertain upside — odds or demand may vary." : "Common card with low collector premium."}{r.insight ? ` ${r.insight}` : ""}</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-muted-foreground/70">
                  Risk: {r.risk}
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[240px]">
                <p>How far from a "dream pull" — lower is better. High risk means the card is common or the pull odds are unpredictable.</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      )}

      {card.matchedOdds && (
        <p className="text-[11px] text-muted-foreground/70 italic">
          Matched odds: {card.matchedOdds.name}
        </p>
      )}

      {/* eBay Search Link */}
      <a
        href={ebayUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-vzla-yellow hover:text-vzla-yellow/80 transition-colors no-underline pt-0.5"
      >
        🔎 Search on eBay
        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
      </a>
    </div>
  );
}

export default ChecklistIntel;
