import { describe, expect, it, vi } from "vitest";
import {
  REFRESH_LOCK_TTL_MS,
  acquireRefreshLock,
  getMevWatchLockPathname,
  releaseRefreshLock,
} from "./mev-watch-blob";

class BlobNotFoundError extends Error {
  constructor() {
    super("not found");
    this.name = "BlobNotFoundError";
  }
}

class BlobPreconditionFailedError extends Error {
  constructor() {
    super("precondition failed");
    this.name = "BlobPreconditionFailedError";
  }
}

function jsonStream(value: unknown): ReadableStream<Uint8Array> {
  return new Response(JSON.stringify(value)).body as ReadableStream<Uint8Array>;
}

describe("Vercel Blob refresh lock", () => {
  it("uses the SQLite artifact pathname as the lock namespace", () => {
    expect(getMevWatchLockPathname("data/mev-watch.sqlite")).toBe(
      "data/mev-watch.sqlite.lock",
    );
  });

  it("acquires a lock when no lock object exists", async () => {
    const now = new Date("2026-05-26T00:00:00.000Z");
    const headBlob = vi.fn(async () => {
      throw new BlobNotFoundError();
    });
    const putBlob = vi.fn(async () => ({ etag: "new-lock-etag" }));

    const lock = await acquireRefreshLock({
      artifactPathname: "data/mev-watch.sqlite",
      now,
      runId: "run-1",
      headBlob,
      putBlob,
    });

    expect(lock).toMatchObject({
      acquired: true,
      lockPathname: "data/mev-watch.sqlite.lock",
      etag: "new-lock-etag",
      runId: "run-1",
    });
    expect(putBlob).toHaveBeenCalledWith(
      "data/mev-watch.sqlite.lock",
      JSON.stringify({
        runId: "run-1",
        artifactPathname: "data/mev-watch.sqlite",
        acquiredAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + REFRESH_LOCK_TTL_MS).toISOString(),
      }),
      expect.objectContaining({
        access: "private",
        allowOverwrite: false,
        contentType: "application/json",
      }),
    );
  });

  it("refuses to acquire when an unexpired lock exists", async () => {
    const now = new Date("2026-05-26T00:00:00.000Z");
    const headBlob = vi.fn(async () => ({ etag: "existing-etag" }));
    const getBlob = vi.fn(async () => ({
      statusCode: 200,
      stream: jsonStream({
        runId: "existing-run",
        artifactPathname: "data/mev-watch.sqlite",
        acquiredAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + 60_000).toISOString(),
      }),
    }));
    const putBlob = vi.fn();

    await expect(
      acquireRefreshLock({
        artifactPathname: "data/mev-watch.sqlite",
        now,
        runId: "run-2",
        headBlob,
        getBlob,
        putBlob,
      }),
    ).resolves.toEqual({
      acquired: false,
      reason: "refresh_locked",
      lockPathname: "data/mev-watch.sqlite.lock",
    });
    expect(putBlob).not.toHaveBeenCalled();
  });

  it("deletes an expired lock with ifMatch before acquiring", async () => {
    const now = new Date("2026-05-26T00:15:01.000Z");
    const headBlob = vi.fn(async () => ({ etag: "stale-etag" }));
    const getBlob = vi.fn(async () => ({
      statusCode: 200,
      stream: jsonStream({
        runId: "stale-run",
        artifactPathname: "data/mev-watch.sqlite",
        acquiredAt: "2026-05-26T00:00:00.000Z",
        expiresAt: "2026-05-26T00:15:00.000Z",
      }),
    }));
    const delBlob = vi.fn(async () => undefined);
    const putBlob = vi.fn(async () => ({ etag: "fresh-etag" }));

    const lock = await acquireRefreshLock({
      artifactPathname: "data/mev-watch.sqlite",
      now,
      runId: "run-3",
      headBlob,
      getBlob,
      delBlob,
      putBlob,
    });

    expect(lock).toMatchObject({ acquired: true, etag: "fresh-etag" });
    expect(delBlob).toHaveBeenCalledWith("data/mev-watch.sqlite.lock", {
      ifMatch: "stale-etag",
    });
  });

  it("treats stale-lock delete races as not acquired", async () => {
    const now = new Date("2026-05-26T00:15:01.000Z");
    const headBlob = vi.fn(async () => ({ etag: "stale-etag" }));
    const getBlob = vi.fn(async () => ({
      statusCode: 200,
      stream: jsonStream({
        runId: "stale-run",
        artifactPathname: "data/mev-watch.sqlite",
        acquiredAt: "2026-05-26T00:00:00.000Z",
        expiresAt: "2026-05-26T00:15:00.000Z",
      }),
    }));
    const delBlob = vi.fn(async () => {
      throw new BlobPreconditionFailedError();
    });
    const putBlob = vi.fn();

    await expect(
      acquireRefreshLock({
        artifactPathname: "data/mev-watch.sqlite",
        now,
        runId: "run-4",
        headBlob,
        getBlob,
        delBlob,
        putBlob,
      }),
    ).resolves.toEqual({
      acquired: false,
      reason: "refresh_locked",
      lockPathname: "data/mev-watch.sqlite.lock",
    });
    expect(putBlob).not.toHaveBeenCalled();
  });

  it("releases only the acquired lock etag and ignores stale release races", async () => {
    const delBlob = vi.fn(async () => {
      throw new BlobPreconditionFailedError();
    });

    await expect(
      releaseRefreshLock(
        {
          acquired: true,
          lockPathname: "data/mev-watch.sqlite.lock",
          etag: "owned-etag",
          runId: "run-5",
        },
        { delBlob },
      ),
    ).resolves.toBeUndefined();

    expect(delBlob).toHaveBeenCalledWith("data/mev-watch.sqlite.lock", {
      ifMatch: "owned-etag",
    });
  });
});
