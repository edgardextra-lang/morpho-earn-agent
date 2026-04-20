# Morpho DevX — a builder’s perspective

**From:** Edgard Mbayen  
**Date:** April 20th 2026  

---

## Context

Over the past two days, I built a small but end-to-end application using Morpho Agents MCP.

The application enables a user to input a natural-language instruction such as *“deposit 100 USDC into the safest Morpho vault on Base,”* and execute it seamlessly. The flow leverages Claude and the MCP server to prepare a transaction, routes through a wallet for signature, broadcasts on-chain, and retrieves the resulting state via the GraphQL API.

I intentionally scoped this project to be narrow enough to complete quickly, while still covering the full integrator journey: MCP reads, transaction preparation, simulation, signing, and post-execution state retrieval.

This note summarizes what stood out during that process from the perspective of an integrator building on Morpho today.

---

## A foundational opportunity

One theme that stood out is the opportunity to make integrator feedback more visible and structured.

Morpho is already integrated with leading platforms such as Coinbase, Kraken, Gemini, Crypto.com, Ledger, and Anchorage Digital. Given this level of adoption, there is likely a significant volume of integrator insight already being generated.

Creating a more public and structured feedback loop (e.g., issue tracking, developer forums, or changelogs) could help surface this signal more broadly. This would not only support prioritization internally, but also give builders greater confidence and visibility into how the platform is evolving.

---

## Observations from the build

The following points are drawn directly from hands-on implementation. Each represents an opportunity to further streamline the developer experience.

### 1. Transaction signing as a key integration layer

MCP provides well-structured transaction preparation, but the signing and broadcasting layer remains fully owned by the integrator.

In practice, this means each integration reimplements similar logic around approvals, batching, and wallet interaction. A standardized signing host or reference implementations (e.g., for Privy, Safe, or Fireblocks) could significantly reduce integration overhead and improve consistency.

---

### 2. Alignment between protocol deployments and MCP support

Currently, MCP support is available on Ethereum and Base, while Morpho itself is deployed across a broader set of chains.

Aligning MCP availability more closely with protocol deployments—potentially through a defined onboarding timeline—could expand the range of use cases available to developers building agent-based experiences.

---

### 3. Clarity across data sources

From an integrator’s perspective, there are multiple ways to access data:
- GraphQL API  
- subgraphs  
- direct on-chain reads  

Each has trade-offs, and in some cases, slight inconsistencies.

Providing a clear decision framework for when to use each source, along with a recommended default path and service-level expectations, would simplify architectural decisions for builders.

---

### 4. Standard patterns for resilience

During the build, I implemented a fallback mechanism from MCP to the GraphQL API to handle edge cases such as latency or unavailable responses.

This pattern proved useful, but required custom implementation. Publishing canonical approaches (e.g., fallback handling, health checks, retry strategies) could help standardize best practices and reduce duplicated effort across integrations.

---

### 5. Reducing friction in initial builds

A few smaller SDK issues—such as documentation inconsistencies, missing testnet configurations, or wallet integration edge cases—can meaningfully impact the time to first successful build.

Addressing these through focused iteration cycles can have an outsized impact on developer onboarding and momentum.

---

### 6. MCP surface and agent performance

The current MCP toolset is comprehensive, which is valuable. At the same time, there is emerging evidence that agent performance can degrade with longer tool chains due to context constraints.

This may be an area worth monitoring over time, potentially exploring approaches such as progressive tool exposure or more opinionated abstractions.

---

### 7. Supporting V1 to V2 migration

The transition from V1 (market-based allocation) to V2 (adapter-based allocation) introduces differences that require integrators to adapt their logic.

A migration layer or SDK that abstracts these differences could help ensure continuity and reduce integration effort during upgrades.

---

## Suggested priorities (first 90 days)

### Weeks 1–2
- Establish a structured, public-facing integrator feedback loop  
- Launch a developer-focused communication channel (e.g., forum or changelog)  
- Initiate regular integrator office hours  

### Weeks 3–6
- Address high-impact SDK friction points  
- Publish data access guidance  
- Provide canonical integration patterns (fallbacks, retries)  
- Introduce migration tooling for V1 → V2  

### Weeks 7–12
- Develop a standardized transaction signing host  
- Partner with a key integrator (e.g., Trust Wallet or Ledger) to validate and refine the approach  

In parallel, maintaining a cadence of both integrator feedback reviews and internal “build exercises” can help ensure that priorities remain grounded in real-world usage.

---

## Background

My experience is rooted in building within DeFi—particularly arbitrage systems, trading infrastructure, and integrations across protocols.

I have worked extensively with SDKs and on-chain systems from platforms such as Uniswap, Curve, and Balancer. As a result, I tend to approach product questions from a builder’s perspective, with a focus on reducing friction and improving iteration speed.

What stood out while building on Morpho is the scale of what strong developer experience could unlock—particularly given the quality of existing integrations and the protocol’s positioning within the ecosystem.

---

## Closing

I expect some of these observations may already be under consideration internally. My goal in sharing them is to contribute a hands-on perspective from a recent integration experience.

I would welcome the opportunity to discuss any of these points further and to continue building alongside the team.