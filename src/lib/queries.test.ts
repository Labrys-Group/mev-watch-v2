import { describe, it, expect } from "vitest";
import { summarise } from "./queries";

const TREND = [
  { date: "2022-11-01", censorshipPct: 80 },
  { date: "2023-06-01", censorshipPct: 50 },
  { date: "2026-05-20", censorshipPct: 31 },
];

describe("summarise", () => {
  it("reports current, peak, and trough", () => {
    const s = summarise(TREND);
    expect(s.current).toBe(31);
    expect(s.peak).toBe(80);
    expect(s.peakDate).toBe("2022-11-01");
    expect(s.trough).toBe(31);
  });

  it("returns null for an empty trend", () => {
    expect(summarise([])).toBeNull();
  });
});
