import { refreshLiveLedger } from "@/lib/live-ledger/service";
import { LIVE_LEDGER_CACHE_SECONDS } from "@/lib/live-ledger/timing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CACHE_CONTROL = `public, s-maxage=${LIVE_LEDGER_CACHE_SECONDS}, stale-while-revalidate=${LIVE_LEDGER_CACHE_SECONDS}`;

type LiveLedgerRefreshResult = Awaited<ReturnType<typeof refreshLiveLedger>>;

let inFlightRefresh: Promise<LiveLedgerRefreshResult> | null = null;

function getLiveLedgerRefresh(): Promise<LiveLedgerRefreshResult> {
  inFlightRefresh ??= refreshLiveLedger().finally(() => {
    inFlightRefresh = null;
  });
  return inFlightRefresh;
}

export async function GET() {
  const { data } = await getLiveLedgerRefresh();
  return Response.json(data, {
    headers: {
      "cache-control": CACHE_CONTROL,
    },
  });
}
