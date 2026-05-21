import { describe, it, expect } from "vitest";
import { computeDailyStats, computeRelayBreakdown } from "./metrics";
import { computeBuilderBreakdown } from "./metrics";

// Flashbots is "censoring"; ultrasound is "neutral".
const RELAYS = [
  { relayId: "relay.ultrasound.money", numPayloads: 3000 },
  { relayId: "boost-relay.flashbots.net", numPayloads: 1000 },
];

describe("computeDailyStats", () => {
  it("censorship % is the censoring relays' share of deliveries", () => {
    const r = computeDailyStats(RELAYS);
    expect(r.censorshipPct).toBeCloseTo(25, 5); // 1000 / 4000
    expect(r.neutralPct).toBeCloseTo(75, 5);
    expect(r.totalBlocks).toBe(4000);
  });

  it("censorship + neutral sum to 100 for a non-empty day", () => {
    const r = computeDailyStats(RELAYS);
    expect(r.censorshipPct + r.neutralPct).toBeCloseTo(100, 5);
  });

  it("treats unknown relays as non-censoring", () => {
    const r = computeDailyStats([{ relayId: "mystery.xyz", numPayloads: 100 }]);
    expect(r.censorshipPct).toBe(0);
    expect(r.neutralPct).toBeCloseTo(100, 5);
  });

  it("handles an empty day without dividing by zero", () => {
    const r = computeDailyStats([]);
    expect(r.censorshipPct).toBe(0);
    expect(r.neutralPct).toBe(0);
    expect(r.totalBlocks).toBe(0);
  });
});

describe("computeRelayBreakdown", () => {
  it("returns per-relay share and posture-derived censorship rate", () => {
    const breakdown = computeRelayBreakdown(RELAYS);
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
