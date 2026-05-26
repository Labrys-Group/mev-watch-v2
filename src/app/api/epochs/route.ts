import { refreshLiveLedger } from "@/lib/live-ledger/service";
import { LIVE_LEDGER_CACHE_SECONDS } from "@/lib/live-ledger/timing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CACHE_CONTROL = `public, s-maxage=${LIVE_LEDGER_CACHE_SECONDS}, stale-while-revalidate=${LIVE_LEDGER_CACHE_SECONDS}`;

export async function GET() {
  const { data } = await refreshLiveLedger();
  return Response.json(data, {
    headers: {
      "cache-control": CACHE_CONTROL,
    },
  });
}
