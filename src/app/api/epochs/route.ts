import { NextResponse } from "next/server";
import { getLiveEpochs } from "@/lib/epochs/get-live-epochs";
import { ingestRecentBlocks } from "@/lib/epochs/ingest";
import { RelayPayloadSource } from "@/lib/epochs/relay-payloads";
import { recentBlocksStore } from "@/lib/epochs/recent-blocks-store";

export const runtime = "nodejs";
// The handler always runs; freshness is bounded by the s-maxage CDN cache
// below and the 15s relay fetch-cache inside RelayPayloadSource.
export const dynamic = "force-dynamic";

export async function GET() {
  const { relaysOk, relaysTotal } = await ingestRecentBlocks(
    new RelayPayloadSource(),
    recentBlocksStore,
  );
  const data = await getLiveEpochs(recentBlocksStore);

  return NextResponse.json(
    { ...data, relaysOk, relaysTotal },
    {
      headers: {
        "access-control-allow-origin": "*",
        "cache-control": "public, s-maxage=20, stale-while-revalidate=40",
      },
    },
  );
}
