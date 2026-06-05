import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "./route";
import { refreshLiveLedger } from "@/lib/live-ledger/service";
import { LIVE_LEDGER_CACHE_SECONDS } from "@/lib/live-ledger/timing";

vi.mock("@/lib/live-ledger/service", () => ({
  refreshLiveLedger: vi.fn(),
}));

const refreshLiveLedgerMock = vi.mocked(refreshLiveLedger);

describe("GET /api/epochs", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns live ledger data with a shared cache header matching the configured cache ttl", async () => {
    refreshLiveLedgerMock.mockResolvedValue({
      wroteSnapshot: true,
      snapshot: {
        schemaVersion: 1,
        headSlot: 96,
        fetchedAt: "2026-05-26T00:00:00.000Z",
        degradedRelays: [],
        blocks: [],
      },
      data: {
        headSlot: 96,
        fetchedAt: "2026-05-26T00:00:00.000Z",
        degradedRelays: [],
        epochs: [],
      },
    });

    const response = await GET();

    expect(response.headers.get("cache-control")).toBe(
      `public, s-maxage=${LIVE_LEDGER_CACHE_SECONDS}, stale-while-revalidate=${LIVE_LEDGER_CACHE_SECONDS}`,
    );
    await expect(response.json()).resolves.toEqual({
      headSlot: 96,
      fetchedAt: "2026-05-26T00:00:00.000Z",
      degradedRelays: [],
      epochs: [],
    });
  });

  it("shares one in-flight refresh across concurrent requests", async () => {
    let resolveRefresh!: (
      value: Awaited<ReturnType<typeof refreshLiveLedger>>,
    ) => void;
    refreshLiveLedgerMock.mockReturnValue(
      new Promise((resolve) => {
        resolveRefresh = resolve;
      }),
    );

    const first = GET();
    const second = GET();

    expect(refreshLiveLedgerMock).toHaveBeenCalledTimes(1);

    resolveRefresh({
      wroteSnapshot: true,
      snapshot: {
        schemaVersion: 1,
        headSlot: 97,
        fetchedAt: "2026-05-26T00:00:12.000Z",
        degradedRelays: [],
        degradedSlotRanges: [],
        blocks: [],
      },
      data: {
        headSlot: 97,
        fetchedAt: "2026-05-26T00:00:12.000Z",
        degradedRelays: [],
        epochs: [],
      },
    });

    const [firstResponse, secondResponse] = await Promise.all([first, second]);

    await expect(firstResponse.json()).resolves.toMatchObject({ headSlot: 97 });
    await expect(secondResponse.json()).resolves.toMatchObject({ headSlot: 97 });
  });

  it("clears a failed in-flight refresh so a later request can retry", async () => {
    refreshLiveLedgerMock
      .mockRejectedValueOnce(new Error("relay timeout"))
      .mockResolvedValueOnce({
        wroteSnapshot: false,
        snapshot: {
          schemaVersion: 1,
          headSlot: 98,
          fetchedAt: "2026-05-26T00:00:24.000Z",
          degradedRelays: [],
          degradedSlotRanges: [],
          blocks: [],
        },
        data: {
          headSlot: 98,
          fetchedAt: "2026-05-26T00:00:24.000Z",
          degradedRelays: [],
          epochs: [],
        },
      });

    await expect(GET()).rejects.toThrow("relay timeout");

    const response = await GET();

    expect(refreshLiveLedgerMock).toHaveBeenCalledTimes(2);
    await expect(response.json()).resolves.toMatchObject({ headSlot: 98 });
  });
});
