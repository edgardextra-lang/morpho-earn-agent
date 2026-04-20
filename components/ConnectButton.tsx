"use client";

import { useAccount, useConnect, useDisconnect, useChainId, useSwitchChain } from "wagmi";
import { base } from "wagmi/chains";

export function ConnectButton() {
  const { address, isConnected } = useAccount();
  const { connectors, connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  if (!isConnected) {
    const connector = connectors[0];
    return (
      <button
        className="btn-primary"
        disabled={isPending}
        onClick={() => connect({ connector })}
      >
        {isPending ? "Connecting…" : "Connect wallet"}
      </button>
    );
  }

  const short = `${address?.slice(0, 6)}…${address?.slice(-4)}`;

  if (chainId !== base.id) {
    return (
      <button className="btn-primary" onClick={() => switchChain({ chainId: base.id })}>
        Switch to Base
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="mono text-morpho-muted">{short}</span>
      <button className="btn-ghost" onClick={() => disconnect()}>
        Disconnect
      </button>
    </div>
  );
}
