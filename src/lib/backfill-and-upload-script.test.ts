import { promises as fs } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it, vi } from "vitest";
import {
  backfillAndUploadArtifact,
  readBackfillUploadConcurrency,
} from "../../scripts/backfill-and-upload";

describe("backfill-and-upload script", () => {
  it("creates a db from the seed, backfills it, and uploads the configured artifact", async () => {
    const mkdir = vi.fn().mockResolvedValue(undefined);
    const copyFile = vi.fn().mockResolvedValue(undefined);
    const updateDataFile = vi.fn().mockResolvedValue({
      changed: true,
      fetchedDates: ["2026-05-24", "2026-05-25"],
      snapshot: {
        schemaVersion: 1,
        generatedAt: "2026-05-26T00:00:00.000Z",
        sourceStartDate: "2022-09-15",
        sourceEndDate: "2026-05-25",
        days: [],
      },
    });
    const uploadBlobArtifact = vi.fn().mockResolvedValue({
      url: "https://blob.example/data/mev-watch.sqlite",
    });

    const result = await backfillAndUploadArtifact({
      seedFilePath: "/repo/src/data/mev-watch.sqlite",
      filePath: "/repo/data/mev-watch.db",
      blobPathname: "data/mev-watch.sqlite",
      concurrency: 3,
      writeEvery: 11,
      mkdir,
      copyFile,
      updateDataFile,
      uploadBlobArtifact,
    });

    expect(mkdir).toHaveBeenCalledWith("/repo/data", { recursive: true });
    expect(copyFile).toHaveBeenCalledWith(
      "/repo/src/data/mev-watch.sqlite",
      "/repo/data/mev-watch.db",
    );
    expect(updateDataFile).toHaveBeenCalledWith(
      expect.objectContaining({
        filePath: "/repo/data/mev-watch.db",
        concurrency: 3,
        writeEvery: 11,
      }),
    );
    expect(uploadBlobArtifact).toHaveBeenCalledWith({
      filePath: "/repo/data/mev-watch.db",
      pathname: "data/mev-watch.sqlite",
    });
    expect(result).toEqual({
      changed: true,
      fetchedDates: ["2026-05-24", "2026-05-25"],
      sourceEndDate: "2026-05-25",
      uploadedUrl: "https://blob.example/data/mev-watch.sqlite",
    });
  });

  it("keeps an existing backfill artifact so a failed run can resume", async () => {
    const dir = await fs.mkdtemp(path.join(tmpdir(), "backfill-and-upload-"));
    const seedFilePath = path.join(dir, "seed.sqlite");
    const filePath = path.join(dir, "mev-watch.sqlite");
    await fs.writeFile(seedFilePath, "seed data");
    await fs.writeFile(filePath, "partial backfill data");

    const updateDataFile = vi.fn().mockResolvedValue({
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
    const uploadBlobArtifact = vi.fn().mockResolvedValue({
      url: "https://blob.example/data/mev-watch.sqlite",
    });

    try {
      await backfillAndUploadArtifact({
        seedFilePath,
        filePath,
        blobPathname: "data/mev-watch.sqlite",
        updateDataFile,
        uploadBlobArtifact,
      });

      await expect(fs.readFile(filePath, "utf8")).resolves.toBe(
        "partial backfill data",
      );
      expect(updateDataFile).toHaveBeenCalledWith(
        expect.objectContaining({ filePath }),
      );
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  it("persists after every completed day by default", async () => {
    const updateDataFile = vi.fn().mockResolvedValue({
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
    const uploadBlobArtifact = vi.fn().mockResolvedValue({
      url: "https://blob.example/data/mev-watch.sqlite",
    });

    await backfillAndUploadArtifact({
      seedFilePath: "/repo/src/data/mev-watch.sqlite",
      filePath: "/repo/data/mev-watch.db",
      blobPathname: "data/mev-watch.sqlite",
      mkdir: vi.fn().mockResolvedValue(undefined),
      copyFile: vi.fn().mockResolvedValue(undefined),
      updateDataFile,
      uploadBlobArtifact,
    });

    expect(updateDataFile).toHaveBeenCalledWith(
      expect.objectContaining({ writeEvery: 1 }),
    );
  });

  it("falls back when UPDATE_DATA_CONCURRENCY is invalid", () => {
    expect(readBackfillUploadConcurrency({ UPDATE_DATA_CONCURRENCY: "nope" })).toBe(
      8,
    );
  });

  it("accepts positive integer UPDATE_DATA_CONCURRENCY values", () => {
    expect(readBackfillUploadConcurrency({ UPDATE_DATA_CONCURRENCY: "4.9" })).toBe(
      4,
    );
  });
});
