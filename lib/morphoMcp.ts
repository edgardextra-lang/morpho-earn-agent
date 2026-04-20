/**
 * Thin wrapper for Morpho's hosted MCP server.
 *
 * The MCP exposes ~17 tools over HTTP. For this demo, we call two of them:
 *   - morpho_query_vaults       (read)
 *   - morpho_prepare_deposit    (prepare → returns unsigned tx)
 *
 * We use the Anthropic SDK's remote `mcp_servers` connector so Claude can call
 * these tools directly inside a single messages.create() call. That keeps the
 * agent loop server-side and avoids us reimplementing MCP's JSON-RPC plumbing.
 *
 * Gap this demo deliberately does NOT close (flagged in DEVX-NOTES.md):
 *   - MCP returns unsigned tx. The client has to own signing + broadcasting.
 *   - Chain support is ethereum + base only.
 *   - 17-tool surface area can degrade agent quality after 3–4 calls.
 */

export const MORPHO_MCP_URL =
  process.env.MORPHO_MCP_URL || "https://mcp.morpho.org/mcp";
