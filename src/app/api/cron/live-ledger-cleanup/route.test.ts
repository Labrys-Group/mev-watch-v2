import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createSnapshotStore } from "@/lib/live-ledger/store";
import { GET, isAuthorizedCronRequest } from "./route";

vi.mock("@/lib/live-ledger/store", () => ({
  createSnapshotStore: vi.fn(),
}));

const createSnapshotStoreMock = vi.mocked(createSnapshotStore);

function authorizedRequest() {
  vi.stubEnv("CRON_SECRET", "s3cret");
  return new Request("https://mevwatch.info/api/cron/live-ledger-cleanup", {
    headers: { authorization: "Bearer s3cret" },
  });
}

describe("Vercel live ledger cleanup cron route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects requests when CRON_SECRET is not configured", () => {
    vi.stubEnv("CRON_SECRET", "");

    const request = new Request(
      "https://mevwatch.info/api/cron/live-ledger-cleanup",
      {
        headers: { authorization: "Bearer anything" },
      },
    );

    expect(isAuthorizedCronRequest(request)).toBe(false);
  });

  it("runs live ledger cleanup for authorized cron requests", async () => {
    const cleanupOldSnapshots = vi.fn(async () => ({ deletedSnapshots: 2 }));
    createSnapshotStoreMock.mockResolvedValue({
      readLatestSnapshot: vi.fn(),
      readNewestArchivedSnapshot: vi.fn(),
      writeSnapshot: vi.fn(),
      cleanupOldSnapshots,
    });

    const response = await GET(authorizedRequest());

    expect(response.status).toBe(200);
    expect(cleanupOldSnapshots).toHaveBeenCalledTimes(1);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      deletedSnapshots: 2,
    });
  });

  it("does not create a snapshot store for unauthorized requests", async () => {
    vi.stubEnv("CRON_SECRET", "s3cret");

    const response = await GET(
      new Request("https://mevwatch.info/api/cron/live-ledger-cleanup", {
        headers: { authorization: "Bearer wrong" },
      }),
    );

    expect(response.status).toBe(401);
    expect(createSnapshotStoreMock).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "Unauthorized",
    });
  });
});
