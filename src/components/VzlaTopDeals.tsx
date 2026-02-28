import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { buildEbaySearchUrl } from "@/lib/vzla-helpers";
import { Link } from "react-router-dom";

interface SoldRecord { avg?: number; taguchiSold?: number }
interface ListedRecord {
  avgListing?: number; taguchiListing?: number; trimmedListing?: number;
  avg?: number; average?: number; sport?: string;
  marketplaces?: Record<string, { avgListing?: number; taguchiListing?: number }>;
}

function getListedPrice(rec: ListedRecord | undefined): number | null {
  if (!rec) return null;
  const mp = rec.marketplaces;
  if (mp) {
    const vals: number[] = [];
    for (const m of Object.values(mp)) {
      const v = m?.taguchiListing ?? m?.avgListing;
      if (v != null && Number.isFinite(v) && v > 0) vals.push(v);
    }
    if (vals.length) return vals.reduce((a, b) => a + b, 0) / vals.length;
  }
  const v = rec.taguchiListing ?? rec.avgListing ?? rec.trimmedListing ?? rec.avg ?? rec.average ?? null;
  return v != null && Number.isFinite(v) && v > 0 ? v : null;
}

function getSoldPrice(rec: SoldRecord | undefined): number | null {
  if (!rec) return null;
  const v = rec.taguchiSold ?? rec.avg ?? null;
  return v != null && Number.isFinite(v) && v > 0 ? v : null;
}

async function fetchJson(url: string) {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

interface Deal {
  name: string;
  sport: string;
  listed: number;
  sold: number;
  savings: number;
  savingsPct: number;
}

interface VzlaTopDealsProps {
  athleteSportMap?: Record<string, string>;
}

const VzlaTopDeals = ({ athleteSportMap: externalMap }: VzlaTopDealsProps) => {
  const [listedData, setListedData] = useState<Record<string, ListedRecord>>({});
  const [soldData, setSoldData] = useState<Record<string, SoldRecord>>({});
  const [athleteSportMap, setAthleteSportMap] = useState<Record<string, string>>({});

  useEffect(() => {
    Promise.all([
      fetchJson("https://raw.githubusercontent.com/jaydiare/ui-polish-pal/main/data/ebay-avg.json"),
      fetchJson("https://raw.githubusercontent.com/jaydiare/ui-polish-pal/main/data/ebay-sold-avg.json"),
      ...(externalMap ? [] : [fetchJson("data/athletes.json")]),
    ]).then(([listed, sold, athletes]) => {
      if (listed) setListedData(listed);
      if (sold) setSoldData(sold);
      if (externalMap) {
        setAthleteSportMap(externalMap);
      } else if (athletes && Array.isArray(athletes)) {
        const map: Record<string, string> = {};
        for (const a of athletes) { if (a?.name && a?.sport) map[a.name] = a.sport; }
        setAthleteSportMap(map);
      }
    });
  }, [externalMap]);

  const deals = useMemo((): Deal[] => {
    const items: Deal[] = [];
    const allKeys = new Set([...Object.keys(listedData), ...Object.keys(soldData)]);
    for (const key of allKeys) {
      if (key === "_meta") continue;
      const lp = getListedPrice(listedData[key] as ListedRecord);
      const sp = getSoldPrice(soldData[key] as SoldRecord);
      if (lp == null || sp == null) continue;
      const ratio = Math.max(lp, sp) / Math.max(Math.min(lp, sp), 0.01);
      if (ratio > 10) continue;
      const spread = lp - sp;
      if (spread >= 0) continue; // only underpriced (sold > listed)
      const sport = athleteSportMap[key] || (listedData[key] as any)?.sport || "Other";
      items.push({
        name: key,
        sport,
        listed: Math.round(lp * 100) / 100,
        sold: Math.round(sp * 100) / 100,
        savings: Math.round(Math.abs(spread) * 100) / 100,
        savingsPct: Math.round((Math.abs(spread) / sp) * 100),
      });
    }
    return items.sort((a, b) => b.savings - a.savings).slice(0, 5);
  }, [listedData, soldData, athleteSportMap]);

  if (!deals.length) return null;

  return (
    <section className="my-8" aria-label="Top deals right now">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <div className="flex items-center gap-2 mb-4">
          <span className="w-1 h-5 rounded-full bg-primary inline-block" />
          <h2 className="font-display font-bold text-lg text-foreground">
            🟢 Top Deals Right Now
          </h2>
          <span className="text-[10px] text-muted-foreground ml-auto">sold &gt; listed = flip opportunity</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {deals.map((deal, i) => (
            <motion.a
              key={deal.name}
              href={buildEbaySearchUrl(deal.name, deal.sport)}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.06 }}
              className="glass-panel p-4 hover:border-green-500/30 transition-all group cursor-pointer"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{deal.sport}</span>
                <span className="text-[10px] font-bold text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full">
                  -{deal.savingsPct}%
                </span>
              </div>
              <h3 className="font-display font-bold text-sm text-foreground mb-2 group-hover:text-primary transition-colors truncate">
                {deal.name}
              </h3>
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-muted-foreground">Buy now</span>
                  <span className="font-mono font-bold text-foreground">${deal.listed.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-muted-foreground">Sells for</span>
                  <span className="font-mono font-bold text-green-400">${deal.sold.toFixed(2)}</span>
                </div>
                <div className="border-t border-border/50 pt-1 mt-1 flex justify-between text-[11px]">
                  <span className="text-muted-foreground">Potential</span>
                  <span className="font-mono font-bold text-green-400">+${deal.savings.toFixed(2)}</span>
                </div>
              </div>
              <div className="text-[9px] text-muted-foreground/60 mt-2 text-center group-hover:text-primary/60 transition-colors">
                Click to buy on eBay ↗
              </div>
            </motion.a>
          ))}
        </div>

        <div className="mt-3 text-center">
          <Link
            to="/data"
            className="inline-flex items-center gap-2 text-xs text-primary hover:text-primary/80 font-medium transition-colors"
          >
            See all deals & full market analysis →
          </Link>
        </div>
      </motion.div>
    </section>
  );
};

export default VzlaTopDeals;
