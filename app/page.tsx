import { ConnectButton } from "@/components/ConnectButton";
import { AgentPanel } from "@/components/AgentPanel";
import { PositionsPanel } from "@/components/PositionsPanel";

export default function Home() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-10 space-y-6">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Morpho Earn Agent</h1>
          <p className="text-morpho-muted text-sm mt-1">
            Natural-language deposits to Morpho vaults on Base, via{" "}
            <span className="mono">mcp.morpho.org</span>. Demo for the Product
            Lead (DevX) role.
          </p>
        </div>
        <ConnectButton />
      </header>

      <AgentPanel />

      <PositionsPanel />

      <footer className="text-xs text-morpho-muted text-center pt-4">
        Source:{" "}
        <a
          className="underline hover:text-morpho-text"
          href="https://github.com/edgardextra-lang/morpho-earn-agent"
          target="_blank"
          rel="noreferrer"
        >
          github
        </a>{" "}
        · Read the{" "}
        <a className="underline hover:text-morpho-text" href="https://docs.google.com/document/d/1nuhqukwj8vxkAi4iEUcAxo8rFPSQ7Vztj88Rb-XkrTQ/edit?usp=sharing" target="_blank" rel="noreferrer">
          DevX observations
        </a>{" "}
        from building this.
      </footer>
    </main>
  );
}
