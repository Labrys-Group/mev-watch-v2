import { render, screen, within } from "@testing-library/react";
import { createElement, Fragment } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/skeletons/status-bar.skeleton", () => ({
  StatusBarSkeleton: () => createElement("div", null, "Loading status"),
}));
vi.mock("@/components/sections/status-bar.data", () => ({
  StatusBarData: () => createElement("div", null, "Status bar"),
}));
vi.mock("@/components/sections/site-header", () => ({
  SiteHeader: () => createElement("header", null, "Header"),
}));

describe("SiteLayout", () => {
  it("revalidates the shared status chrome hourly", async () => {
    const { revalidate } = await import("./layout");

    expect(revalidate).toBe(3600);
  });

  it("renders the status bar and site header in a sticky site lockup", async () => {
    const { default: SiteLayout } = await import("./layout");

    render(
      createElement(
        SiteLayout,
        null,
        createElement(Fragment, null, "Route content"),
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
