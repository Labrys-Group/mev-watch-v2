import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET, isAuthorizedCronRequest } from "./route";
import { updateDataFile } from "@/lib/mev-watch-generator";
import {
  acquireRefreshLock,
  prepareWritableArtifactPath,
  releaseRefreshLock,
  uploadBlobArtifact,
} from "@/lib/mev-watch-blob";

vi.mock("@/lib/mev-watch-generator", () => ({
  updateDataFile: vi.fn(),
}));

vi.mock("@/lib/mev-watch-blob", () => ({
  acquireRefreshLock: vi.fn(),
  prepareWritableArtifactPath: vi.fn(),
  releaseRefreshLock: vi.fn(),
  uploadBlobArtifact: vi.fn(),
}));

const updateDataFileMock = vi.mocked(updateDataFile);
const acquireRefreshLockMock = vi.mocked(acquireRefreshLock);
const prepareWritableArtifactPathMock = vi.mocked(prepareWritableArtifactPath);
const releaseRefreshLockMock = vi.mocked(releaseRefreshLock);
const uploadBlobArtifactMock = vi.mocked(uploadBlobArtifact);

function authorizedRequest() {
  vi.stubEnv("CRON_SECRET", "s3cret");
  return new Request("https://mevwatch.info/api/cron/update-data", {
    headers: { authorization: "Bearer s3cret" },
  });
}

describe("Vercel data cron route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects requests when CRON_SECRET is not configured", () => {
    vi.stubEnv("CRON_SECRET", "");

    const request = new Request("https://mevwatch.info/api/cron/update-data", {
      headers: { authorization: "Bearer anything" },
    });

    expect(isAuthorizedCronRequest(request)).toBe(false);
  });

  it("accepts Vercel cron requests with the configured bearer secret", () => {
    vi.stubEnv("CRON_SECRET", "s3cret");

    const request = new Request("https://mevwatch.info/api/cron/update-data", {
      headers: { authorization: "Bearer s3cret" },
    });

    expect(isAuthorizedCronRequest(request)).toBe(true);
  });

  it("returns 200 skipped when another refresh owns the lock", async () => {
    acquireRefreshLockMock.mockResolvedValue({
      acquired: false,
      reason: "refresh_locked",
      lockPathname: "data/mev-watch.sqlite.lock",
    });

    const response = await GET(authorizedRequest());

    await expect(response.json()).resolves.toEqual({
      ok: true,
      skipped: true,
      reason: "refresh_locked",
    });
    expect(response.status).toBe(200);
    expect(prepareWritableArtifactPathMock).not.toHaveBeenCalled();
    expect(updateDataFileMock).not.toHaveBeenCalled();
  });

  it("releases the acquired lock after a successful refresh", async () => {
    const lock = {
      acquired: true,
      lockPathname: "data/mev-watch.sqlite.lock",
      etag: "lock-etag",
      runId: "run-1",
    } as const;
    acquireRefreshLockMock.mockResolvedValue(lock);
    prepareWritableArtifactPathMock.mockResolvedValue("/tmp/mev-watch.sqlite");
    updateDataFileMock.mockResolvedValue({
      changed: true,
      fetchedDates: ["2026-05-25"],
      snapshot: {
        schemaVersion: 1,
        generatedAt: "2026-05-26T00:00:00.000Z",
        sourceStartDate: "2022-09-15",
        sourceEndDate: "2026-05-25",
        days: [],
      },
    });

    const response = await GET(authorizedRequest());

    expect(response.status).toBe(200);
    expect(uploadBlobArtifactMock).toHaveBeenCalledWith({
      filePath: "/tmp/mev-watch.sqlite",
    });
    expect(releaseRefreshLockMock).toHaveBeenCalledWith(lock);
  });

  it("releases the acquired lock when refresh fails", async () => {
    const lock = {
      acquired: true,
      lockPathname: "data/mev-watch.sqlite.lock",
      etag: "lock-etag",
      runId: "run-2",
    } as const;
    acquireRefreshLockMock.mockResolvedValue(lock);
    prepareWritableArtifactPathMock.mockResolvedValue("/tmp/mev-watch.sqlite");
    updateDataFileMock.mockRejectedValue(new Error("upstream failed"));

    await expect(GET(authorizedRequest())).rejects.toThrow("upstream failed");
    expect(releaseRefreshLockMock).toHaveBeenCalledWith(lock);
  });
});
