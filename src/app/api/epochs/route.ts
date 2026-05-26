import { refreshLiveLedger } from "@/lib/live-ledger/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CACHE_CONTROL = "public, s-maxage=15, stale-while-revalidate=30";

export async function GET() {
  const { data } = await refreshLiveLedger();
  return Response.json(data, {
    headers: {
      "cache-control": CACHE_CONTROL,
    },
  });
}
