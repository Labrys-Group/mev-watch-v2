import { describe, expect, it, vi } from "vitest";

vi.mock("next/font/google", () => ({
  Manrope: () => ({ variable: "font-manrope" }),
  Spline_Sans_Mono: () => ({ variable: "font-spline-sans-mono" }),
}));

describe("root metadata", () => {
  it("uses censoring language without mentioning OFAC", async () => {
    const { metadata } = await import("./layout");
    const serialized = JSON.stringify(metadata);

    expect(serialized).toContain("censoring");
    expect(serialized).toContain("non-censoring");
    expect(serialized).not.toContain("OFAC");
  });
});
