import { render, screen, within } from "@testing-library/react";
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
vi.mock("@/components/sections/status-bar.data", () => ({
  StatusBarData: () => createElement("div", null, "Status bar"),
}));
vi.mock("@/components/sections/site-header", () => ({
  SiteHeader: () => createElement("header", null, "Header"),
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
  it("renders the status bar and site header in a sticky global lockup", async () => {
    const { default: RootLayout } = await import("./layout");

    render(
      createElement(
        RootLayout,
        null,
        createElement("main", null, "Route content"),
      ),
    );

    const lockup = screen.getByText("Status bar").parentElement;

    expect(lockup).toHaveClass("sticky", "top-0", "z-50");
    expect(
      within(lockup as HTMLElement).getByText("Header"),
    ).toBeInTheDocument();
    expect(screen.getByText("Route content")).toBeInTheDocument();
  });
});
