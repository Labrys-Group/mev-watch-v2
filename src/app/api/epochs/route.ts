import { NextResponse } from "next/server";
import { getLiveEpochs } from "@/lib/epochs/get-live-epochs";

export const runtime = "nodejs";
// Always re-run the handler; freshness is bounded by the relay fetch cache
// (next: { revalidate: 15 }) inside getLiveEpochs.
export const dynamic = "force-dynamic";

export async function GET() {
  const data = await getLiveEpochs();
  return NextResponse.json(data, {
    headers: {
      "cache-control": "public, s-maxage=15, stale-while-revalidate=30",
    },
  });
}
