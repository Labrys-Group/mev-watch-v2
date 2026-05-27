import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
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

function blobResult(snapshot: LiveLedgerSnapshot, etag = "etag") {
  return {
    statusCode: 200,
    stream: new Response(JSON.stringify(snapshot)).body,
    blob: { etag },
  };
}

describe("local live ledger snapshot store", () => {
  it("writes timestamped snapshots instead of latest.json", async () => {
    await withTempDir(async (dir) => {
      const store = createLocalSnapshotStore({ dir });

      const name = await store.writeSnapshot(
        snapshot(1, "2026-05-26T00:00:00.123Z"),
      );

      expect(name).toMatch(
        /^2026-05-26T00-00-00-123Z-head-1-[a-f0-9-]+\.json$/,
      );
      expect(name).not.toBe("latest.json");
      await expect(readdir(dir)).resolves.toEqual([name]);
      await expect(store.readLatestSnapshot()).resolves.toMatchObject({
        headSlot: 1,
      });
    });
  });

  it("reads the newest timestamped snapshot by fetchedAt with head slot as a tie-breaker", async () => {
    await withTempDir(async (dir) => {
      const store = createLocalSnapshotStore({ dir });

      await store.writeSnapshot(snapshot(20, "2026-05-26T00:00:20.000Z"));
      await store.writeSnapshot(snapshot(30, "2026-05-26T00:00:20.000Z"));
      await store.writeSnapshot(snapshot(10, "2026-05-26T00:00:10.000Z"));

      await expect(store.readLatestSnapshot()).resolves.toMatchObject({
        headSlot: 30,
        fetchedAt: "2026-05-26T00:00:20.000Z",
      });
    });
  });

  it("uses distinct names for same-millisecond writes", async () => {
    await withTempDir(async (dir) => {
      const store = createLocalSnapshotStore({ dir });
      const first = snapshot(10, "2026-05-26T00:00:10.000Z");
      const second = snapshot(11, "2026-05-26T00:00:10.000Z");

      const names = await Promise.all([
        store.writeSnapshot(first),
        store.writeSnapshot(second),
      ]);

      expect(new Set(names).size).toBe(2);
      expect(names).not.toContain("latest.json");
      await expect(readdir(dir)).resolves.toEqual(expect.arrayContaining(names));
      await expect(store.readLatestSnapshot()).resolves.toMatchObject({
        headSlot: 11,
      });
    });
  });

  it("reads legacy latest.json only when no timestamped snapshots exist", async () => {
    await withTempDir(async (dir) => {
      const store = createLocalSnapshotStore({ dir });
      await writeFile(
        path.join(dir, "latest.json"),
        JSON.stringify(snapshot(99, "2026-05-26T00:00:99.000Z")),
        "utf8",
      );

      await expect(store.readLatestSnapshot()).resolves.toMatchObject({
        headSlot: 99,
      });

      await store.writeSnapshot(snapshot(100, "2026-05-26T00:01:00.000Z"));

      await expect(store.readLatestSnapshot()).resolves.toMatchObject({
        headSlot: 100,
      });
      await expect(readdir(dir)).resolves.toContain("latest.json");
    });
  });

  it("does not prune old snapshots during request-time writes", async () => {
    await withTempDir(async (dir) => {
      const store = createLocalSnapshotStore({ dir });

      for (let slot = 0; slot < 12; slot += 1) {
        await store.writeSnapshot(
          snapshot(slot, `2026-05-26T00:00:${String(slot).padStart(2, "0")}.000Z`),
        );
      }

      const files = await readdir(dir);
      expect(files).toHaveLength(12);
      await expect(store.readLatestSnapshot()).resolves.toMatchObject({
        headSlot: 11,
      });
    });
  });

  it("prunes old snapshots when cleanup runs explicitly", async () => {
    await withTempDir(async (dir) => {
      const store = createLocalSnapshotStore({ dir });

      for (let slot = 0; slot < 12; slot += 1) {
        await store.writeSnapshot(
          snapshot(slot, `2026-05-26T00:00:${String(slot).padStart(2, "0")}.000Z`),
        );
      }

      await expect(store.cleanupOldSnapshots()).resolves.toEqual({
        deletedSnapshots: 2,
      });

      const files = await readdir(dir);
      expect(files).toHaveLength(10);
      await expect(store.readLatestSnapshot()).resolves.toMatchObject({
        headSlot: 11,
      });
    });
  });
});

describe("blob live ledger snapshot store", () => {
  it("writes timestamped blob paths without conditional latest.json options", async () => {
    const listBlob = vi.fn(async () => ({ blobs: [], hasMore: false }));
    const getBlob = vi.fn(async () => null);
    const putBlob = vi.fn(async () => ({ pathname: "unused" }));
    const delBlob = vi.fn();
    const store = createBlobSnapshotStore({
      getBlob,
      putBlob,
      listBlob,
      delBlob,
    } as never);

    const name = await store.writeSnapshot(
      snapshot(10, "2026-05-26T00:00:10.123Z"),
    );

    expect(name).toMatch(
      /^2026-05-26T00-00-10-123Z-head-10-[a-f0-9-]+\.json$/,
    );
    expect(putBlob).toHaveBeenCalledWith(
      `data/live-ledger/${name}`,
      expect.any(String),
      expect.not.objectContaining({ ifMatch: expect.any(String) }),
    );
    expect(putBlob).toHaveBeenCalledWith(
      expect.not.stringContaining("latest.json"),
      expect.any(String),
      expect.objectContaining({ allowOverwrite: false }),
    );
  });

  it("uses distinct blob names for repeated same-millisecond writes", async () => {
    const listBlob = vi.fn(async () => ({ blobs: [], hasMore: false }));
    const getBlob = vi.fn(async () => null);
    const putBlob = vi.fn(async () => ({ pathname: "unused" }));
    const store = createBlobSnapshotStore({
      getBlob,
      putBlob,
      listBlob,
      delBlob: vi.fn(),
    } as never);

    const names = await Promise.all([
      store.writeSnapshot(snapshot(20, "2026-05-26T00:00:20.000Z")),
      store.writeSnapshot(snapshot(21, "2026-05-26T00:00:20.000Z")),
    ]);

    expect(new Set(names).size).toBe(2);
    expect(names).not.toContain("latest.json");
    expect(putBlob).toHaveBeenCalledTimes(2);
    const putBlobCalls = putBlob.mock.calls as unknown as Array<
      [string, unknown, Record<string, unknown>]
    >;
    for (const call of putBlobCalls) {
      expect(call[0]).not.toContain("latest.json");
      expect(call[2]).not.toHaveProperty("ifMatch");
    }
  });

  it("reads only the newest timestamped blob selected by timestamp and numeric head slot", async () => {
    const olderPath =
      "data/live-ledger/2026-05-26T00-00-09-000Z-head-999-aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa.json";
    const lexicalHeadSlotTrapPath =
      "data/live-ledger/2026-05-26T00-00-10-000Z-head-99-bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb.json";
    const newerPath =
      "data/live-ledger/2026-05-26T00-00-10-000Z-head-100-cccccccc-cccc-4ccc-cccc-cccccccccccc.json";
    const listBlob = vi.fn(async () => ({
      blobs: [
        { pathname: olderPath, uploadedAt: new Date(), size: 1 },
        { pathname: lexicalHeadSlotTrapPath, uploadedAt: new Date(), size: 1 },
        { pathname: newerPath, uploadedAt: new Date(), size: 1 },
      ],
      hasMore: false,
    }));
    const getBlob = vi.fn(async (pathname: string) => {
      if (pathname === olderPath) {
        return blobResult(snapshot(10, "2026-05-26T00:00:10.000Z"));
      }
      if (pathname === lexicalHeadSlotTrapPath) {
        return blobResult(snapshot(99, "2026-05-26T00:00:10.000Z"));
      }
      if (pathname === newerPath) {
        return blobResult(snapshot(100, "2026-05-26T00:00:10.000Z"));
      }
      return null;
    });
    const store = createBlobSnapshotStore({
      getBlob,
      putBlob: vi.fn(),
      listBlob,
      delBlob: vi.fn(),
    } as never);

    await expect(store.readLatestSnapshot()).resolves.toMatchObject({
      headSlot: 100,
    });

    expect(listBlob).toHaveBeenCalledWith({
      prefix: "data/live-ledger/",
      limit: 1000,
    });
    expect(getBlob).toHaveBeenCalledTimes(1);
    expect(getBlob).toHaveBeenCalledWith(newerPath, {
      access: "private",
      useCache: false,
    });
    expect(getBlob).not.toHaveBeenCalledWith(
      "data/live-ledger/latest.json",
      expect.anything(),
    );
  });

  it("falls back to legacy latest.json only when no timestamped blobs exist", async () => {
    const listBlob = vi.fn(async () => ({ blobs: [], hasMore: false }));
    const getBlob = vi.fn(async (pathname: string) => {
      if (pathname === "data/live-ledger/latest.json") {
        return blobResult(snapshot(99, "2026-05-26T00:00:99.000Z"));
      }
      return null;
    });
    const store = createBlobSnapshotStore({
      getBlob,
      putBlob: vi.fn(),
      listBlob,
      delBlob: vi.fn(),
    } as never);

    await expect(store.readLatestSnapshot()).resolves.toMatchObject({
      headSlot: 99,
    });

    expect(getBlob).toHaveBeenCalledWith("data/live-ledger/latest.json", {
      access: "private",
      useCache: false,
    });
  });

  it("does not prune old blobs during request-time writes", async () => {
    const listBlob = vi.fn(async () => ({ blobs: [], hasMore: false }));
    const delBlob = vi.fn();
    const store = createBlobSnapshotStore({
      getBlob: vi.fn(async () => null),
      putBlob: vi.fn(async () => ({ pathname: "unused" })),
      listBlob,
      delBlob,
    } as never);

    await store.writeSnapshot(snapshot(20, "2026-05-26T00:00:20.000Z"));

    expect(listBlob).not.toHaveBeenCalled();
    expect(delBlob).not.toHaveBeenCalled();
  });

  it("prunes old blobs when cleanup runs explicitly", async () => {
    const snapshots = Array.from({ length: 12 }, (_, slot) => ({
      pathname: `data/live-ledger/${slot}.json`,
      snapshot: snapshot(
        slot,
        `2026-05-26T00:00:${String(slot).padStart(2, "0")}.000Z`,
      ),
    }));
    const listBlob = vi.fn(async () => ({
      blobs: snapshots.map(({ pathname }) => ({
        pathname,
        uploadedAt: new Date(),
        size: 1,
      })),
      hasMore: false,
    }));
    const getBlob = vi.fn(async (pathname: string) => {
      const found = snapshots.find((entry) => entry.pathname === pathname);
      return found ? blobResult(found.snapshot) : null;
    });
    const delBlob = vi.fn();
    const store = createBlobSnapshotStore({
      getBlob,
      putBlob: vi.fn(async () => ({ pathname: "unused" })),
      listBlob,
      delBlob,
    } as never);

    await expect(store.cleanupOldSnapshots()).resolves.toEqual({
      deletedSnapshots: 2,
    });

    expect(delBlob).toHaveBeenCalledTimes(2);
    expect(delBlob).toHaveBeenCalledWith("data/live-ledger/0.json");
    expect(delBlob).toHaveBeenCalledWith("data/live-ledger/1.json");
  });
});
