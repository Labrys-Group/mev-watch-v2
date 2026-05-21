import { describe, it, expect } from "vitest";
import { computeDailyStats, computeRelayBreakdown, SLOTS_PER_DAY } from "./metrics";

// Flashbots + both bloXroute relays are "censoring"; ultrasound is "neutral".
const RELAYS = [
  { relayId: "relay.ultrasound.money", numPayloads: 3000 },
  { relayId: "boost-relay.flashbots.net", numPayloads: 1000 },
];

describe("computeDailyStats", () => {
  it("splits censoring vs neutral vs non-boost", () => {
    const result = computeDailyStats(RELAYS);
    expect(result.totalBlocks).toBe(SLOTS_PER_DAY);
    expect(result.censorshipPct).toBeCloseTo((1000 / 7200) * 100, 5);
    expect(result.neutralPct).toBeCloseTo((3000 / 7200) * 100, 5);
    expect(result.nonBoostPct).toBeCloseTo((3200 / 7200) * 100, 5);
  });

  it("the three percentages sum to 100", () => {
    const r = computeDailyStats(RELAYS);
    expect(r.censorshipPct + r.neutralPct + r.nonBoostPct).toBeCloseTo(100, 5);
  });

  it("treats unknown relays as non-censoring", () => {
    const r = computeDailyStats([{ relayId: "mystery-relay.xyz", numPayloads: 100 }]);
    expect(r.censorshipPct).toBe(0);
  });

  it("handles an empty day without dividing by zero", () => {
    const r = computeDailyStats([]);
    expect(r.totalBlocks).toBe(SLOTS_PER_DAY);
    expect(r.nonBoostPct).toBeCloseTo(100, 5);
  });

  it("clamps non-boost at zero when payloads exceed the slot estimate", () => {
    const r = computeDailyStats([{ relayId: "relay.ultrasound.money", numPayloads: 9000 }]);
    expect(r.nonBoostPct).toBe(0);
    expect(r.totalBlocks).toBe(9000);
  });
});

describe("computeRelayBreakdown", () => {
  it("returns per-relay share and posture-derived censorship rate", () => {
    const breakdown = computeRelayBreakdown(RELAYS);
    const flashbots = breakdown.find((b) => b.relayId === "boost-relay.flashbots.net")!;
    expect(flashbots.blocks).toBe(1000);
    expect(flashbots.sharePct).toBeCloseTo(25, 5);
    expect(flashbots.censorshipRate).toBe(100);
    const us = breakdown.find((b) => b.relayId === "relay.ultrasound.money")!;
    expect(us.censorshipRate).toBe(0);
    expect(us.sharePct).toBeCloseTo(75, 5);
  });
});
