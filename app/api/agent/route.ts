import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getBaseUsdcVaults, VaultSummary } from "@/lib/morphoGraphql";
import { MORPHO_MCP_URL } from "@/lib/morphoMcp";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const runtime = "nodejs";
export const maxDuration = 60;

type AgentResult = {
  pickedVault: {
    address: string;
    name: string;
    symbol: string;
    apy: number;
    tvlUsd: number;
    curators: string[];
  };
  rationale: string;
  preparedTx?: {
    to: string;
    data: string;
    value: string;
  };
  approvalTx?: {
    to: string;
    data: string;
    value: string;
  };
  warnings: string[];
  trace: Array<{ role: string; content: string }>;
  mode: "mcp-agent" | "deterministic-fallback";
};

/**
 * The primary path: Claude with Morpho's remote MCP server attached.
 * Anthropic's `mcp_servers` parameter lets Claude call MCP tools in a single
 * messages.create() turn without us implementing JSON-RPC locally.
 */
async function runMcpAgent(params: {
  userPrompt: string;
  walletAddress: string;
  amountUsdc: number;
}): Promise<AgentResult | null> {
  const { userPrompt, walletAddress, amountUsdc } = params;

  const systemPrompt = `You are a Morpho deposit agent. You have access to tools on Morpho's MCP server.

Task: pick the safest USDC vault on Base for a deposit of ${amountUsdc} USDC by address ${walletAddress}, and prepare the deposit transaction.

Safety criteria, in priority order:
1. TVL > $5M (skip vaults smaller than this)
2. Curator is verified and reputable (Gauntlet, Steakhouse, MEV Capital, Block Analitica, Re7 — prefer these)
3. Allocation is diversified (not 100% to a single market)
4. Net APY is reasonable (skip vaults with APY > 3x the median — likely incentive-heavy)

Steps:
1. Call morpho_query_vaults with chain=base, asset=USDC, sort by TVL desc, first 10.
2. Filter by safety criteria.
3. Pick the top remaining vault.
4. Call morpho_prepare_deposit with the picked vault address, amount=${amountUsdc} USDC, user=${walletAddress}.
5. Return: picked vault + rationale + prepared tx. Be concise.`;

  try {
    const response = await anthropic.beta.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
      mcp_servers: [
        {
          type: "url",
          url: MORPHO_MCP_URL,
          name: "morpho",
        },
      ],
      betas: ["mcp-client-2025-04-04"],
    });

    // Extract the final text + any tool uses from the response.
    const trace: AgentResult["trace"] = [];
    let finalText = "";
    let preparedTx: AgentResult["preparedTx"] | undefined;
    let approvalTx: AgentResult["approvalTx"] | undefined;

    for (const block of response.content) {
      if (block.type === "text") {
        finalText += block.text;
        trace.push({ role: "assistant", content: block.text });
      } else if (block.type === "tool_use") {
        trace.push({
          role: "tool_use",
          content: `${block.name}(${JSON.stringify(block.input).slice(0, 300)})`,
        });
        // Capture prepared tx from the tool call input/output if present.
        if (block.name === "morpho_prepare_deposit") {
          // The tool result comes back as a tool_result block in the next message.
          // For this simple demo we parse the assistant's final text.
        }
      } else if (
        (block as unknown as { type: string }).type === "tool_result" ||
        (block as unknown as { type: string }).type === "mcp_tool_result"
      ) {
        const content = (block as { content?: unknown }).content;
        trace.push({
          role: "tool_result",
          content: JSON.stringify(content).slice(0, 500),
        });
        // Try to extract a prepared tx from the tool result.
        try {
          const parsed =
            typeof content === "string"
              ? JSON.parse(content)
              : (content as Record<string, unknown>);
          const operation = (parsed as Record<string, unknown>).operation as
            | { transactions?: Array<{ to: string; data: string; value: string }> }
            | undefined;
          if (operation?.transactions?.length) {
            const txs = operation.transactions;
            if (txs.length >= 2) {
              approvalTx = txs[0];
              preparedTx = txs[1];
            } else {
              preparedTx = txs[0];
            }
          }
        } catch {
          // ignore parse errors
        }
      }
    }

    // Parse the final text for a structured JSON block the agent was asked to return.
    let parsed: Partial<AgentResult> = {};
    const jsonMatch = finalText.match(/```json\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        parsed = JSON.parse(jsonMatch[1]);
      } catch {
        // ignore
      }
    }

    if (!parsed.pickedVault) {
      // Fall back to deterministic path rather than return garbage.
      return null;
    }

    return {
      pickedVault: parsed.pickedVault!,
      rationale: parsed.rationale || finalText.slice(0, 500),
      preparedTx: preparedTx || parsed.preparedTx,
      approvalTx: approvalTx || parsed.approvalTx,
      warnings: parsed.warnings || [],
      trace,
      mode: "mcp-agent",
    };
  } catch (err) {
    const msg = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    console.error("MCP agent path failed:", msg);
    (globalThis as { __lastMcpError?: string }).__lastMcpError = msg;
    return null;
  }
}

/**
 * Deterministic fallback: if the MCP agent path fails (MCP down, API rate limit,
 * flaky tool call), we still return a reasoned vault pick using the GraphQL API
 * directly. In production this is what you'd run as a health-check anyway.
 *
 * Called out in DEVX-NOTES.md as Gap #4: the MCP path has no circuit breaker;
 * integrators have to build their own fallback.
 */
async function runDeterministicFallback(params: {
  userPrompt: string;
  walletAddress: string;
  amountUsdc: number;
}): Promise<AgentResult> {
  const vaults = await getBaseUsdcVaults();

  const reputableCurators = new Set([
    "gauntlet",
    "steakhouse",
    "steakhouse financial",
    "mev capital",
    "block analitica",
    "re7",
    "re7 labs",
  ]);

  const candidates = vaults
    .filter((v) => v.state.totalAssetsUsd >= 5_000_000)
    .filter((v) => {
      const curators = (v.metadata?.curators || []).map((c) =>
        c.name.toLowerCase(),
      );
      return curators.some((c) =>
        [...reputableCurators].some((r) => c.includes(r)),
      );
    });

  const apys = candidates.map((v) => v.state.netApy).sort((a, b) => a - b);
  const medianApy = apys[Math.floor(apys.length / 2)] || 0;

  const ranked = candidates
    .filter((v) => v.state.netApy <= medianApy * 3 || medianApy === 0)
    .sort((a, b) => {
      const diversityA = (a.state.allocation || []).length;
      const diversityB = (b.state.allocation || []).length;
      const scoreA = a.state.totalAssetsUsd * (1 + Math.min(diversityA, 5) * 0.1);
      const scoreB = b.state.totalAssetsUsd * (1 + Math.min(diversityB, 5) * 0.1);
      return scoreB - scoreA;
    });

  const picked = ranked[0] || vaults[0];
  if (!picked) {
    throw new Error("No USDC vaults found on Base");
  }

  const curators = (picked.metadata?.curators || []).map((c) => c.name);
  const diversity = (picked.state.allocation || []).length;

  const rationale = `Picked ${picked.name} (${picked.symbol}). TVL $${(picked.state.totalAssetsUsd / 1e6).toFixed(1)}M, net APY ${(picked.state.netApy * 100).toFixed(2)}%, curated by ${curators.join(", ") || "n/a"}, allocated across ${diversity} markets. Selected using TVL threshold ($5M), reputable curator filter, APY outlier rejection (max 3× median), and diversity-weighted TVL scoring. MCP agent path was unavailable; this is the deterministic fallback.`;

  const warnings: string[] = [];
  if (!curators.length) warnings.push("No curator metadata from API — verify before depositing.");
  if (diversity === 0) warnings.push("Allocation data unavailable from API.");
  if (picked.state.fee > 0.15)
    warnings.push(`Performance fee is ${(picked.state.fee * 100).toFixed(1)}% — high.`);

  return {
    pickedVault: {
      address: picked.address,
      name: picked.name,
      symbol: picked.symbol,
      apy: picked.state.netApy,
      tvlUsd: picked.state.totalAssetsUsd,
      curators,
    },
    rationale,
    preparedTx: undefined,
    approvalTx: undefined,
    warnings,
    trace: [
      {
        role: "system",
        content: `Fell back to deterministic path. Filtered ${vaults.length} vaults → ${candidates.length} safe → picked top-ranked.`,
      },
      {
        role: "system",
        content: `MCP error: ${(globalThis as { __lastMcpError?: string }).__lastMcpError ?? "no error captured (path returned null without throwing — likely missing pickedVault JSON)"}`,
      },
    ],
    mode: "deterministic-fallback",
  };
}

export async function POST(req: NextRequest) {
  try {
    const raw = (await req.json()) as {
      prompt?: string;
      userPrompt?: string;
      walletAddress: string;
      amountUsdc: number;
    };
    const body = {
      userPrompt: raw.userPrompt ?? raw.prompt ?? "",
      walletAddress: raw.walletAddress,
      amountUsdc: raw.amountUsdc,
    };

    if (!body.walletAddress || !body.amountUsdc) {
      return NextResponse.json(
        { error: "walletAddress and amountUsdc required" },
        { status: 400 },
      );
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      const fallback = await runDeterministicFallback(body);
      return NextResponse.json(fallback);
    }

    const mcpResult = await runMcpAgent(body);
    if (mcpResult) {
      return NextResponse.json(mcpResult);
    }

    const fallback = await runDeterministicFallback(body);
    return NextResponse.json(fallback);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
