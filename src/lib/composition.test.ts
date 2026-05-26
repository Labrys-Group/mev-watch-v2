import { describe, it, expect } from "vitest";
import { toCompositionPoint } from "./composition";

describe("toCompositionPoint", () => {
  it("the three bands sum to 100", () => {
    const p = toCompositionPoint({
      date: "2026-05-20",
      censorshipPct: 47,
      nonBoostPct: 6.5,
    });
    expect(p.nonCensored + p.censored + p.nonBoost).toBeCloseTo(100, 5);
  });

  it("re-bases the bands onto the all-blocks denominator", () => {
    const p = toCompositionPoint({
      date: "2026-05-20",
      censorshipPct: 50,
      nonBoostPct: 10,
    });
    expect(p.censored).toBeCloseTo(45, 5); // 50% of the 90% boosted share
    expect(p.nonCensored).toBeCloseTo(45, 5);
    expect(p.nonBoost).toBe(10);
  });

  it("collapses to the two-way split when non-boost data is unavailable", () => {
    const p = toCompositionPoint({
      date: "2026-05-20",
      censorshipPct: 30,
      nonBoostPct: null,
    });
    expect(p.nonBoost).toBe(0);
    expect(p.censored).toBeCloseTo(30, 5);
    expect(p.nonCensored).toBeCloseTo(70, 5);
  });

  it("carries the headline censorship rate through unchanged", () => {
    const p = toCompositionPoint({
      date: "2026-05-20",
      censorshipPct: 47,
      nonBoostPct: 6.5,
    });
    expect(p.censorshipPct).toBe(47);
  });
});
