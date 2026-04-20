# DevX Notes — built while shipping `morpho-earn-agent`

Observations captured during a 1–2 day build against Morpho Agents MCP (beta), Morpho SDK, and the public GraphQL API. Scope is deliberately narrow: one flow ("deposit USDC into the safest vault on Base") implemented end-to-end including wallet signing, which the MCP does not cover.

Every gap below is tagged by surface and paired with a one-line roadmap implication. These are observations, not complaints — they're the kind of thing a DevX Product Lead would surface in week one.

---

## 1. The MCP → signing gap is the single biggest DevX surface

**Surface:** Morpho Agents MCP (`mcp.morpho.org`)

**What I hit:** Every `morpho_prepare_*` tool returns an unsigned transaction payload. The host application is responsible for approval chains (USDT/DAI quirks), multi-step batching, wallet state, and broadcast. Building this once is manageable. Every integrator building on the MCP builds it again.

**Roadmap implication:** Ship a reference **"MCP signing host"** — a thin package (`@morpho-org/mcp-signing-host` or similar) that turns the `{operation, simulation}` payload into a wagmi/viem/ethers-ready call sequence with progress callbacks and error taxonomy. Alternatively: an `AGENTS.md` recipe for Privy / Safe / Fireblocks each. Without this, every Coinbase, Kraken, Gemini-style partner re-invents the same code.

---

## 2. Only Ethereum + Base are supported by the MCP

**Surface:** Morpho Agents MCP

**What I hit:** The MCP's `--chain` enum only accepts `ethereum` or `base`. Morpho is deployed on ~15 chains (Arbitrum, Polygon, Avalanche, Ink, etc. per `docs.morpho.org/get-started/resources/addresses/`). For a protocol pitching itself to institutional integrators and agent flows, the 13-chain gap materially constrains what kind of agent you can ship.

**Roadmap implication:** Formalize a chain-onboarding checklist and SLA so the MCP covers every chain the protocol does within N days of a new deployment. Instrument which tools work per-chain — today, failing tool calls return generic errors without flagging chain-support as the cause.

---

## 3. API vs subgraph vs on-chain: three sources of truth, no decision tree

**Surface:** Public GraphQL API (`api.morpho.org`), community subgraph, direct on-chain reads

**What I hit:** Building the positions panel, I had to choose between the GraphQL API (convenient, but "no SLA" per docs), the subgraph (community-maintained, and `totalShares` is known to diverge from `contract.totalSupply` per [sdks/issues/18](https://github.com/morpho-org/morpho-blue-subgraph/issues/18) because fee collector share minting isn't captured), and reading `blue-sdk-viem` on-chain (slow for N markets without multicall — see gap #5). Each has different freshness, different field coverage, and different correctness guarantees. There is no published decision tree.

**Roadmap implication:** Publish **"Which data source should I use?"** — a one-pager with a flowchart. Then deprecate either the subgraph as a public integrator interface or the current "no-SLA" posture on the API. The "every source exists, good luck" stance scales poorly past the first 10 integrators.

---

## 4. The MCP agent path has no circuit breaker; every integrator will build their own fallback

**Surface:** Morpho Agents MCP

**What I hit:** I wanted "run the MCP agent to pick a vault, fall back to deterministic logic if the MCP flakes." The MCP has no published timeout, no documented retry semantics, no degraded-mode signal. I ended up writing a second path in the server route that hits the GraphQL API directly with hand-coded safety filters. Shipping this took 40% of my build time. Every integrator who cares about reliability will ship this twice.

**Roadmap implication:** Publish canonical integrator patterns (`mcp-with-fallback`, `mcp-health-probe`) or bake degraded-mode into the MCP itself. Today "agent picks the vault" is a single point of failure.

---

## 5. SDK rough edges that delay first-build

**Surface:** `@morpho-org/sdks` (observed from docs; see also open GitHub issues below)

Three things that slow first-time integrators:

- **[sdks/issues/470](https://github.com/morpho-org/sdks/issues/470)** — `slippageAmount` JSDoc contradicts the Solidity contract (says "minimum assets," actually a `minSharePrice * 1e27`). Open since Nov 2025. Every integrator using `morphoBorrow`/`morphoSupply`/`morphoWithdraw` is either guessing or reading the contract.
- **[sdks/issues/460](https://github.com/morpho-org/sdks/issues/460)** — testnet chain IDs missing from `@morpho-org/blue-sdk`. `useSimulationState` with Sepolia (`11155111`) throws. You can't prototype on testnet.
- **[sdks/issues/534](https://github.com/morpho-org/sdks/issues/534)** — `bundler-sdk-viem` caches `client.account` at init. WalletConnect account switch → sign with old account. Security-adjacent; open since March 2026.
- **No `multicall` in `@morpho-org/blue-sdk-viem`** (closed as Not Planned, [#40](https://github.com/morpho-org/sdks/issues/40)). RPC batching is the #1 optimization any app fetching N markets/positions needs.

**Roadmap implication:** A two-week "DevX paper cuts" sprint. These are 1–2 hour fixes that each unblock real integrator work. The fact that they sit open is itself the signal about feedback-loop health.

---

## 6. The feedback loop itself is the biggest product gap

**Surface:** `forum.morpho.org`, `github.com/morpho-org/*`, `morpho-skills` repo

**What I observed:**

- `morpho-skills` (flagship Agents Beta home): 0 stars, 0 open issues, 1 fork, pre-v1 "schemas may change" warning.
- `morpho-blue`: 0 open issues.
- `morpho-org/sdks`: 3 open issues total.
- `forum.morpho.org`: no developer category (404 on `/c/developers/`).
- Discord was shut down in Feb 2026 (scam volume). Integrator support routed to Intercom — out of public view.

This is either a pristine developer surface or a private one. At Morpho's scale and integration surface (Coinbase, Kraken, Gemini, Société Générale Forge, Crypto.com, Bitget, OKX, Ledger Enterprise, Anchorage, Trust Wallet, Safe, Fasanara, Apollo), it's private. That's a product problem, not a communications one.

**Roadmap implication, ordered:**

1. Enable and triage issues on `morpho-skills`; publish an issue template tied to the Builder skill's safety checklist.
2. Open a developer sub-category on `forum.morpho.org` with pinned threads per surface (MCP, SDK, GraphQL API, CLI, Builder).
3. Ship a public changelog at `morpho.org/devlog` so integrators can detect breaking changes without reading commits.
4. Quarterly integrator office hours (not Discord-style noise — a 90-min office hour with a rotating architect).
5. Instrument the Builder Agent to log unknown/failing patterns back to a private queue; that becomes the real DevX backlog.

---

## 7. 17-tool MCP surface risks context-window degradation

**Surface:** Morpho Agents MCP

**What I observed:** The MCP exposes 17 tools up front. Recent critiques of MCP adoption (e.g., Zencoder, Reinhard Feb 2026) note that multi-step reasoning degrades after 3–4 tool calls because accumulated MCP response payloads push the agent toward the tail of the context window where attention quality drops. Morpho's 17-tool shape is exactly the pattern that triggers this.

**Roadmap implication:** Experiment with **progressive tool disclosure** (expose `simulate_*` only after a read, expose `prepare_*` only after a `simulate`), or ship a CLI-first mode alongside the MCP and let integrators choose. Instrument tool-call chain length in the User Agent telemetry — if the data shows degradation past call N, the redesign writes itself.

---

## 8. Versioning: Vault V1 vs Vault V2, two incompatible ABIs, no migration SDK

**Surface:** `@morpho-org/blue-sdk-viem` (`metaMorphoAbi` vs `vaultV2Abi`)

**What I hit:** V1 and V2 have different ABIs and different allocation models ("via markets" vs "via adapters"). V1 vaults must deploy V2 wrappers/adapters to stay visible in the app's backend (per Steakhouse's [forum thread](https://forum.morpho.org/t/steakhouse-vault-v2-simplification/2235)). Integrators mapping API responses have to rewrite allocation logic for the transition.

**Roadmap implication:** A `@morpho-org/migration-sdk-viem` helper that normalizes allocation shape across V1 and V2 so integrators don't condition on version. Plus a deprecation timeline.

---

## Summary table

| # | Surface | Gap | Fix cost | Integrator leverage |
|---|---------|-----|----------|---------------------|
| 1 | MCP | No signing reference | Medium | Very high |
| 2 | MCP | 2 of 15 chains supported | Medium | High |
| 3 | API/subgraph | No "which source" guide | Low | High |
| 4 | MCP | No fallback pattern | Low | High |
| 5 | SDK | Known open paper cuts | Very low | High (cumulative) |
| 6 | Org | Broken feedback loop | Low | Critical |
| 7 | MCP | Context-window degradation risk | Medium | Medium |
| 8 | SDK | V1/V2 ABI split | Medium | High |

Numbers 1, 4, and 6 would be my first three weeks.

---

_Edgard Mbayen Mbayen — April 2026_
