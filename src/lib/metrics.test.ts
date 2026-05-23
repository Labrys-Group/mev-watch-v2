import { describe, it, expect } from "vitest";
import {
  computeDailyStats,
  computeRelayBreakdown,
  computeBuilderBreakdown,
  nonBoostShare,
} from "./metrics";

// Flashbots is "censoring"; ultrasound is "neutral". Neither's posture varies,
// so the date passed to the metric functions does not affect these fixtures.
const RELAYS = [
  { relayId: "relay.ultrasound.money", numPayloads: 3000 },
  { relayId: "boost-relay.flashbots.net", numPayloads: 1000 },
];
const ANY_DATE = "2025-01-01";

describe("computeDailyStats", () => {
  it("censorship % is the censoring relays' share of deliveries", () => {
    const r = computeDailyStats(RELAYS, [], 0, ANY_DATE);
    expect(r.censorshipPct).toBeCloseTo(25, 5); // 1000 / 4000
    expect(r.neutralPct).toBeCloseTo(75, 5);
    expect(r.totalBlocks).toBe(4000);
  });

  it("censorship + neutral sum to 100 for a non-empty day", () => {
    const r = computeDailyStats(RELAYS, [], 0, ANY_DATE);
    expect(r.censorshipPct + r.neutralPct).toBeCloseTo(100, 5);
  });

  it("treats unknown relays as non-censoring", () => {
    const r = computeDailyStats(
      [{ relayId: "mystery.xyz", numPayloads: 100 }],
      [],
      0,
      ANY_DATE,
    );
    expect(r.censorshipPct).toBe(0);
    expect(r.neutralPct).toBeCloseTo(100, 5);
  });

  it("handles an empty day without dividing by zero", () => {
    const r = computeDailyStats([], [], 0, ANY_DATE);
    expect(r.censorshipPct).toBe(0);
    expect(r.neutralPct).toBe(0);
    expect(r.totalBlocks).toBe(0);
  });

  it("classifies relays by the day's date for time-varying postures", () => {
    // bloXroute Max Profit was neutral until 2023-12-18, censoring after.
    const relays = [
      { relayId: "bloxroute.max-profit.blxrbdn.com", numPayloads: 1000 },
      { relayId: "relay.ultrasound.money", numPayloads: 1000 },
    ];
    expect(computeDailyStats(relays, [], 0, "2023-01-15").censorshipPct).toBe(0);
    expect(
      computeDailyStats(relays, [], 0, "2024-06-15").censorshipPct,
    ).toBeCloseTo(50, 5);
  });

  it("non-boost % is the share of chain blocks not built via MEV-boost", () => {
    const builders = [
      { builderId: "Titan", numBlocks: 6000 },
      { builderId: "Beaver", numBlocks: 3000 },
    ];
    const r = computeDailyStats(RELAYS, builders, 10000, ANY_DATE);
    expect(r.nonBoostPct).toBeCloseTo(10, 5); // (10000 - 9000) / 10000
  });
});

describe("computeRelayBreakdown", () => {
  it("returns per-relay share and posture-derived censorship rate", () => {
    const breakdown = computeRelayBreakdown(RELAYS, ANY_DATE);
    const flashbots = breakdown.find(
      (b) => b.relayId === "boost-relay.flashbots.net",
    )!;
    expect(flashbots.blocks).toBe(1000);
    expect(flashbots.sharePct).toBeCloseTo(25, 5);
    expect(flashbots.censorshipRate).toBe(100);
    const us = breakdown.find((b) => b.relayId === "relay.ultrasound.money")!;
    expect(us.censorshipRate).toBe(0);
    expect(us.sharePct).toBeCloseTo(75, 5);
  });

  it("derives censorship rate from the posture in effect on the day", () => {
    const relays = [
      { relayId: "bloxroute.max-profit.blxrbdn.com", numPayloads: 100 },
    ];
    expect(computeRelayBreakdown(relays, "2023-01-15")[0].censorshipRate).toBe(0);
    expect(computeRelayBreakdown(relays, "2024-06-15")[0].censorshipRate).toBe(
      100,
    );
  });
});

describe("computeBuilderBreakdown", () => {
  it("returns per-builder block counts and share", () => {
    const result = computeBuilderBreakdown([
      { builderId: "Titan", numBlocks: 75 },
      { builderId: "Quasar", numBlocks: 25 },
    ]);
    const titan = result.find((b) => b.builderId === "Titan")!;
    expect(titan.blocks).toBe(75);
    expect(titan.sharePct).toBeCloseTo(75, 5);
  });

  it("handles an empty builder list", () => {
    expect(computeBuilderBreakdown([])).toEqual([]);
  });
});

describe("nonBoostShare", () => {
  it("is the non-MEV-boost fraction of all chain blocks", () => {
    expect(nonBoostShare(10000, 9300)).toBeCloseTo(7, 5);
  });

  it("clamps to 0 when MEV-boost blocks exceed the chain total", () => {
    expect(nonBoostShare(100, 120)).toBe(0);
  });

  it("returns 0 when the chain total is zero or unknown", () => {
    expect(nonBoostShare(0, 0)).toBe(0);
  });
});
