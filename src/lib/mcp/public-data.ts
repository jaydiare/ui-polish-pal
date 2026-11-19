import { ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";

const root = "https://raw.githubusercontent.com/jaydiare/ui-polish-pal/main/data/";
export async function readPublicData<T>(file: "athletes.json" | "ebay-avg.json" | "ebay-auctions.json", schema: z.ZodType<T>, signal: AbortSignal): Promise<T> {
  try {
    const response = await fetch(root + file, { signal, cache: "no-store" });
    if (!response.ok) throw new Error("Unavailable");
    return schema.parse(await response.json());
  } catch {
    throw new ToolError("Public market data is temporarily unavailable. Try again later.");
  }
}
export const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
export const rosterSchema = z.array(z.object({ name: z.string(), sport: z.string(), team: z.string().optional() }));