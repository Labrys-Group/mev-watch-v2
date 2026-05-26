import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promises as fs } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  REFRESH_LOCK_TTL_MS,
  acquireRefreshLock,
  clearArtifactPathCache,
  downloadBlobArtifact,
  getMevWatchLockPathname,
  resolveReadableArtifactPath,
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

function byteStream(value: string): ReadableStream<Uint8Array> {
  return new Response(value).body as ReadableStream<Uint8Array>;
}

afterEach(() => {
  clearArtifactPathCache();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("Vercel Blob data artifact cache", () => {
  it("retries a Blob download after an earlier cache miss failed", async () => {
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "token");
    const dir = await mkdtemp(path.join(tmpdir(), "mev-watch-blob-"));
    const filePath = path.join(dir, "mev-watch.sqlite");
    const getBlob = vi
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        statusCode: 200,
        stream: byteStream("sqlite-bytes"),
        blob: { contentType: "application/vnd.sqlite3" },
      });

    try {
      await expect(
        resolveReadableArtifactPath({ filePath, getBlob }),
      ).rejects.toThrow("Blob data artifact not found");

      await expect(resolveReadableArtifactPath({ filePath, getBlob })).resolves.toBe(
        filePath,
      );
      await expect(readFile(filePath, "utf8")).resolves.toBe("sqlite-bytes");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("replaces the cached SQLite file with an atomic rename", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "mev-watch-blob-"));
    const filePath = path.join(dir, "mev-watch.sqlite");
    const renameSpy = vi.spyOn(fs, "rename");
    const getBlob = vi.fn(async () => ({
      statusCode: 200,
      stream: byteStream("new-sqlite-bytes"),
      blob: { contentType: "application/vnd.sqlite3" },
    }));

    try {
      await downloadBlobArtifact({ filePath, getBlob });

      expect(renameSpy).toHaveBeenCalledWith(
        expect.stringMatching(/mev-watch\.sqlite\./),
        filePath,
      );
      await expect(readFile(filePath, "utf8")).resolves.toBe("new-sqlite-bytes");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

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
