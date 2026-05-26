import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "./route";
import { refreshLiveLedger } from "@/lib/live-ledger/service";

vi.mock("@/lib/live-ledger/service", () => ({
  refreshLiveLedger: vi.fn(),
}));

const refreshLiveLedgerMock = vi.mocked(refreshLiveLedger);

describe("GET /api/epochs", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns live ledger data with a shared cache header matching the poll interval", async () => {
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
      "public, s-maxage=30, stale-while-revalidate=30",
    );
    await expect(response.json()).resolves.toEqual({
      headSlot: 96,
      fetchedAt: "2026-05-26T00:00:00.000Z",
      degradedRelays: [],
      epochs: [],
    });
  });
});
