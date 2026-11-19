import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { normalize, readPublicData } from "../public-data";

const schema = z.object({
  _meta: z.object({ generatedAt: z.string().nullable().optional() }).optional(),
  auctions: z.array(z.object({ itemId: z.string(), athlete: z.string(), title: z.string(), currentBid: z.number().nullable(), currency: z.string(), endDate: z.string(), url: z.string().url(), bidCount: z.number().nullable() })),
});
export default defineTool({
  name: "list_auctions",
  title: "Find auctions ending soon",
  description: "Read public Venezuelan athlete card auctions still open, ordered by ending time; bid values are from the last three-hour refresh.",
  inputSchema: {
    athlete: z.string().min(1).max(100).optional().describe("Optional athlete name or part of a name."),
    limit: z.number().int().min(1).max(20).default(10).describe("Maximum auctions returned."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
  handler: async ({ athlete, limit }, ctx) => {
    const data = await readPublicData("ebay-auctions.json", schema, ctx.signal);
    const auctions = data.auctions.filter(a => Date.parse(a.endDate) > Date.now() && (!athlete || normalize(a.athlete).includes(normalize(athlete))))
      .sort((a, b) => Date.parse(a.endDate) - Date.parse(b.endDate)).slice(0, limit)
      .map(a => ({ itemId: a.itemId, athlete: a.athlete, title: a.title, currentBid: a.currentBid, currency: a.currency, bidCount: a.bidCount, endDate: a.endDate, url: a.url }));
    const updatedAt = data._meta?.generatedAt ?? null;
    return { content: [{ type: "text", text: `Last refresh: ${updatedAt ?? "unknown"}. Confirm bids on eBay; links are affiliate links.\n${auctions.map(a => `${a.athlete}: ${a.title}, bid ${a.currency} $${a.currentBid ?? "unknown"}, ends ${a.endDate}, ${a.url}`).join("\n") || "No matching live auctions."}` }], structuredContent: { updatedAt, auctions } };
  },
});