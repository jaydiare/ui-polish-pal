import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import VzlaNavbar from "@/components/VzlaNavbar";
import VzlaFooter from "@/components/VzlaFooter";
import SEOHead from "@/components/SEOHead";
import SocialShare from "@/components/SocialShare";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const SEASON = new Date().getFullYear();
const EPN_CAMPAIGN = "5339142305";

// Build eBay search URL with EPN tracking
function ebayUrl(playerName: string): string {
  const query = encodeURIComponent(`${playerName} baseball card`);
  return `https://www.ebay.com/sch/i.html?_nkw=${query}&_sacat=212&_sop=12&mkcid=1&mkrid=711-53200-19255-0&campid=${EPN_CAMPAIGN}&toolid=10001&customid=mlb-vzla-leaders`;
}

type VzlaPlayer = {
  id: number;
  fullName: string;
  primaryPosition?: { abbreviation?: string };
  currentTeam?: { name?: string };
};

type StatSplit = {
  player: { id: number; fullName: string };
  team?: { name?: string };
  stat: Record<string, string | number>;
};

type Group = "hitting" | "pitching" | "fielding";

type StatDef = {
  key: string; // stat field name in MLB API
  label: string;
  desc: string;
  // Higher is better (default true). For ERA/WHIP set false.
  higherBetter?: boolean;
  // Min qualifier on another stat field to filter out tiny samples
  minQualifierField?: string;
  minQualifierValue?: number;
  // Number of decimals when displaying numeric ratio stats
  format?: (v: any) => string;
};

const HITTING_STATS: StatDef[] = [
  { key: "homeRuns", label: "Home Runs", desc: "HR" },
  { key: "hits", label: "Hits", desc: "H" },
  { key: "rbi", label: "RBI", desc: "Runs Batted In" },
  { key: "runs", label: "Runs", desc: "R" },
  { key: "stolenBases", label: "Stolen Bases", desc: "SB" },
  {
    key: "avg",
    label: "Batting Avg",
    desc: "AVG (min 50 AB)",
    minQualifierField: "atBats",
    minQualifierValue: 50,
    format: (v) => (typeof v === "string" ? v : Number(v).toFixed(3)),
  },
  {
    key: "ops",
    label: "OPS",
    desc: "OBP + SLG (min 50 AB)",
    minQualifierField: "atBats",
    minQualifierValue: 50,
    format: (v) => (typeof v === "string" ? v : Number(v).toFixed(3)),
  },
  {
    key: "obp",
    label: "OBP",
    desc: "On-Base % (min 50 AB)",
    minQualifierField: "atBats",
    minQualifierValue: 50,
    format: (v) => (typeof v === "string" ? v : Number(v).toFixed(3)),
  },
];

const PITCHING_STATS: StatDef[] = [
  { key: "wins", label: "Wins", desc: "W" },
  { key: "strikeOuts", label: "Strikeouts", desc: "K" },
  { key: "saves", label: "Saves", desc: "SV" },
  {
    key: "era",
    label: "ERA",
    desc: "Earned Run Avg (min 20 IP)",
    higherBetter: false,
    minQualifierField: "inningsPitched",
    minQualifierValue: 20,
    format: (v) => (typeof v === "string" ? v : Number(v).toFixed(2)),
  },
  {
    key: "whip",
    label: "WHIP",
    desc: "Walks+Hits per IP (min 20 IP)",
    higherBetter: false,
    minQualifierField: "inningsPitched",
    minQualifierValue: 20,
    format: (v) => (typeof v === "string" ? v : Number(v).toFixed(2)),
  },
  { key: "inningsPitched", label: "Innings Pitched", desc: "IP" },
];

const FIELDING_STATS: StatDef[] = [
  { key: "assists", label: "Assists", desc: "A" },
  { key: "putOuts", label: "Putouts", desc: "PO" },
  { key: "doublePlays", label: "Double Plays", desc: "DP" },
  {
    key: "fielding",
    label: "Fielding %",
    desc: "FLD% (min 50 chances)",
    minQualifierField: "chances",
    minQualifierValue: 50,
    format: (v) => (typeof v === "string" ? v : Number(v).toFixed(3)),
  },
];

function toNum(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function buildLeaders(
  vzlaIds: Set<number>,
  splits: StatSplit[],
  def: StatDef,
  topN = 10,
): StatSplit[] {
  const filtered = splits.filter((s) => {
    if (!vzlaIds.has(s.player.id)) return false;
    if (def.minQualifierField) {
      const q = toNum(s.stat[def.minQualifierField]);
      if (q < (def.minQualifierValue ?? 0)) return false;
    }
    const v = s.stat[def.key];
    if (v === undefined || v === null || v === "") return false;
    return true;
  });
  const higher = def.higherBetter !== false;
  filtered.sort((a, b) => {
    const av = toNum(a.stat[def.key]);
    const bv = toNum(b.stat[def.key]);
    return higher ? bv - av : av - bv;
  });
  return filtered.slice(0, topN);
}

function LeaderTable({
  title,
  desc,
  rows,
  statDef,
}: {
  title: string;
  desc: string;
  rows: StatSplit[];
  statDef: StatDef;
}) {
  return (
    <motion.div
      className="glass-panel rounded-xl overflow-hidden"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-base font-display font-bold text-flag-gradient">{title}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
      </div>
      {rows.length === 0 ? (
        <div className="px-4 py-6 text-sm text-muted-foreground">
          No qualifying Venezuelan players yet for this category in the {SEASON} season.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs w-10">#</TableHead>
              <TableHead className="text-xs">Player</TableHead>
              <TableHead className="text-xs hidden sm:table-cell">Team</TableHead>
              <TableHead className="text-xs text-right">{statDef.label}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((s, i) => {
              const raw = s.stat[statDef.key];
              const display = statDef.format ? statDef.format(raw) : String(raw);
              return (
                <TableRow key={s.player.id}>
                  <TableCell className="font-display font-bold text-muted-foreground py-2">
                    {i + 1}
                  </TableCell>
                  <TableCell className="py-2">
                    <a
                      href={ebayUrl(s.player.fullName)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-vzla-yellow hover:underline font-semibold text-sm"
                    >
                      {s.player.fullName}
                    </a>
                    <p className="text-[11px] text-muted-foreground sm:hidden">
                      {s.team?.name ?? ""}
                    </p>
                  </TableCell>
                  <TableCell className="text-sm text-foreground hidden sm:table-cell py-2">
                    {s.team?.name ?? "—"}
                  </TableCell>
                  <TableCell className="text-right font-display font-bold text-vzla-yellow py-2">
                    {display}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </motion.div>
  );
}

export default function MlbVenezuelanLeaders() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vzlaIds, setVzlaIds] = useState<Set<number>>(new Set());
  const [hitting, setHitting] = useState<StatSplit[]>([]);
  const [pitching, setPitching] = useState<StatSplit[]>([]);
  const [fielding, setFielding] = useState<StatSplit[]>([]);
  const [updatedAt, setUpdatedAt] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const [playersRes, hitRes, pitchRes, fieldRes] = await Promise.all([
          fetch(
            `https://statsapi.mlb.com/api/v1/sports/1/players?season=${SEASON}`,
          ),
          fetch(
            `https://statsapi.mlb.com/api/v1/stats?stats=season&group=hitting&season=${SEASON}&sportIds=1&playerPool=All&limit=2000`,
          ),
          fetch(
            `https://statsapi.mlb.com/api/v1/stats?stats=season&group=pitching&season=${SEASON}&sportIds=1&playerPool=All&limit=2000`,
          ),
          fetch(
            `https://statsapi.mlb.com/api/v1/stats?stats=season&group=fielding&season=${SEASON}&sportIds=1&playerPool=All&limit=4000`,
          ),
        ]);

        if (!playersRes.ok || !hitRes.ok || !pitchRes.ok || !fieldRes.ok) {
          throw new Error("MLB Stats API request failed");
        }

        const playersJson = await playersRes.json();
        const hitJson = await hitRes.json();
        const pitchJson = await pitchRes.json();
        const fieldJson = await fieldRes.json();

        const ids = new Set<number>();
        const arr: VzlaPlayer[] = playersJson.people ?? [];
        for (const p of arr) {
          // birthCountry is on the player record
          // Some records may use "Venezuela" exactly
          // @ts-expect-error - field present in MLB API
          if ((p.birthCountry ?? "").toLowerCase() === "venezuela") {
            ids.add(p.id);
          }
        }
        // Honorary Venezuelans: born elsewhere but identify as Venezuelan.
        // Jesus Luzardo (MLB ID 666200) — born in Peru to Venezuelan parents.
        ids.add(666200);

        const hitSplits: StatSplit[] = hitJson?.stats?.[0]?.splits ?? [];
        const pitchSplits: StatSplit[] = pitchJson?.stats?.[0]?.splits ?? [];
        // Fielding has multiple splits per player (one per position). Keep all.
        const fieldSplits: StatSplit[] = fieldJson?.stats?.[0]?.splits ?? [];

        if (cancelled) return;
        setVzlaIds(ids);
        setHitting(hitSplits);
        setPitching(pitchSplits);
        setFielding(fieldSplits);
        setUpdatedAt(new Date().toLocaleString());
        setLoading(false);
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.message ?? "Failed to load MLB stats");
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const hittingLeaders = useMemo(
    () => HITTING_STATS.map((d) => ({ def: d, rows: buildLeaders(vzlaIds, hitting, d) })),
    [vzlaIds, hitting],
  );
  const pitchingLeaders = useMemo(
    () => PITCHING_STATS.map((d) => ({ def: d, rows: buildLeaders(vzlaIds, pitching, d) })),
    [vzlaIds, pitching],
  );
  const fieldingLeaders = useMemo(
    () => FIELDING_STATS.map((d) => ({ def: d, rows: buildLeaders(vzlaIds, fielding, d) })),
    [vzlaIds, fielding],
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEOHead
        title={`Venezuelan MLB Leaders ${SEASON} | Live Stat Leaderboards`}
        description={`Live ${SEASON} MLB statistical leaders for Venezuelan players in batting, pitching, and fielding. Click any name to find their cards on eBay.`}
        path="/mlb-venezuelan-leaders"
      />
      <VzlaNavbar />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <header className="mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-display font-bold text-flag-gradient">
              Venezuelan MLB Leaders · {SEASON}
            </h1>
            <p className="text-sm text-muted-foreground mt-2 max-w-2xl text-pretty">
              Current-season MLB statistical leaders among Venezuelan-born players, across
              batting, pitching, and fielding. Tap any name to search their cards on eBay.
            </p>
            {updatedAt && (
              <p className="text-[11px] text-muted-foreground mt-2">
                Updated {updatedAt} · Source: MLB Stats API
              </p>
            )}
          </div>
          <div className="shrink-0">
            <SocialShare
              url={`https://vzlasportselite.com/mlb-venezuelan-leaders`}
              title={`Venezuelan MLB Leaders ${SEASON} | VZLA Sports Elite`}
              compact
            />
          </div>
        </header>

        {loading && (
          <div className="glass-panel rounded-xl px-4 py-8 text-sm text-muted-foreground">
            Loading {SEASON} MLB stats…
          </div>
        )}

        {error && !loading && (
          <div className="glass-panel rounded-xl px-4 py-6 text-sm text-destructive">
            {error}. Please try again later.
          </div>
        )}

        {!loading && !error && (
          <Tabs defaultValue="hitting" className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-3 mb-6">
              <TabsTrigger value="hitting">Batting</TabsTrigger>
              <TabsTrigger value="pitching">Pitching</TabsTrigger>
              <TabsTrigger value="fielding">Fielding</TabsTrigger>
            </TabsList>

            <TabsContent value="hitting">
              <div className="grid gap-6 md:grid-cols-2">
                {hittingLeaders.map(({ def, rows }) => (
                  <LeaderTable
                    key={def.key}
                    title={def.label}
                    desc={def.desc}
                    rows={rows}
                    statDef={def}
                  />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="pitching">
              <div className="grid gap-6 md:grid-cols-2">
                {pitchingLeaders.map(({ def, rows }) => (
                  <LeaderTable
                    key={def.key}
                    title={def.label}
                    desc={def.desc}
                    rows={rows}
                    statDef={def}
                  />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="fielding">
              <div className="grid gap-6 md:grid-cols-2">
                {fieldingLeaders.map(({ def, rows }) => (
                  <LeaderTable
                    key={def.key}
                    title={def.label}
                    desc={def.desc}
                    rows={rows}
                    statDef={def}
                  />
                ))}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </main>
      <VzlaFooter />
    </div>
  );
}
