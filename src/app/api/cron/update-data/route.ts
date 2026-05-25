import { updateDataFile } from "@/lib/mev-watch-generator";
import {
  acquireRefreshLock,
  prepareWritableArtifactPath,
  releaseRefreshLock,
  uploadBlobArtifact,
} from "@/lib/mev-watch-blob";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export function isAuthorizedCronRequest(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const lock = await acquireRefreshLock();
  if (!lock.acquired) {
    return Response.json({
      ok: true,
      skipped: true,
      reason: lock.reason,
    });
  }

  try {
    const filePath = await prepareWritableArtifactPath();
    const result = await updateDataFile({
      filePath,
      concurrency: Number(process.env.UPDATE_DATA_CONCURRENCY ?? 4),
      writeEvery: 1,
      onProgress: ({ date, index, total }) => {
        console.log(`[${index}/${total}] fetched ${date}`);
      },
    });

    if (result.changed) {
      await uploadBlobArtifact({ filePath });
    }

    return Response.json({
      ok: true,
      changed: result.changed,
      fetchedDates: result.fetchedDates,
      sourceEndDate: result.snapshot.sourceEndDate,
    });
  } finally {
    await releaseRefreshLock(lock);
  }
}
