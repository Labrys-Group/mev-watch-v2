import { describe, expect, it } from "vitest";
import {
  buildDateRange,
  mergeSnapshotDays,
  nextMissingStartDate,
  type MevWatchSnapshot,
} from "./mev-watch-generator";

const EMPTY: MevWatchSnapshot = {
  schemaVersion: 1,
  generatedAt: "2026-05-25T00:00:00.000Z",
  sourceStartDate: "2022-09-15",
  sourceEndDate: null,
  days: [],
};

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
