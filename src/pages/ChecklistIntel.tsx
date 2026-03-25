import { useState, useCallback } from "react";
import SEOHead from "@/components/SEOHead";
import VzlaNavbar from "@/components/VzlaNavbar";
import BackToTop from "@/components/BackToTop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  type AnalysisResult,
  type ChecklistEntry,
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
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = useCallback(async () => {
    if (!checklistFile || !athlete.trim()) {
      setError("Please upload a checklist and enter an athlete name.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await analyzeChecklist({
        checklistFile,
        oddsFile,
        athlete: athlete.trim(),
        formatName: formatName === "auto-detect" ? null : formatName,
        packsPerBox: packsPerBox ? parseInt(packsPerBox) : null,
        boxesPerCase: boxesPerCase ? parseInt(boxesPerCase) : null,
        manualOddsLines: manualOdds.split("\n").filter(Boolean),
      });
      setResult(res);
    } catch (e: any) {
      setError(e.message || "Analysis failed");
    } finally {
      setLoading(false);
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
              Enter an athlete's name to discover every parallel, autograph, and numbered card — with estimated pull odds.
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

function CardResult({ card }: { card: ChecklistEntry & { displayOdds: string } }) {
  return (
    <div className="bg-secondary/50 rounded-lg p-3 border border-border/50 space-y-1.5">
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
      {card.matchedOdds && (
        <p className="text-[11px] text-muted-foreground/70 italic">
          Matched odds: {card.matchedOdds.name}
        </p>
      )}
    </div>
  );
}

export default ChecklistIntel;
