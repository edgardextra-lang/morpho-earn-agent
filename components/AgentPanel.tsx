"use client";

import { useState } from "react";
import { useAccount, useSendTransaction, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits } from "viem";

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
  preparedTx?: { to: string; data: string; value: string };
  approvalTx?: { to: string; data: string; value: string };
  warnings: string[];
  trace: Array<{ role: string; content: string }>;
  mode: "mcp-agent" | "deterministic-fallback";
};

export function AgentPanel() {
  const { address, isConnected } = useAccount();
  const [amount, setAmount] = useState("100");
  const [prompt, setPrompt] = useState(
    "Deposit 100 USDC into the safest Morpho vault on Base",
  );
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AgentResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: txHash, sendTransaction, isPending: sending } = useSendTransaction();
  const { isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  async function run() {
    if (!address) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          prompt,
          walletAddress: address,
          amountUsdc: Number(amount),
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Agent failed");
      setResult(body);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  function signApproval() {
    if (!result?.approvalTx) return;
    sendTransaction({
      to: result.approvalTx.to as `0x${string}`,
      data: result.approvalTx.data as `0x${string}`,
      value: BigInt(result.approvalTx.value || "0"),
    });
  }

  function signDeposit() {
    if (!result?.preparedTx) return;
    sendTransaction({
      to: result.preparedTx.to as `0x${string}`,
      data: result.preparedTx.data as `0x${string}`,
      value: BigInt(result.preparedTx.value || "0"),
    });
  }

  return (
    <div className="panel space-y-6">
      <h2 className="text-xl font-semibold">Agent</h2>

      <div className="space-y-3">
        <label className="block text-sm text-morpho-muted">Prompt</label>
        <textarea
          className="w-full bg-morpho-bg border border-morpho-border rounded-lg p-3 mono"
          rows={2}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={loading}
        />
        <div className="flex items-center gap-3">
          <label className="text-sm text-morpho-muted">Amount (USDC)</label>
          <input
            type="number"
            className="bg-morpho-bg border border-morpho-border rounded-lg px-3 py-2 mono w-32"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={loading}
          />
          <button
            className="btn-primary ml-auto"
            disabled={!isConnected || loading}
            onClick={run}
          >
            {loading ? "Thinking…" : "Run agent"}
          </button>
        </div>
      </div>

      {error && (
        <div className="border border-morpho-danger/40 bg-morpho-danger/10 text-morpho-danger p-3 rounded-lg mono">
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-4 border-t border-morpho-border pt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Picked vault</h3>
            <span
              className={`mono text-xs px-2 py-1 rounded ${
                result.mode === "mcp-agent"
                  ? "bg-morpho-accent/10 text-morpho-accent"
                  : "bg-morpho-warn/10 text-morpho-warn"
              }`}
            >
              mode: {result.mode}
            </span>
          </div>

          <div className="bg-morpho-bg border border-morpho-border rounded-lg p-4 space-y-2">
            <div className="flex items-baseline justify-between">
              <div className="font-semibold">{result.pickedVault.name}</div>
              <div className="mono text-morpho-muted text-xs">
                {result.pickedVault.address.slice(0, 10)}…
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 mono text-sm">
              <div>
                <div className="text-morpho-muted text-xs">Net APY</div>
                <div className="text-morpho-success">
                  {(result.pickedVault.apy * 100).toFixed(2)}%
                </div>
              </div>
              <div>
                <div className="text-morpho-muted text-xs">TVL</div>
                <div>${(result.pickedVault.tvlUsd / 1e6).toFixed(1)}M</div>
              </div>
              <div>
                <div className="text-morpho-muted text-xs">Curators</div>
                <div>{result.pickedVault.curators.join(", ") || "—"}</div>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm text-morpho-muted mb-1">Rationale</h4>
            <p className="text-sm leading-relaxed">{result.rationale}</p>
          </div>

          {result.warnings.length > 0 && (
            <div className="border border-morpho-warn/40 bg-morpho-warn/10 p-3 rounded-lg">
              <div className="text-sm font-semibold text-morpho-warn mb-1">
                Warnings
              </div>
              <ul className="list-disc pl-5 text-sm space-y-1">
                {result.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {result.preparedTx ? (
            <div className="flex gap-3">
              {result.approvalTx && (
                <button
                  className="btn-ghost"
                  onClick={signApproval}
                  disabled={sending || confirming}
                >
                  1. Approve USDC
                </button>
              )}
              <button
                className="btn-primary"
                onClick={signDeposit}
                disabled={sending || confirming}
              >
                {sending
                  ? "Signing…"
                  : confirming
                    ? "Confirming…"
                    : result.approvalTx
                      ? "2. Sign deposit"
                      : "Sign deposit"}
              </button>
              {isSuccess && (
                <span className="text-morpho-success text-sm self-center">
                  ✓ Deposited
                </span>
              )}
            </div>
          ) : (
            <div className="text-sm text-morpho-muted italic">
              No prepared tx returned by the agent (fallback mode or MCP gap). In
              the full MCP path, <span className="mono">morpho_prepare_deposit</span>{" "}
              returns an unsigned transaction array here.
            </div>
          )}

          <details className="text-xs">
            <summary className="cursor-pointer text-morpho-muted">Agent trace</summary>
            <pre className="mt-2 p-3 bg-morpho-bg border border-morpho-border rounded mono whitespace-pre-wrap">
              {result.trace.map((t, i) => `[${t.role}] ${t.content}`).join("\n\n")}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}
