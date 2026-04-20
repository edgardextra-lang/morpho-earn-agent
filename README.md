# morpho-earn-agent

A demo application built against **Morpho Agents MCP** (beta) to explore the developer experience for the Product Lead (DevX) role at Morpho.

## What it does

One flow: natural-language deposit to the best Morpho vault on Base.

1. User connects wallet (Base network)
2. User types: *"Deposit 100 USDC into the safest Morpho vault on Base"*
3. A server-side agent (Claude with MCP tool access) calls Morpho MCP to:
   - `morpho_query_vaults` — find USDC vaults on Base
   - Apply safety heuristics (TVL, curator, allocation drift)
   - `morpho_prepare_deposit` — produce unsigned transaction
4. UI shows the picked vault, reasoning, simulation, and a sign button
5. User signs via injected wallet (MetaMask / Rabby); tx broadcasts on Base
6. Positions tab reads back state via Morpho's public GraphQL API

## Why this shape

The MCP today returns **unsigned transactions** — signing and broadcasting are left to the client. This demo deliberately closes that loop end-to-end on one concrete user story, so the gaps in the integrator path surface clearly. See `DEVX-NOTES.md` for the observations the build produced.

## Quick start

```bash
# prerequisites: Node 20+, an Anthropic API key, a wallet with USDC on Base
cp .env.example .env.local
# fill in ANTHROPIC_API_KEY
npm install
npm run dev
# open http://localhost:3000
```

Deploy to Vercel: `vercel deploy` — takes ~2 minutes.

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│  Browser    │────▶│  Next.js     │────▶│  Morpho MCP     │
│  (wagmi +   │     │  /api/agent  │     │  (mcp.morpho.   │
│   injected) │◀────│  (Claude +   │◀────│   org)          │
└─────────────┘     │   MCP tools) │     └─────────────────┘
       │            └──────────────┘              
       │                   │                      
       │                   ▼                      
       │            ┌──────────────┐              
       │            │ Morpho API   │              
       └───────────▶│ (GraphQL,    │              
                    │  positions)  │              
                    └──────────────┘              
```

Server-side route uses the Anthropic SDK's remote MCP connector (`mcp_servers` parameter) to let Claude call Morpho's hosted MCP server directly. The agent loop runs server-side; the frontend only receives the final picked vault + prepared transaction payload.

## Built by

Edgard Mbayen Mbayen — for the Morpho Product Lead (DevX) role.

## License

MIT
