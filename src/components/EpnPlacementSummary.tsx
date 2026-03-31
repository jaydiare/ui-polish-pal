import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";

interface PlacementData {
  clicks: number;
  impressions: number;
  ctr: number;
  earnings: number;
  conversions: number;
}

interface EpnData {
  _meta?: { updatedAt?: string; period?: { start?: string; end?: string } };
  placements?: Record<string, PlacementData>;
  bestBanner?: string | null;
}

const PLACEMENT_LABELS: Record<string, { label: string; emoji: string }> = {
  "sidebar-ebay": { label: "Sidebar Banner", emoji: "📐" },
  "footer-main": { label: "Footer Banner", emoji: "🦶" },
  "footer-alt": { label: "Footer Alt", emoji: "🔄" },
  "store-banner": { label: "Store Banner", emoji: "🏪" },
  "checklist-intel": { label: "Checklist Intel", emoji: "🔎" },
  "athlete-search": { label: "Athlete Search", emoji: "🏃" },
  "about-store": { label: "About Store", emoji: "ℹ️" },
  unknown: { label: "Untagged", emoji: "❓" },
};

function getLabel(id: string) {
  return PLACEMENT_LABELS[id] || { label: id, emoji: "🔗" };
}

export default function EpnPlacementSummary() {
  const [data, setData] = useState<EpnData | null>(null);

  useEffect(() => {
    fetch(
      "https://raw.githubusercontent.com/jaydiare/ui-polish-pal/main/data/epn-performance.json"
    )
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .catch(() => null);
  }, []);

  const placements = useMemo(() => {
    if (!data?.placements) return [];
    return Object.entries(data.placements)
      .map(([id, p]) => ({ id, ...p }))
      .sort((a, b) => b.clicks - a.clicks || b.conversions - a.conversions);
  }, [data]);

  const totals = useMemo(() => {
    return placements.reduce(
      (acc, p) => ({
        clicks: acc.clicks + p.clicks,
        impressions: acc.impressions + p.impressions,
        earnings: acc.earnings + p.earnings,
        conversions: acc.conversions + p.conversions,
      }),
      { clicks: 0, impressions: 0, earnings: 0, conversions: 0 }
    );
  }, [placements]);

  if (!data || placements.length === 0) return null;

  const period = data._meta?.period;
  const updatedAt = data._meta?.updatedAt
    ? new Date(data._meta.updatedAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  const checklistIntel = placements.find((p) => p.id === "checklist-intel");

  return (
    <section className="my-8" aria-label="EPN affiliate placement performance">
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
          <span className="text-lg">📊</span>
          Affiliate Placement Performance
        </h2>
        {updatedAt && (
          <span className="text-[10px] text-muted-foreground">
            Updated {updatedAt}
          </span>
        )}
      </div>
      <p className="text-[10px] text-muted-foreground mb-4">
        Click-through rates by placement tag
        {period ? ` · ${period.start} → ${period.end}` : ""}
      </p>

      {/* Totals row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {[
          { label: "Total Clicks", value: totals.clicks.toLocaleString(), color: "text-foreground" },
          { label: "Conversions", value: totals.conversions.toLocaleString(), color: "text-vzla-mint" },
          {
            label: "Earnings",
            value: `$${totals.earnings.toFixed(2)}`,
            color: "text-vzla-yellow",
          },
          {
            label: "Avg CTR",
            value:
              totals.impressions > 0
                ? `${((totals.clicks / totals.impressions) * 100).toFixed(2)}%`
                : "—",
            color: "text-vzla-purple",
          },
        ].map((s) => (
          <div key={s.label} className="glass-panel rounded-xl p-3 text-center">
            <div className={`text-xl font-bold font-display ${s.color}`}>
              {s.value}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Checklist Intel highlight */}
      {checklistIntel && checklistIntel.clicks > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel rounded-xl p-4 mb-4 border border-vzla-yellow/20"
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-base">🔎</span>
            <span className="font-display font-bold text-sm text-foreground">
              Checklist Intel Performance
            </span>
            <Badge
              variant="outline"
              className="text-[10px] bg-vzla-yellow/10 text-vzla-yellow border-vzla-yellow/30"
            >
              New
            </Badge>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div>
              <div className="text-lg font-bold font-display text-foreground">
                {checklistIntel.clicks}
              </div>
              <div className="text-[10px] text-muted-foreground">Clicks</div>
            </div>
            <div>
              <div className="text-lg font-bold font-display text-vzla-mint">
                {checklistIntel.conversions}
              </div>
              <div className="text-[10px] text-muted-foreground">
                Conversions
              </div>
            </div>
            <div>
              <div className="text-lg font-bold font-display text-vzla-yellow">
                ${checklistIntel.earnings.toFixed(2)}
              </div>
              <div className="text-[10px] text-muted-foreground">Earnings</div>
            </div>
            <div>
              <div className="text-lg font-bold font-display text-vzla-purple">
                {checklistIntel.ctr > 0 ? `${checklistIntel.ctr.toFixed(2)}%` : "—"}
              </div>
              <div className="text-[10px] text-muted-foreground">CTR</div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Placement table */}
      <div className="glass-panel rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/50 text-muted-foreground">
                <th className="text-left p-3 font-medium">Placement</th>
                <th className="text-right p-3 font-medium">Clicks</th>
                <th className="text-right p-3 font-medium">Impr.</th>
                <th className="text-right p-3 font-medium">CTR</th>
                <th className="text-right p-3 font-medium">Conv.</th>
                <th className="text-right p-3 font-medium">Earnings</th>
              </tr>
            </thead>
            <tbody>
              {placements.map((p) => {
                const { label, emoji } = getLabel(p.id);
                const isBest = data.bestBanner === p.id;
                const isChecklist = p.id === "checklist-intel";
                return (
                  <tr
                    key={p.id}
                    className={`border-b border-border/20 transition-colors hover:bg-accent/30 ${
                      isChecklist ? "bg-vzla-yellow/5" : ""
                    }`}
                  >
                    <td className="p-3 font-medium text-foreground flex items-center gap-1.5">
                      <span>{emoji}</span>
                      <span>{label}</span>
                      {isBest && (
                        <Badge
                          variant="outline"
                          className="text-[9px] bg-vzla-yellow/10 text-vzla-yellow border-vzla-yellow/30 ml-1"
                        >
                          Best CTR
                        </Badge>
                      )}
                    </td>
                    <td className="p-3 text-right font-mono text-foreground">
                      {p.clicks.toLocaleString()}
                    </td>
                    <td className="p-3 text-right font-mono text-muted-foreground">
                      {p.impressions.toLocaleString()}
                    </td>
                    <td className="p-3 text-right font-mono text-foreground">
                      {p.ctr > 0 ? `${p.ctr.toFixed(2)}%` : "—"}
                    </td>
                    <td className="p-3 text-right font-mono text-vzla-mint">
                      {p.conversions > 0 ? p.conversions : "—"}
                    </td>
                    <td className="p-3 text-right font-mono text-vzla-yellow">
                      {p.earnings > 0 ? `$${p.earnings.toFixed(2)}` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-[9px] text-muted-foreground/60 text-center mt-3 italic">
        Data from eBay Partner Network. Placements tracked via customid parameter.
      </p>
    </section>
  );
}
