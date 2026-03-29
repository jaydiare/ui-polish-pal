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
import type { ShowRankingPlayer } from "@/data/blog-types";
import { useAthleteImage } from "@/hooks/useAthleteImage";

const CAMPAIGN_ID = "5339142305";

function buildEbayCardSearchUrl(playerName: string): string {
  const query = encodeURIComponent(`${playerName} baseball card`);
  return `https://www.ebay.com/sch/i.html?_nkw=${query}&_sacat=212&mkcid=1&mkrid=711-53200-19255-0&campid=${CAMPAIGN_ID}&toolid=10001&customid=show26-ranking`;
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

function PlayerHeadshot({ name }: { name: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const imageUrl = useAthleteImage(name, "Baseball", ref as React.RefObject<HTMLElement>);

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

export default function BlogShowRanking({ players }: { players: ShowRankingPlayer[] }) {
  return (
    <section className="mb-12">
      <p className="text-muted-foreground text-sm mb-4">
        {players.length} Venezuelan players in the MLB The Show 26 Top 100. Click a name to find their cards on eBay.
      </p>

      <motion.div
        className="glass-panel rounded-xl overflow-hidden"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs w-12">#</TableHead>
              <TableHead className="text-xs">Player</TableHead>
              <TableHead className="text-xs hidden sm:table-cell">Team</TableHead>
              <TableHead className="text-xs hidden sm:table-cell">Position</TableHead>
              <TableHead className="text-xs text-center">OVR</TableHead>
              <TableHead className="text-xs text-center">POT</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {players.map((p, i) => (
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
                    <PlayerHeadshot name={p.name} />
                    <div className="min-w-0">
                      <a
                        href={buildEbayCardSearchUrl(p.name)}
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
                <TableCell className="text-center py-2">
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${potBadge(p.pot)}`}>
                    {p.pot}
                  </span>
                </TableCell>
              </motion.tr>
            ))}
          </TableBody>
        </Table>
        <div className="px-4 py-2 border-t border-border text-xs text-muted-foreground">
          Source: <a href="https://www.theshowratings.com/lists/top-100-players" target="_blank" rel="noopener noreferrer" className="text-vzla-yellow hover:underline">TheShowRatings.com</a> · MLB The Show 26
        </div>
      </motion.div>
    </section>
  );
}
