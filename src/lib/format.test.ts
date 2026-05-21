import { describe, it, expect } from "vitest";
import { formatPercent } from "./format";

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
