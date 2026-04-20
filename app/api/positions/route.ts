import { NextRequest, NextResponse } from "next/server";
import { getUserVaultPositions } from "@/lib/morphoGraphql";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address");
  if (!address) {
    return NextResponse.json({ error: "address required" }, { status: 400 });
  }
  try {
    const positions = await getUserVaultPositions(address);
    return NextResponse.json({ positions });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
