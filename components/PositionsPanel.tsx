"use client";

import { useAccount } from "wagmi";
import { useQuery } from "@tanstack/react-query";

type Position = {
  vault: { address: string; name: string; symbol: string; asset: { symbol: string; decimals: number } };
  assets: string;
  assetsUsd: number;
};

export function PositionsPanel() {
  const { address, isConnected } = useAccount();

  const { data, isLoading } = useQuery({
    queryKey: ["positions", address],
    queryFn: async () => {
      if (!address) return { positions: [] };
      const res = await fetch(`/api/positions?address=${address}`);
      const body = await res.json();
      return body as { positions: Position[] };
    },
    enabled: !!address,
    refetchInterval: 10_000,
  });

  if (!isConnected) {
    return (
      <div className="panel">
        <h2 className="text-xl font-semibold mb-2">Positions</h2>
        <p className="text-morpho-muted text-sm">Connect a wallet to see your Morpho positions on Base.</p>
      </div>
    );
  }

  return (
    <div className="panel">
      <h2 className="text-xl font-semibold mb-4">Positions</h2>
      {isLoading && <div className="text-sm text-morpho-muted">Loading…</div>}
      {!isLoading && (!data?.positions || data.positions.length === 0) && (
        <div className="text-sm text-morpho-muted italic">
          No vault positions yet. Run the agent to deposit.
        </div>
      )}
      {data?.positions && data.positions.length > 0 && (
        <div className="space-y-2">
          {data.positions.map((p) => (
            <div
              key={p.vault.address}
              className="flex items-center justify-between bg-morpho-bg border border-morpho-border rounded-lg p-3"
            >
              <div>
                <div className="font-medium">{p.vault.name}</div>
                <div className="mono text-xs text-morpho-muted">
                  {p.vault.address.slice(0, 10)}…
                </div>
              </div>
              <div className="text-right mono">
                <div>${p.assetsUsd.toFixed(2)}</div>
                <div className="text-xs text-morpho-muted">
                  {(Number(p.assets) / Math.pow(10, p.vault.asset.decimals)).toFixed(4)}{" "}
                  {p.vault.asset.symbol}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="text-xs text-morpho-muted mt-4 italic">
        Data source: Morpho public GraphQL API (api.morpho.org). Note: subgraph
        and API can diverge for vaults with fee collector share minting — see
        DEVX-NOTES.md §3.
      </p>
    </div>
  );
}
