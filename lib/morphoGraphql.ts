const MORPHO_API_URL =
  process.env.MORPHO_API_URL || "https://api.morpho.org/graphql";

type GqlResponse<T> = { data?: T; errors?: Array<{ message: string }> };

async function gql<T>(query: string, variables: Record<string, unknown>) {
  const res = await fetch(MORPHO_API_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`Morpho GraphQL HTTP ${res.status}`);
  const body = (await res.json()) as GqlResponse<T>;
  if (body.errors?.length) throw new Error(body.errors[0].message);
  if (!body.data) throw new Error("Empty GraphQL response");
  return body.data;
}

export type VaultSummary = {
  address: string;
  name: string;
  symbol: string;
  asset: { symbol: string; decimals: number; address: string };
  state: {
    totalAssetsUsd: number;
    netApy: number;
    fee: number;
    allocation: Array<{
      market: { uniqueKey: string; loanAsset: { symbol: string }; collateralAsset: { symbol: string } | null };
      supplyAssetsUsd: number;
    }> | null;
  };
  metadata: { curators: Array<{ name: string; verified: boolean }> } | null;
};

export async function getBaseUsdcVaults(): Promise<VaultSummary[]> {
  const query = /* GraphQL */ `
    query Vaults($where: VaultFilters) {
      vaults(
        first: 30
        orderBy: TotalAssetsUsd
        orderDirection: Desc
        where: $where
      ) {
        items {
          address
          name
          symbol
          asset { symbol decimals address }
          state {
            totalAssetsUsd
            netApy
            fee
            allocation {
              market { uniqueKey loanAsset { symbol } collateralAsset { symbol } }
              supplyAssetsUsd
            }
          }
          metadata { curators { name verified } }
        }
      }
    }
  `;

  // USDC on Base: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
  const data = await gql<{ vaults: { items: VaultSummary[] } }>(query, {
    where: {
      chainId_in: [8453],
      assetAddress_in: ["0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"],
    },
  });
  return data.vaults.items;
}

export type UserPosition = {
  vault: { address: string; name: string; symbol: string; asset: { symbol: string; decimals: number } };
  assets: string;
  assetsUsd: number;
};

export async function getUserVaultPositions(address: string): Promise<UserPosition[]> {
  const query = /* GraphQL */ `
    query User($address: String!) {
      userByAddress(address: $address, chainId: 8453) {
        vaultPositions {
          vault { address name symbol asset { symbol decimals } }
          assets
          assetsUsd
        }
      }
    }
  `;
  try {
    const data = await gql<{ userByAddress: { vaultPositions: UserPosition[] } | null }>(
      query,
      { address },
    );
    return data.userByAddress?.vaultPositions || [];
  } catch (e) {
    // Silently return empty if user has no positions yet.
    return [];
  }
}
