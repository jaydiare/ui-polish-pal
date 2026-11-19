import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { normalize, readPublicData, rosterSchema } from "../public-data";

const pricesSchema = z.record(z.unknown());
const priceSchema = z.object({ avgListing: z.number().nullable().optional(), currency: z.string().optional(), marketStabilityCV: z.number().nullable().optional(), nListing: z.number().nullable().optional() });
export default defineTool({
  name: "search_athlete_prices",
  title: "Search athlete card prices",
  description: "Find tracked Venezuelan athletes and their latest public raw-card asking prices, stability and listing counts.",
  inputSchema: {
    query: z.string().min(1).max(100).describe("Athlete name or part of a name."),
    limit: z.number().int().min(1).max(20).default(10).describe("Maximum athletes returned."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
  handler: async ({ query, limit }, ctx) => {
    const [roster, prices] = await Promise.all([
      readPublicData("athletes.json", rosterSchema, ctx.signal),
      readPublicData("ebay-avg.json", pricesSchema, ctx.signal),
    ]);
    const matches = roster.filter(a => normalize(a.name).includes(normalize(query))).slice(0, limit);
    const athletes = matches.map(a => {
      const parsed = priceSchema.safeParse(prices[a.name]);
      const p = parsed.success ? parsed.data : undefined;
      return { name: a.name, sport: a.sport, team: a.team ?? null, askingPriceUSD: p?.avgListing ?? null, stabilityCV: p?.marketStabilityCV ?? null, listingCount: p?.nListing ?? null };
    });
    const meta = z.object({ updatedAt: z.string().optional() }).safeParse(prices._meta);
    const updatedAt = meta.success ? meta.data.updatedAt ?? null : null;
    return {
      content: [{ type: "text", text: `Last refresh: ${updatedAt ?? "unknown"}. Asking prices, not sold prices or appraisals.\n${athletes.map(a => `${a.name} (${a.sport}): ${a.askingPriceUSD == null ? "unavailable" : `USD $${a.askingPriceUSD.toFixed(2)}`}, Stability CV ${a.stabilityCV ?? "unavailable"}, listings ${a.listingCount ?? "unavailable"}`).join("\n") || "No matching athletes."}` }],
      structuredContent: { updatedAt, athletes },
    };
  },
});