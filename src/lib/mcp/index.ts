import { auth, defineMcp } from "@lovable.dev/mcp-js";
import searchAthletePrices from "./tools/search-athlete-prices";
import listAuctions from "./tools/list-auctions";

const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";
export default defineMcp({
  name: "ui-polish-pal",
  title: "UI Polish Pal",
  version: "0.1.0",
  instructions: "Read-only Venezuelan sports-card market research for VZLA Sports Elite. Prices are asking-price estimates, not valuations or investment advice. Always report refresh timestamps and confirm auction bids on eBay. No administrative access, purchases or private account data are exposed.",
  auth: auth.oauth.issuer({ issuer: `https://${projectRef}.supabase.co/auth/v1`, acceptedAudiences: "authenticated", requireOAuthClientClaim: true }),
  tools: [searchAthletePrices, listAuctions],
});