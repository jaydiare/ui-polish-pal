import { useState, useCallback } from "react";
import SEOHead from "@/components/SEOHead";
import VzlaNavbar from "@/components/VzlaNavbar";
import BackToTop from "@/components/BackToTop";
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
  analyzeChecklist,
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
  const [checklistFile, setChecklistFile] = useState<File | null>(null);
  const [oddsFile, setOddsFile] = useState<File | null>(null);
  const [athlete, setAthlete] = useState("");
  const [formatName, setFormatName] = useState("auto-detect");
  const [packsPerBox, setPacksPerBox] = useState("");
  const [boxesPerCase, setBoxesPerCase] = useState("12");
  const [manualOdds, setManualOdds] = useState("");
  const [showStandard, setShowStandard] = useState(true);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<ProgressStep | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = useCallback(async () => {
    if (!checklistFile || !athlete.trim()) {
      setError("Please upload a checklist and enter an athlete name.");
      return;
    }
    setError(null);
    setLoading(true);
    setProgress(null);
    try {
      const res = await analyzeChecklist({
        checklistFile,
        oddsFile,
        athlete: athlete.trim(),
        formatName: formatName === "auto-detect" ? null : formatName,
        packsPerBox: packsPerBox ? parseInt(packsPerBox) : null,
        boxesPerCase: boxesPerCase ? parseInt(boxesPerCase) : null,
        manualOddsLines: manualOdds.split("\n").filter(Boolean),
        onProgress: setProgress,
      });
      setResult(res);
    } catch (e: any) {
      setError(e.message || "Analysis failed");
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

  const handleDownloadCSV = () => {
    if (!result) return;
    const headers = ["Section", "Card Code", "Athlete", "Team", "Card Types", "Serial", "Rarity Tier", "Score", "Odds", "Signal Strength", "Grade", "Risk", "Insight"];
    const rows = result.results.map((r) => [
      r.section,
      r.cardCode || "",
      r.athlete,
      r.team || "",
      r.cardTypes.join("; "),
      r.serialNumber != null ? `/${r.serialNumber}` : "",
      r.rarityTier,
      r.score,
      r.displayOdds,
      r.robust?.signalStrength ?? "",
      r.robust?.grade ?? "",
      r.robust?.risk ?? "",
      r.robust?.insight ?? "",
    ]);
    const escape = (v: string | number) => {
      const s = String(v);
      return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [headers.map(escape).join(","), ...rows.map((r) => r.map(escape).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${result.athlete.replace(/\s+/g, "_")}_checklist_analysis.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen">
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
                  placeholder="e.g. Ronald Acuña Jr."
                  value={athlete}
                  onChange={(e) => setAthlete(e.target.value)}
                  className="bg-secondary border-border"
                />
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
                </div>
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
                <div className="glass-panel rounded-xl p-8 text-center">
                  <p className="text-muted-foreground text-lg">No matching cards found for this athlete.</p>
                  <p className="text-sm text-muted-foreground mt-1">Try a different spelling or check the checklist document.</p>
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
                          <CardResult key={`${card.rawText}-${i}`} card={card} />
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

function CardResult({ card }: { card: ChecklistEntry & { displayOdds: string; robust?: RobustScore } }) {
  const r = card.robust;
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
                <p>Multi-factor score from autographs, relics, serial numbering, rookie status, and section quality.</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-muted-foreground">
                  Signal: <span className="text-foreground font-medium">{r.signalStrength} dB</span>
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[240px]">
                <p>Signal Strength — higher means more predictable value under odds uncertainty. Simulated across 60 scenarios.</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <span className={`font-semibold ${GRADE_COLORS[r.grade]}`}>
                  {GRADE_LABELS[r.grade]}
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[240px]">
                <p>{r.insight}</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-muted-foreground/70">
                  Risk: {r.risk}
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[220px]">
                <p>Risk distance from an ideal card profile. Lower = closer to an optimal pull.</p>
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
    </div>
  );
}

export default ChecklistIntel;
