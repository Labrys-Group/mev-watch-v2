import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import StatusPage from "./page";
import { getLastRefresh, getLatestStats } from "@/lib/queries";

vi.mock("@/components/sections/site-header", () => ({
  SiteHeader: () => <header>Header</header>,
}));
vi.mock("@/components/sections/site-footer", () => ({
  SiteFooter: () => <footer>Footer</footer>,
}));
vi.mock("@/components/reveal", () => ({
  Reveal: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock("@/lib/queries", () => ({
  getLastRefresh: vi.fn(async () => ({
    ranAt: new Date("2026-05-25T07:07:43.521Z"),
    status: "ok",
    source: "src/data/mev-watch.sqlite",
    message: "Data through 2023-10-24",
  })),
  getLatestStats: vi.fn(async () => ({
    date: "2023-10-24",
    censorshipPct: 33.4,
    neutralPct: 66.6,
    nonBoostPct: 10,
    totalBlocks: 11869,
  })),
}));

const getLastRefreshMock = vi.mocked(getLastRefresh);
const getLatestStatsMock = vi.mocked(getLatestStats);

describe("StatusPage", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("reports stale daily source data separately from generated time", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-26T10:30:00Z"));

    render(await StatusPage());

    expect(screen.getByText("2023-10-24")).toBeInTheDocument();
    expect(screen.getByText("Daily data stale (945d old)")).toBeInTheDocument();
    expect(
      screen.getByText(/freshness is based on the latest source day/i),
    ).toBeInTheDocument();
  });

  it("reports lagging when the refresh run is outside the tolerance", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-26T10:30:00Z"));
    getLastRefreshMock.mockResolvedValueOnce({
      ranAt: new Date("2026-05-24T07:00:00Z"),
      status: "ok",
      source: "src/data/mev-watch.sqlite",
      message: "Data through 2026-05-25",
    });
    getLatestStatsMock.mockResolvedValueOnce({
      date: "2026-05-25",
      censorshipPct: 33.4,
      neutralPct: 66.6,
      nonBoostPct: 10,
      totalBlocks: 11869,
    });

    render(await StatusPage());

    expect(screen.getByText("Daily refresh lagging (2d ago)")).toBeInTheDocument();
  });

  it("reports clock skew for future generated metadata", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-26T10:30:00Z"));
    getLastRefreshMock.mockResolvedValueOnce({
      ranAt: new Date("2026-05-26T11:30:00Z"),
      status: "ok",
      source: "src/data/mev-watch.sqlite",
      message: "Data through 2026-05-25",
    });
    getLatestStatsMock.mockResolvedValueOnce({
      date: "2026-05-25",
      censorshipPct: 33.4,
      neutralPct: 66.6,
      nonBoostPct: 10,
      totalBlocks: 11869,
    });

    render(await StatusPage());

    expect(screen.getByText("Daily refresh lagging")).toBeInTheDocument();
    expect(screen.getByText("Clock skew detected")).toBeInTheDocument();
    expect(screen.queryByText("0s ago")).not.toBeInTheDocument();
  });
});
