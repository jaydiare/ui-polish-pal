# Stop and remove the assistant (MCP) integration

Undo everything added for agent integrations, leaving the site exactly as it was before.

## What changes for you
- External assistants will no longer be able to connect to the site.
- The Auctions page looks and works the same.
- The assistant sign-in/consent screen is removed.

## Technical details
- Delete `src/lib/mcp/` (index, public-data, tools), `src/lib/webmcp-telemetry.ts`, the OAuth consent page, `supabase/functions/mcp/`, and `.lovable/mcp/manifest.json`.
- Remove `mcpPlugin()` and its import from `vite.config.ts`.
- Remove the `useWebMCP` registration and imports from `src/pages/Auctions.tsx`.
- Remove any consent route from `src/App.tsx`.
- Uninstall `@lovable.dev/mcp-js` and `use-webmcp-tool`.
- Remove the three MCP rules from `AGENTS.md`.
- Delete the deployed `mcp` backend function if it exists, and leave the OAuth server setting unused (no data affected).
- Confirm the build is clean and the Auctions page still loads.
