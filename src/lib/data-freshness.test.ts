import { describe, expect, it } from "vitest";

import {
  FRESH_SOURCE_DAY_THRESHOLD_DAYS,
  STALE_SOURCE_DAY_THRESHOLD_DAYS,
  getDataFreshness,
} from "./data-freshness";

const NOW = new Date("2026-05-26T10:30:00Z");

describe("getDataFreshness", () => {
  it("classifies missing latest stats as empty", () => {
    const freshness = getDataFreshness({
      latestDate: null,
      generatedAt: null,
      now: NOW,
    });

    expect(freshness.status).toBe("empty");
    expect(freshness.sourceDate).toBeNull();
    expect(freshness.sourceAgeDays).toBeNull();
    expect(freshness.sourceLabel).toBe("No daily snapshot available");
  });

  it("classifies source days inside the threshold as fresh", () => {
    const freshness = getDataFreshness({
      latestDate: "2026-05-25",
      generatedAt: new Date("2026-05-25T18:00:00Z"),
      now: NOW,
    });

    expect(FRESH_SOURCE_DAY_THRESHOLD_DAYS).toBe(1);
    expect(STALE_SOURCE_DAY_THRESHOLD_DAYS).toBe(1.5);
    expect(freshness.status).toBe("fresh");
    expect(freshness.sourceAgeDays).toBe(1.4375);
    expect(freshness.sourceLabel).toBe("Daily snapshot through 2026-05-25");
    expect(freshness.generatedAgeLabel).toBe("16h ago");
  });

  it("classifies a missing expected source day as stale after the lag window", () => {
    const freshness = getDataFreshness({
      latestDate: "2026-05-24",
      generatedAt: new Date("2026-05-26T09:00:00Z"),
      now: new Date("2026-05-26T12:00:00Z"),
    });

    expect(freshness.status).toBe("stale");
    expect(freshness.sourceAgeDays).toBe(2.5);
    expect(freshness.sourceLabel).toBe("Daily snapshot through 2026-05-24");
  });

  it("classifies a missing expected source day as lagging during the lag window", () => {
    const freshness = getDataFreshness({
      latestDate: "2026-05-24",
      generatedAt: new Date("2026-05-26T09:00:00Z"),
      now: NOW,
    });

    expect(freshness.status).toBe("lagging");
    expect(freshness.sourceAgeDays).toBe(2.4375);
    expect(freshness.generatedAgeLabel).toBe("1h ago");
  });

  it("keeps status source-date based when refresh metadata is stale", () => {
    const freshness = getDataFreshness({
      latestDate: "2026-05-26",
      generatedAt: new Date("2026-05-24T07:00:00Z"),
      now: NOW,
    });

    expect(freshness.status).toBe("fresh");
    expect(freshness.sourceAgeDays).toBe(0.4375);
    expect(freshness.generatedAgeLabel).toBe("2d ago");
  });

  it("keeps status source-date based when refresh timestamps are in the future", () => {
    const freshness = getDataFreshness({
      latestDate: "2026-05-25",
      generatedAt: new Date("2026-05-26T11:30:00Z"),
      now: new Date("2026-05-26T00:00:00Z"),
    });

    expect(freshness.status).toBe("fresh");
    expect(freshness.sourceAgeDays).toBe(1);
    expect(freshness.generatedAgeLabel).toBeNull();
  });

  it("uses fractional UTC age for source days", () => {
    const freshness = getDataFreshness({
      latestDate: "2026-05-25",
      generatedAt: new Date("2026-05-25T23:00:00Z"),
      now: new Date("2026-05-26T00:01:00Z"),
    });

    expect(freshness.sourceAgeDays).toBeCloseTo(1.0006944444);
    expect(freshness.status).toBe("fresh");
  });
});
