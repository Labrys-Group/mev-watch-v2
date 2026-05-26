import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  appendSnapshotDays,
  buildDateRange,
  fetchMevWatchDay,
  fetchRelayscanDay,
  mergeSnapshotDays,
  nextMissingStartDate,
  readSnapshot,
  updateDataFile,
  type MevWatchSnapshot,
} from "./mev-watch-generator";

const EMPTY: MevWatchSnapshot = {
  schemaVersion: 1,
  generatedAt: "2026-05-25T00:00:00.000Z",
  sourceStartDate: "2022-09-15",
  sourceEndDate: null,
  days: [],
};

async function seedSqliteSnapshot(filePath: string): Promise<void> {
  await appendSnapshotDays(
    {
      ...EMPTY,
      sourceEndDate: "2022-09-15",
      days: [
        {
          date: "2022-09-15",
          relays: [],
          builders: [],
          totalChainBlocks: 0,
        },
      ],
    },
    filePath,
  );
}

describe("MEV Watch data generator planning helpers", () => {
  it("starts from the merge date when no snapshot days exist", () => {
    expect(nextMissingStartDate(EMPTY)).toBe("2022-09-15");
  });

  it("continues from the day after sourceEndDate", () => {
    expect(
      nextMissingStartDate({
        ...EMPTY,
        sourceEndDate: "2026-05-20",
        days: [{ date: "2026-05-20", relays: [], builders: [], totalChainBlocks: 0 }],
      }),
    ).toBe("2026-05-21");
  });

  it("builds an inclusive date range", () => {
    expect(buildDateRange("2026-05-20", "2026-05-22")).toEqual([
      "2026-05-20",
      "2026-05-21",
      "2026-05-22",
    ]);
  });

  it("merges days deterministically and updates source bounds", () => {
    const merged = mergeSnapshotDays(
      {
        ...EMPTY,
        sourceEndDate: "2026-05-20",
        days: [
          { date: "2026-05-20", relays: [], builders: [], totalChainBlocks: 1 },
        ],
      },
      [
        { date: "2026-05-19", relays: [], builders: [], totalChainBlocks: 2 },
        { date: "2026-05-21", relays: [], builders: [], totalChainBlocks: 3 },
      ],
      "2026-05-25T03:30:00.000Z",
    );

    expect(merged).toEqual({
      schemaVersion: 1,
      generatedAt: "2026-05-25T03:30:00.000Z",
      sourceStartDate: "2026-05-19",
      sourceEndDate: "2026-05-21",
      days: [
        { date: "2026-05-19", relays: [], builders: [], totalChainBlocks: 2 },
        { date: "2026-05-20", relays: [], builders: [], totalChainBlocks: 1 },
        { date: "2026-05-21", relays: [], builders: [], totalChainBlocks: 3 },
      ],
    });
  });
});

describe("appendSnapshotDays", () => {
  it("rejects days at or before the existing source end date", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "mev-watch-generator-"));
    const filePath = path.join(dir, "mev-watch.sqlite");
    await seedSqliteSnapshot(filePath);

    try {
      await expect(
        appendSnapshotDays(
          {
            ...EMPTY,
            sourceEndDate: "2022-09-15",
            days: [
              {
                date: "2022-09-15",
                relays: [],
                builders: [],
                totalChainBlocks: 1,
              },
            ],
          },
          filePath,
        ),
      ).rejects.toThrow(
        "appendSnapshotDays only accepts days after existing sourceEndDate",
      );

      const snapshot = await readSnapshot(filePath);
      expect(snapshot.days).toEqual([
        {
          date: "2022-09-15",
          relays: [],
          builders: [],
          totalChainBlocks: 0,
        },
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe("fetchMevWatchDay", () => {
  it("keeps relayscan data when the optional block count fails", async () => {
    const warn = vi.fn();
    const globalFetch = vi.fn(async () => {
      throw new Error("unexpected global fetch");
    });
    vi.stubGlobal("fetch", globalFetch);

    await expect(
      fetchMevWatchDay("2026-05-20", {
        fetchRelayscanDay: async () => ({
          date: "2026-05-20",
          relays: [{ relayId: "relay.ultrasound.money", numPayloads: 10 }],
          builders: [{ builderId: "builder-a", numBlocks: 9 }],
        }),
        fetchTotalChainBlocks: async () => {
          throw new Error("rpc unavailable");
        },
        warn,
      }),
    ).resolves.toEqual({
      date: "2026-05-20",
      relays: [{ relayId: "relay.ultrasound.money", numPayloads: 10 }],
      builders: [{ builderId: "builder-a", numBlocks: 9 }],
      totalChainBlocks: 0,
    });
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("block count unavailable for 2026-05-20"),
    );
    expect(globalFetch).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });
});

describe("fetchRelayscanDay", () => {
  it("retries transient upstream failures", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response("bad gateway", { status: 502 }))
      .mockResolvedValueOnce(
        Response.json({
          date: "2026-05-20",
          relays: [{ relay: "relay.ultrasound.money", num_payloads: 10 }],
          builders: [
            { info: { extra_data: "builder-a", num_blocks: 9 } },
          ],
        }),
      );
    vi.stubGlobal("fetch", fetch);

    await expect(
      fetchRelayscanDay("2026-05-20", { retryDelayMs: 0 }),
    ).resolves.toEqual({
      date: "2026-05-20",
      relays: [{ relayId: "relay.ultrasound.money", numPayloads: 10 }],
      builders: [{ builderId: "builder-a", numBlocks: 9 }],
    });
    expect(fetch).toHaveBeenCalledTimes(2);

    vi.unstubAllGlobals();
  });
});

describe("updateDataFile", () => {
  it("reports progress as each missing day is fetched", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "mev-watch-generator-"));
    const filePath = path.join(dir, "mev-watch.sqlite");
    await seedSqliteSnapshot(filePath);

    const progress = vi.fn();
    try {
      await updateDataFile({
        filePath,
        now: new Date("2022-09-18T12:00:00Z"),
        sleepMs: 0,
        onProgress: progress,
        fetchDay: async (date) => ({
          date,
          relays: [],
          builders: [],
          totalChainBlocks: 0,
        }),
      });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }

    expect(progress).toHaveBeenCalledTimes(2);
    expect(progress).toHaveBeenNthCalledWith(1, {
      date: "2022-09-16",
      index: 1,
      total: 2,
    });
    expect(progress).toHaveBeenNthCalledWith(2, {
      date: "2022-09-17",
      index: 2,
      total: 2,
    });
  });

  it("fetches missing days with bounded concurrency", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "mev-watch-generator-"));
    const filePath = path.join(dir, "mev-watch.sqlite");
    await seedSqliteSnapshot(filePath);

    let active = 0;
    let maxActive = 0;
    try {
      await updateDataFile({
        filePath,
        now: new Date("2022-09-20T12:00:00Z"),
        sleepMs: 0,
        concurrency: 2,
        fetchDay: async (date) => {
          active += 1;
          maxActive = Math.max(maxActive, active);
          await new Promise((resolve) => setTimeout(resolve, 20));
          active -= 1;
          return {
            date,
            relays: [],
            builders: [],
            totalChainBlocks: 0,
          };
        },
      });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }

    expect(maxActive).toBe(2);
  });

  it("limits fetched dates and reports persisted SQLite batches", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "mev-watch-generator-"));
    const filePath = path.join(dir, "mev-watch.sqlite");
    await seedSqliteSnapshot(filePath);

    const persisted = vi.fn();
    try {
      const result = await updateDataFile({
        filePath,
        now: new Date("2022-09-20T00:00:00.000Z"),
        sleepMs: 0,
        maxDays: 2,
        writeEvery: 1,
        onPersist: persisted,
        fetchDay: async (date) => ({
          date,
          relays: [],
          builders: [],
          totalChainBlocks: 1,
        }),
      });

      expect(result.fetchedDates).toEqual(["2022-09-16", "2022-09-17"]);
      expect(persisted).toHaveBeenCalledWith({
        persistedDates: ["2022-09-16"],
        sourceEndDate: "2022-09-16",
      });
      expect(persisted).toHaveBeenCalledWith({
        persistedDates: ["2022-09-17"],
        sourceEndDate: "2022-09-17",
      });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("persists completed batches before a later fetch fails", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "mev-watch-generator-"));
    const filePath = path.join(dir, "mev-watch.sqlite");
    await seedSqliteSnapshot(filePath);

    try {
      await expect(
        updateDataFile({
          filePath,
          now: new Date("2022-09-20T12:00:00Z"),
          sleepMs: 0,
          concurrency: 1,
          writeEvery: 2,
          fetchDay: async (date) => {
            if (date === "2022-09-18") throw new Error("upstream failed");
            return {
              date,
              relays: [],
              builders: [],
              totalChainBlocks: 0,
            };
          },
        }),
      ).rejects.toThrow("upstream failed");

      const snapshot = await readSnapshot(filePath);
      expect(snapshot.sourceEndDate).toBe("2022-09-17");
      expect(snapshot.days.map((day) => day.date)).toEqual([
        "2022-09-15",
        "2022-09-16",
        "2022-09-17",
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("does not persist non-contiguous completed days", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "mev-watch-generator-"));
    const filePath = path.join(dir, "mev-watch.sqlite");
    await seedSqliteSnapshot(filePath);

    try {
      await expect(
        updateDataFile({
          filePath,
          now: new Date("2022-09-20T12:00:00Z"),
          sleepMs: 0,
          concurrency: 3,
          writeEvery: 2,
          fetchDay: async (date) => {
            if (date === "2022-09-16") {
              await new Promise((resolve) => setTimeout(resolve, 50));
            }
            if (date === "2022-09-19") throw new Error("upstream failed");
            return {
              date,
              relays: [],
              builders: [],
              totalChainBlocks: 0,
            };
          },
        }),
      ).rejects.toThrow("upstream failed");

      const snapshot = await readSnapshot(filePath);
      expect(snapshot.days.map((day) => day.date)).not.toContain("2022-09-17");
      expect(snapshot.sourceEndDate).toBe("2022-09-15");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
