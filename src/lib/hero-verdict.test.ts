import { describe, it, expect } from "vitest";
import { computeHeroVerdict } from "./hero-verdict";
import type { TrendPoint } from "./queries";

const END = "2026-05-21";

/** Build a contiguous daily series, oldest first, last point dated `endDate`. */
function series(values: number[], endDate = END): TrendPoint[] {
  return values.map((censorshipPct, i) => {
    const d = new Date(`${endDate}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - (values.length - 1 - i));
    return { date: d.toISOString().slice(0, 10), censorshipPct };
  });
}

/** 37-day series: first 7 days at `ago`, last 7 at `now`, the rest at `mid`. */
function span(ago: number, now: number, mid = 40): TrendPoint[] {
  const values = Array.from({ length: 37 }, (_, i) =>
    i < 7 ? ago : i >= 30 ? now : mid,
  );
  return series(values);
}

describe("computeHeroVerdict", () => {
  it("classifies a clear 30-day fall as falling", () => {
    const v = computeHeroVerdict(span(50, 30));
    expect(v.state).toBe("falling");
    expect(v.headlineWord).toBe("FALLING");
    expect(v.tone).toBe("good");
    expect(v.arrow).toBe("▼");
    expect(Math.round(v.changePct)).toBe(-40);
  });

  it("classifies a clear 30-day rise as rising", () => {
    const v = computeHeroVerdict(span(30, 45));
    expect(v.state).toBe("rising");
    expect(v.headlineWord).toBe("RISING");
    expect(v.tone).toBe("bad");
    expect(v.arrow).toBe("▲");
  });

  it("classifies a flat trend below the level line as contained", () => {
    const v = computeHeroVerdict(span(33, 34));
    expect(v.state).toBe("contained");
    expect(v.headlineWord).toBe("CONTAINED");
    expect(v.tone).toBe("good");
  });

  it("classifies a flat trend at or above the level line as winning", () => {
    const v = computeHeroVerdict(span(54, 55));
    expect(v.state).toBe("winning");
    expect(v.headlineWord).toBe("WINNING");
    expect(v.tone).toBe("bad");
  });

  it("treats exactly -10% as falling (lower flat-band boundary)", () => {
    expect(computeHeroVerdict(span(50, 45)).state).toBe("falling");
  });

  it("treats exactly +10% as rising (upper flat-band boundary)", () => {
    expect(computeHeroVerdict(span(50, 55)).state).toBe("rising");
  });

  it("keeps a -9% change inside the flat band", () => {
    expect(computeHeroVerdict(span(40, 36.4)).state).toBe("contained");
  });

  it("treats current of exactly 50% as winning", () => {
    const v = computeHeroVerdict(span(49.6, 50));
    expect(v.current).toBe(50);
    expect(v.state).toBe("winning");
  });

  it("treats current just under 50% as contained", () => {
    expect(computeHeroVerdict(span(49.6, 49.9)).state).toBe("contained");
  });

  it("smooths single-day spikes — a one-day jump stays flat", () => {
    const values = Array.from({ length: 37 }, () => 30);
    values[36] = 48;
    // Point-to-point (48 vs 30) would be +60% → rising; smoothed it is ~+9% → flat.
    expect(computeHeroVerdict(series(values)).state).toBe("contained");
  });

  it("falls back to the oldest point when 30-day history is missing", () => {
    const v = computeHeroVerdict(series([40, 40, 40, 40, 40, 30, 30, 30, 30, 30]));
    expect(v.state).toBe("falling");
  });

  it("returns a flat verdict for a single data point", () => {
    const v = computeHeroVerdict(series([33]));
    expect(v.state).toBe("contained");
    expect(v.changePct).toBe(0);
  });

  it("returns a safe default for an empty trend", () => {
    const v = computeHeroVerdict([]);
    expect(v.state).toBe("contained");
    expect(v.current).toBe(0);
    expect(v.changePct).toBe(0);
  });

  it("guards against division by a zero baseline", () => {
    const v = computeHeroVerdict(span(0, 5));
    expect(v.changePct).toBe(0);
    expect(v.state).toBe("contained");
  });

  it("interpolates the rounded change into the falling message", () => {
    expect(computeHeroVerdict(span(50, 30)).message).toBe(
      "Down 40% over the last 30 days — censorship resistance is gaining ground.",
    );
  });

  it("interpolates the rounded change into the rising message", () => {
    expect(computeHeroVerdict(span(30, 45)).message).toBe(
      "Up 50% over the last 30 days — censorship is regaining its grip.",
    );
  });
});
