import { describe, expect, it, vi } from "vitest";

import { createBlobSnapshotStore } from "./store-blob";
import type { LiveLedgerSnapshot } from "./types";

function jsonStream(value: unknown): ReadableStream<Uint8Array> {
  return new Response(JSON.stringify(value)).body as ReadableStream<Uint8Array>;
}

function blobName(fetchedAt: string, headSlot: number, suffix: string): string {
  return `${fetchedAt.replace(/[:.]/g, "-")}-head-${headSlot}-${suffix}.json`;
}

describe("Blob live-ledger snapshot store", () => {
  it("skips a malformed newest timestamped snapshot and reads the next valid one", async () => {
    const newerName = blobName(
      "2026-05-26T00:02:00.000Z",
      102,
      "00000000-0000-4000-8000-000000000002",
    );
    const olderName = blobName(
      "2026-05-26T00:01:00.000Z",
      101,
      "00000000-0000-4000-8000-000000000001",
    );
    const validSnapshot: LiveLedgerSnapshot = {
      schemaVersion: 1,
      headSlot: 101,
      fetchedAt: "2026-05-26T00:01:00.000Z",
      degradedRelays: [],
      blocks: [],
    };
    const getBlob = vi.fn(async (pathname: string) => {
      if (pathname.endsWith(newerName)) {
        return {
          statusCode: 200,
          stream: jsonStream({ schemaVersion: 1, headSlot: "bad" }),
        };
      }
      if (pathname.endsWith(olderName)) {
        return {
          statusCode: 200,
          stream: jsonStream(validSnapshot),
        };
      }
      return null;
    });
    const store = createBlobSnapshotStore({
      prefix: "data/live-ledger/",
      getBlob,
      listBlob: vi.fn(async () => ({
        blobs: [
          { pathname: `data/live-ledger/${newerName}` },
          { pathname: `data/live-ledger/${olderName}` },
        ],
        hasMore: false,
      })),
    });

    await expect(store.readLatestSnapshot()).resolves.toEqual(validSnapshot);
    expect(getBlob).toHaveBeenCalledWith(
      `data/live-ledger/${newerName}`,
      expect.objectContaining({ useCache: false }),
    );
    expect(getBlob).toHaveBeenCalledWith(
      `data/live-ledger/${olderName}`,
      expect.objectContaining({ useCache: false }),
    );
  });
});
