import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";

import { createBlobSnapshotStore } from "./store-blob";
import { createLocalSnapshotStore } from "./store-local";
import type { LiveLedgerSnapshot } from "./types";

async function withTempDir<T>(run: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(path.join(tmpdir(), "live-ledger-store-"));
  try {
    return await run(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

function snapshot(slot: number, fetchedAt: string): LiveLedgerSnapshot {
  return {
    schemaVersion: 1,
    headSlot: slot,
    fetchedAt,
    degradedRelays: [],
    blocks: [],
  };
}

function blobResult(snapshot: LiveLedgerSnapshot, etag: string) {
  return {
    statusCode: 200,
    stream: new Response(JSON.stringify(snapshot)).body,
    blob: { etag },
  };
}

describe("local live ledger snapshot store", () => {
  it("overwrites and reads a single latest snapshot", async () => {
    await withTempDir(async (dir) => {
      const store = createLocalSnapshotStore({ dir });

      await store.writeSnapshot(snapshot(1, "2026-05-26T00:00:00.000Z"));
      await store.writeSnapshot(snapshot(2, "2026-05-26T00:00:01.000Z"));
      await store.writeSnapshot(snapshot(3, "2026-05-26T00:00:02.000Z"));

      await expect(store.readLatestSnapshot()).resolves.toMatchObject({
        headSlot: 3,
      });
      await expect(store.writeSnapshot(snapshot(4, "2026-05-26T00:00:03.000Z"))).resolves.toBe(
        "latest.json",
      );
      await expect(store.readLatestSnapshot()).resolves.toMatchObject({
        headSlot: 4,
      });
    });
  });

  it("does not overwrite a newer latest snapshot with an older refresh", async () => {
    await withTempDir(async (dir) => {
      const store = createLocalSnapshotStore({ dir });

      await store.writeSnapshot(snapshot(20, "2026-05-26T00:00:20.000Z"));
      await expect(
        store.writeSnapshot(snapshot(10, "2026-05-26T00:00:10.000Z")),
      ).resolves.toBe("latest.json");

      await expect(store.readLatestSnapshot()).resolves.toMatchObject({
        headSlot: 20,
        fetchedAt: "2026-05-26T00:00:20.000Z",
      });
    });
  });
});

describe("blob live ledger snapshot store", () => {
  it("does not overwrite a newer latest snapshot with an older refresh", async () => {
    const getBlob = vi.fn(async () =>
      blobResult(snapshot(20, "2026-05-26T00:00:20.000Z"), "etag-newer"),
    );
    const putBlob = vi.fn();
    const store = createBlobSnapshotStore({
      getBlob,
      putBlob,
    });

    await expect(
      store.writeSnapshot(snapshot(10, "2026-05-26T00:00:10.000Z")),
    ).resolves.toBe("latest.json");

    expect(putBlob).not.toHaveBeenCalled();
  });

  it("rechecks latest when a conditional blob write loses a race", async () => {
    const staleSnapshot = snapshot(10, "2026-05-26T00:00:10.000Z");
    const newerSnapshot = snapshot(30, "2026-05-26T00:00:30.000Z");
    const preconditionFailed = new Error("etag changed");
    preconditionFailed.name = "BlobPreconditionFailedError";

    const getBlob = vi
      .fn()
      .mockResolvedValueOnce(blobResult(staleSnapshot, "etag-stale"))
      .mockResolvedValueOnce(blobResult(newerSnapshot, "etag-newer"));
    const putBlob = vi.fn(async () => {
      throw preconditionFailed;
    });
    const store = createBlobSnapshotStore({
      getBlob,
      putBlob,
    });

    await expect(
      store.writeSnapshot(snapshot(20, "2026-05-26T00:00:20.000Z")),
    ).resolves.toBe("latest.json");

    expect(putBlob).toHaveBeenCalledTimes(1);
  });

  it("rechecks latest when Vercel Blob reports a plain ETag mismatch error", async () => {
    const staleSnapshot = snapshot(10, "2026-05-26T00:00:10.000Z");
    const newerSnapshot = snapshot(30, "2026-05-26T00:00:30.000Z");
    const etagMismatch = new Error(
      "Vercel Blob: Precondition failed: ETag mismatch.",
    );

    const getBlob = vi
      .fn()
      .mockResolvedValueOnce(blobResult(staleSnapshot, "etag-stale"))
      .mockResolvedValueOnce(blobResult(newerSnapshot, "etag-newer"));
    const putBlob = vi.fn(async () => {
      throw etagMismatch;
    });
    const store = createBlobSnapshotStore({
      getBlob,
      putBlob,
    });

    await expect(
      store.writeSnapshot(snapshot(20, "2026-05-26T00:00:20.000Z")),
    ).resolves.toBe("latest.json");

    expect(getBlob).toHaveBeenCalledTimes(2);
    expect(putBlob).toHaveBeenCalledTimes(1);
  });
});
