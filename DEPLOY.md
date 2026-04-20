# Deploy `morpho-earn-agent` to your GitHub + Vercel

I couldn't push directly from the sandbox (no `gh` CLI, no access to your GitHub credentials). The repo files are all here — you push. Should take about 3 minutes end-to-end.

## 1. Clean init

From your local machine, in the folder where these files now live:

```bash
# From the folder: /path/to/2026/morpho-earn-agent
rm -rf .git           # remove the partial sandbox init
git init -b main
git add .
git commit -m "Initial commit: morpho-earn-agent"
```

## 2. Create the GitHub repo

**Option A — `gh` CLI (fastest):**

```bash
gh repo create morpho-earn-agent \
  --public \
  --source=. \
  --description "Natural-language deposit agent built on Morpho Agents MCP — demo for the Product Lead (DevX) role." \
  --push
```

**Option B — GitHub web UI:** create a new public repo called `morpho-earn-agent`, then:

```bash
git remote add origin git@github.com:<your-username>/morpho-earn-agent.git
git push -u origin main
```

## 3. Update the links in the code

Two files reference the repo URL with a placeholder; update them once the repo exists:

- `README.md` — top of file, "GitHub" link
- `app/page.tsx` — footer `<a href="https://github.com/">`

Quick sed (replace `<user>` with your GitHub username):

```bash
sed -i '' "s|https://github.com/|https://github.com/<user>/morpho-earn-agent|g" README.md app/page.tsx
git commit -am "Set repo URL"
git push
```

## 4. Deploy to Vercel

```bash
npx vercel --prod
```

On first run it will ask: link to a new project (yes), framework detected (Next.js — confirm). After deploy, put the production URL at the top of the README and in the outreach messages.

**Environment variables to set in Vercel dashboard:**

- `ANTHROPIC_API_KEY` — your Anthropic key
- `MORPHO_MCP_URL` — `https://mcp.morpho.org/mcp`
- `MORPHO_API_URL` — `https://api.morpho.org/graphql`
- `NEXT_PUBLIC_BASE_RPC_URL` — Base RPC (Alchemy, Infura, or `https://mainnet.base.org`)

## 5. First-run sanity check

Before sending the outreach, test the live URL once yourself:

1. Connect a wallet on Base.
2. Run the agent prompt: *"deposit 25 USDC into the safest Morpho vault on Base."*
3. Confirm the UI shows a picked vault + rationale.
4. If the MCP path flakes, the deterministic fallback in `app/api/agent/route.ts` takes over — that's intentional and covered in `DEVX-NOTES.md` §4.

If `npm install` or `npm run dev` surfaces typing errors on first run, the two known spots are:

- `app/api/agent/route.ts` — `mcp_servers` field on the Anthropic SDK has a `@ts-expect-error` because the SDK types lag the API. If your SDK version is newer and typed, delete the comment.
- `components/AgentPanel.tsx` — wagmi 2.x typing on `useSendTransaction` occasionally needs an explicit `account` when the config has multiple connectors. If the compiler complains, narrow to `useAccount().address`.

Both are ~5-minute fixes.

## 6. What to link in the outreach

Once steps 2 and 4 are done, the three links for your outreach + memo are:

- **Demo live:** `https://morpho-earn-agent.vercel.app` (or whatever Vercel gives you)
- **Repo:** `https://github.com/<your-username>/morpho-earn-agent`
- **Memo:** publish `morpho_devx_memo.md` as a Notion public page or host as a PDF on your own site. Don't use Google Drive — LinkedIn's link preview doesn't render it and Merlin's spam filter may flag it.
