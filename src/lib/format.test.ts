import { describe, it, expect } from "vitest";
import { formatPercent } from "./format";
import { formatRelativeTime, formatDateShort, formatDateLong } from "./format";

describe("formatPercent", () => {
  it("formats a whole number with one decimal place", () => {
    expect(formatPercent(24)).toBe("24.0%");
  });

  it("rounds to one decimal place", () => {
    expect(formatPercent(78.42)).toBe("78.4%");
  });

  it("formats zero", () => {
    expect(formatPercent(0)).toBe("0.0%");
  });

  it("respects an explicit fractionDigits argument", () => {
    expect(formatPercent(24.456, 2)).toBe("24.46%");
  });
});

describe("formatRelativeTime", () => {
  it("formats seconds, minutes, hours, days ago", () => {
    const now = new Date("2026-05-21T12:00:00Z");
    expect(formatRelativeTime(new Date("2026-05-21T11:59:30Z"), now)).toBe("30s ago");
    expect(formatRelativeTime(new Date("2026-05-21T11:30:00Z"), now)).toBe("30m ago");
    expect(formatRelativeTime(new Date("2026-05-21T09:00:00Z"), now)).toBe("3h ago");
    expect(formatRelativeTime(new Date("2026-05-18T12:00:00Z"), now)).toBe("3d ago");
  });
});

describe("formatDateShort", () => {
  it("formats an ISO date as MMM 'YY", () => {
    expect(formatDateShort("2022-11-14")).toBe("Nov '22");
  });
});

describe("formatDateLong", () => {
  it("formats an ISO date as 'DDD · D MMM YYYY' in UTC", () => {
    // 2022-11-14 was a Monday in UTC.
    expect(formatDateLong("2022-11-14")).toBe("Mon · 14 Nov 2022");
  });

  it("uses UTC weekday regardless of local timezone", () => {
    // 2022-01-01 was a Saturday in UTC; local parsing would yield Friday
    // for users west of UTC.
    expect(formatDateLong("2022-01-01")).toBe("Sat · 1 Jan 2022");
  });
});
