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

const DEFAULT_CRON_MAX_DAYS = 30;
const DEFAULT_CRON_WRITE_EVERY = 1;

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
    let uploadedPersistedProgress = false;
    const result = await updateDataFile({
      filePath,
      concurrency: readPositiveIntegerEnv("UPDATE_DATA_CONCURRENCY", 4),
      maxDays: readPositiveIntegerEnv(
        "UPDATE_DATA_MAX_DAYS",
        DEFAULT_CRON_MAX_DAYS,
      ),
      writeEvery: readPositiveIntegerEnv(
        "UPDATE_DATA_WRITE_EVERY",
        DEFAULT_CRON_WRITE_EVERY,
      ),
      onProgress: ({ date, index, total }) => {
        console.log(`[${index}/${total}] fetched ${date}`);
      },
      onPersist: async ({ persistedDates, sourceEndDate }) => {
        await uploadBlobArtifact({ filePath });
        uploadedPersistedProgress = true;
        console.log(
          `uploaded data artifact through ${sourceEndDate} (${persistedDates.length} day(s))`,
        );
      },
    });

    if (result.changed && !uploadedPersistedProgress) {
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

function readPositiveIntegerEnv(name: string, fallback: number): number {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isFinite(value) || value < 1) return fallback;
  return Math.floor(value);
}
