import { useRef } from "react";
import { motion } from "framer-motion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ShowRankingPlayer, ShowRankingSection } from "@/data/blog-types";
import { useAthleteImage } from "@/hooks/useAthleteImage";

const CAMPAIGN_ID = "5339142305";

function buildEbayCardSearchUrl(playerName: string, sport?: "baseball" | "soccer"): string {
  const sportLabel = sport === "soccer" ? "soccer card" : "baseball card";
  const category = sport === "soccer" ? "212" : "212";
  const customId = sport === "soccer" ? "fc26-ranking" : "show26-ranking";
  const query = encodeURIComponent(`${playerName} ${sportLabel}`);
  return `https://www.ebay.com/sch/i.html?_nkw=${query}&_sacat=${category}&mkcid=1&mkrid=711-53200-19255-0&campid=${CAMPAIGN_ID}&toolid=10001&customid=${customId}`;
}

function ovrColor(ovr: number): string {
  if (ovr >= 95) return "text-green-400";
  if (ovr >= 90) return "text-vzla-yellow";
  if (ovr >= 85) return "text-orange-400";
  return "text-muted-foreground";
}

function potBadge(pot: string): string {
  if (pot === "A") return "bg-green-400/15 text-green-400";
  if (pot === "B") return "bg-vzla-yellow/15 text-vzla-yellow";
  return "bg-muted text-muted-foreground";
}

function PlayerHeadshot({ name, sport }: { name: string; sport?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const imageUrl = useAthleteImage(name, sport ?? "Baseball", ref as React.RefObject<HTMLElement>);

  return (
    <div ref={ref} className="w-10 h-10 rounded-full overflow-hidden bg-secondary border border-border flex-shrink-0">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={name}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground font-bold">
          {name.split(" ").map(n => n[0]).join("").slice(0, 2)}
        </div>
      )}
    </div>
  );
}

function RankingTable({ section }: { section: ShowRankingSection }) {
  const isSoccer = section.sport === "soccer";
  const gameLabel = isSoccer ? "EA SPORTS FC™ 26" : "MLB The Show 26";

  return (
    <motion.div
      className="glass-panel rounded-xl overflow-hidden"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-base font-display font-bold text-flag-gradient">{section.title}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          {section.players.length} Venezuelan players · Click a name to find their cards on eBay
        </p>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs w-12">#</TableHead>
            <TableHead className="text-xs">Player</TableHead>
            <TableHead className="text-xs hidden sm:table-cell">Team</TableHead>
            <TableHead className="text-xs hidden sm:table-cell">Position</TableHead>
            <TableHead className="text-xs text-center">OVR</TableHead>
            {!isSoccer && <TableHead className="text-xs text-center">POT</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {section.players.map((p, i) => (
            <motion.tr
              key={p.rank}
              className="border-b transition-colors hover:bg-muted/50"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: Math.min(i * 0.06, 0.5) }}
            >
              <TableCell className="font-display font-bold text-muted-foreground py-2">
                {p.rank}
              </TableCell>
              <TableCell className="py-2">
                <div className="flex items-center gap-3">
                  <PlayerHeadshot name={p.name} sport={isSoccer ? "Soccer" : "Baseball"} />
                  <div className="min-w-0">
                    <a
                      href={buildEbayCardSearchUrl(p.name, section.sport)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-vzla-yellow hover:underline font-semibold text-sm"
                    >
                      {p.name}
                    </a>
                    <p className="text-[11px] text-muted-foreground sm:hidden">{p.team} · {p.position}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-sm text-foreground hidden sm:table-cell py-2">{p.team}</TableCell>
              <TableCell className="text-sm text-muted-foreground hidden sm:table-cell py-2">{p.position}</TableCell>
              <TableCell className={`text-center font-display font-bold text-lg py-2 ${ovrColor(p.ovr)}`}>
                {p.ovr}
              </TableCell>
              {!isSoccer && (
                <TableCell className="text-center py-2">
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${potBadge(p.pot)}`}>
                    {p.pot}
                  </span>
                </TableCell>
              )}
            </motion.tr>
          ))}
        </TableBody>
      </Table>
      <div className="px-4 py-2 border-t border-border text-xs text-muted-foreground">
        Source: <a href={section.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-vzla-yellow hover:underline">{section.sourceLabel}</a> · {gameLabel}
      </div>
    </motion.div>
  );
}

interface BlogShowRankingProps {
  players?: ShowRankingPlayer[];
  sections?: ShowRankingSection[];
}

export default function BlogShowRanking({ players, sections }: BlogShowRankingProps) {
  // Support both legacy single-list and new multi-section format
  const allSections: ShowRankingSection[] = sections ?? (players ? [{
    title: "Top 100 Players",
    sourceUrl: "https://www.theshowratings.com/lists/top-100-players",
    sourceLabel: "TheShowRatings.com",
    players,
  }] : []);

  return (
    <section className="mb-12 flex flex-col gap-8">
      {allSections.map((section, i) => (
        <RankingTable key={i} section={section} />
      ))}
    </section>
  );
}
