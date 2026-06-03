import { describe, expect, it } from "vitest";

import {
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
      generatedAt: new Date("2026-05-26T07:00:00Z"),
      now: NOW,
    });

    expect(STALE_SOURCE_DAY_THRESHOLD_DAYS).toBe(1);
    expect(freshness.status).toBe("fresh");
    expect(freshness.sourceAgeDays).toBe(1);
    expect(freshness.sourceLabel).toBe("Daily snapshot through 2026-05-25");
    expect(freshness.generatedAgeLabel).toBe("3h ago");
  });

  it("classifies source days older than the threshold as stale", () => {
    const freshness = getDataFreshness({
      latestDate: "2026-05-24",
      generatedAt: new Date("2026-05-25T07:07:43.521Z"),
      now: NOW,
    });

    expect(freshness.status).toBe("stale");
    expect(freshness.sourceAgeDays).toBe(2);
    expect(freshness.sourceLabel).toBe("Daily snapshot through 2026-05-24");
  });

  it("classifies stale refresh runs as lagging even when the source day is current", () => {
    const freshness = getDataFreshness({
      latestDate: "2026-05-25",
      generatedAt: new Date("2026-05-24T07:00:00Z"),
      now: NOW,
    });

    expect(freshness.status).toBe("lagging");
    expect(freshness.sourceAgeDays).toBe(1);
    expect(freshness.generatedAgeLabel).toBe("2d ago");
  });

  it("classifies future refresh timestamps as lagging without a negative age label", () => {
    const freshness = getDataFreshness({
      latestDate: "2026-05-25",
      generatedAt: new Date("2026-05-26T11:30:00Z"),
      now: NOW,
    });

    expect(freshness.status).toBe("lagging");
    expect(freshness.sourceAgeDays).toBe(1);
    expect(freshness.generatedAgeLabel).toBeNull();
  });

  it("uses complete UTC day boundaries for source age", () => {
    const freshness = getDataFreshness({
      latestDate: "2026-05-25",
      generatedAt: new Date("2026-05-25T23:00:00Z"),
      now: new Date("2026-05-26T00:01:00Z"),
    });

    expect(freshness.sourceAgeDays).toBe(1);
    expect(freshness.status).toBe("fresh");
  });
});
