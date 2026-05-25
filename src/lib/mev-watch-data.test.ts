import { describe, expect, it } from "vitest";
import {
  deriveBuilderLeaderboard,
  deriveLatestStats,
  deriveRelayLeaderboard,
  deriveTrend,
  type MevWatchSnapshot,
} from "./mev-watch-data";

const SNAPSHOT: MevWatchSnapshot = {
  schemaVersion: 1,
  generatedAt: "2026-05-25T03:30:00.000Z",
  sourceStartDate: "2023-12-17",
  sourceEndDate: "2023-12-18",
  days: [
    {
      date: "2023-12-17",
      totalChainBlocks: 10_000,
      relays: [
        { relayId: "bloxroute.max-profit.blxrbdn.com", numPayloads: 100 },
        { relayId: "relay.ultrasound.money", numPayloads: 100 },
      ],
      builders: [{ builderId: "builder-a", numBlocks: 9_000 }],
    },
    {
      date: "2023-12-18",
      totalChainBlocks: 10_000,
      relays: [
        { relayId: "bloxroute.max-profit.blxrbdn.com", numPayloads: 100 },
        { relayId: "relay.ultrasound.money", numPayloads: 300 },
      ],
      builders: [
        { builderId: "builder-a", numBlocks: 6_000 },
        { builderId: "builder-b", numBlocks: 3_000 },
      ],
    },
  ],
};

describe("MEV Watch data derivation", () => {
  it("derives date-aware trend metrics from raw daily snapshots", () => {
    expect(deriveTrend(SNAPSHOT)).toEqual([
      { date: "2023-12-17", censorshipPct: 0, nonBoostPct: 10 },
      { date: "2023-12-18", censorshipPct: 25, nonBoostPct: 10 },
    ]);
  });

  it("returns the latest daily composition", () => {
    expect(deriveLatestStats(SNAPSHOT)).toEqual({
      date: "2023-12-18",
      censorshipPct: 25,
      neutralPct: 75,
      nonBoostPct: 10,
      totalBlocks: 400,
    });
  });

  it("derives the latest relay leaderboard with names and postures", () => {
    expect(deriveRelayLeaderboard(SNAPSHOT)).toEqual([
      {
        relayId: "relay.ultrasound.money",
        name: "Ultra Sound",
        posture: "neutral",
        blocks: 300,
        sharePct: 75,
      },
      {
        relayId: "bloxroute.max-profit.blxrbdn.com",
        name: "bloXroute Max Profit",
        posture: "censoring",
        blocks: 100,
        sharePct: 25,
      },
    ]);
  });

  it("derives the latest builder leaderboard", () => {
    expect(deriveBuilderLeaderboard(SNAPSHOT)).toEqual([
      { builderId: "builder-a", blocks: 6000, sharePct: 66.66666666666666 },
      { builderId: "builder-b", blocks: 3000, sharePct: 33.33333333333333 },
    ]);
  });
});
