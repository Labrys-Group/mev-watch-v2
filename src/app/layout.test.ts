import { render, screen } from "@testing-library/react";
import { createElement, Fragment } from "react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/font/google", () => ({
  Manrope: () => ({ variable: "font-manrope" }),
  Spline_Sans_Mono: () => ({ variable: "font-spline-sans-mono" }),
}));

vi.mock("@/components/theme-provider", () => ({
  ThemeProvider: ({ children }: { children: ReactNode }) =>
    createElement(Fragment, null, children),
}));
vi.mock("@/components/scroll-progress", () => ({
  ScrollProgress: () => null,
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

describe("RootLayout", () => {
  it("does not render route-specific status or navigation chrome", async () => {
    const { default: RootLayout } = await import("./layout");

    render(
      createElement(
        RootLayout,
        null,
        createElement("main", null, "Route content"),
      ),
    );

    expect(screen.queryByText("Status bar")).not.toBeInTheDocument();
    expect(screen.queryByText("Header")).not.toBeInTheDocument();
    expect(screen.getByText("Route content")).toBeInTheDocument();
  });
});
