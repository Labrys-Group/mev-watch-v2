import { describe, it, expect, vi } from "vitest";
import { safeQuery, summarise } from "./queries";

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

describe("safeQuery", () => {
  it("returns the query result when it succeeds", async () => {
    const result = await safeQuery("ok", async () => [1, 2, 3], []);
    expect(result).toEqual([1, 2, 3]);
  });

  it("returns the fallback when the query throws", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await safeQuery<number[]>(
      "boom",
      async () => {
        throw new Error("SERVER_ERROR: Server returned HTTP status 404");
      },
      [],
    );
    expect(result).toEqual([]);
    spy.mockRestore();
  });

  it("logs the failure so build and runtime logs surface it", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    await safeQuery<null>(
      "getTrend",
      async () => {
        throw new Error("boom");
      },
      null,
    );
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining("getTrend"),
      expect.any(Error),
    );
    spy.mockRestore();
  });
});
