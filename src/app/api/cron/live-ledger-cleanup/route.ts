import { createSnapshotStore } from "@/lib/live-ledger/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function isAuthorizedCronRequest(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const store = await createSnapshotStore();
  const result = await store.cleanupOldSnapshots();

  return Response.json({
    ok: true,
    deletedSnapshots: result.deletedSnapshots,
  });
}
