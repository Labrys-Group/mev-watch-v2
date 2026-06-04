import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { DataFreshness } from "@/lib/data-freshness";
import { StatusBar } from "./status-bar";

const freshness: DataFreshness = {
  status: "fresh",
  sourceDate: "2023-10-24",
  sourceAgeDays: 0,
  generatedAt: new Date("2026-05-25T07:07:43.521Z"),
  generatedAgeLabel: "1d ago",
  sourceLabel: "Daily snapshot through 2023-10-24",
};

describe("StatusBar", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders ON SCHEDULE from the freshness verdict and localizes the source day", () => {
    render(
      <StatusBar
        latestDate="2023-10-24"
        censorshipPct={33.4}
        freshness={freshness}
      />,
    );

    const localizedSourceDay = new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeZone: "UTC",
    }).format(new Date("2023-10-24T00:00:00Z"));

    expect(screen.getByText("ON SCHEDULE")).toBeInTheDocument();
    expect(screen.getByText("SOURCE DAY")).toBeInTheDocument();
    expect(screen.getByText(localizedSourceDay)).toBeInTheDocument();
    expect(screen.queryByText("SOURCE DAY (UTC)")).not.toBeInTheDocument();
    expect(screen.queryByText("2023-10-24")).not.toBeInTheDocument();
    expect(screen.getByText("33.4%")).toBeInTheDocument();
    expect(screen.queryByText(/DAILY STALE/i)).not.toBeInTheDocument();
    expect(screen.queryByText("DAILY FRESH")).not.toBeInTheDocument();
  });

  it("computes the updated age from the raw refresh timestamp at view time", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-26T03:00:00Z"));

    render(
      <StatusBar
        latestDate="2026-05-25"
        censorshipPct={33.4}
        lastRefresh={new Date("2026-05-25T07:00:00Z")}
        freshness={{
          ...freshness,
          generatedAt: new Date("2026-05-25T07:00:00Z"),
          generatedAgeLabel: "3h ago",
        }}
      />,
    );

    expect(screen.getByText("20h ago")).toBeInTheDocument();
    expect(screen.queryByText("3h ago")).not.toBeInTheDocument();
  });

  it("renders DAILY STALE with warning treatment when the source day is stale", () => {
    render(
      <StatusBar
        latestDate="2026-05-24"
        censorshipPct={33.4}
        freshness={{
          ...freshness,
          status: "stale",
          sourceDate: "2026-05-24",
          sourceAgeDays: 2,
          sourceLabel: "Daily snapshot through 2026-05-24",
        }}
      />,
    );

    const status = screen.getByText("DAILY STALE");
    expect(status).toBeInTheDocument();
    expect(status).toHaveClass("text-warn");
    expect(screen.queryByText("ON SCHEDULE")).not.toBeInTheDocument();
  });

  it("renders NO DATA for empty freshness even when disconnected", () => {
    render(
      <StatusBar
        connected={false}
        latestDate="—"
        censorshipPct={0}
        lastRefresh={null}
        freshness={{
          status: "empty",
          sourceDate: null,
          sourceAgeDays: null,
          generatedAt: null,
          generatedAgeLabel: null,
          sourceLabel: "No daily snapshot available",
        }}
      />,
    );

    expect(screen.getByText("NO DATA")).toBeInTheDocument();
    expect(screen.queryByText("DISCONNECTED")).not.toBeInTheDocument();
  });

  it("keeps DISCONNECTED for non-empty disconnected freshness", () => {
    render(
      <StatusBar
        connected={false}
        latestDate="2023-10-24"
        censorshipPct={33.4}
        freshness={freshness}
      />,
    );

    expect(screen.getByText("DISCONNECTED")).toBeInTheDocument();
    expect(screen.queryByText("ON SCHEDULE")).not.toBeInTheDocument();
  });

  it("reports clock skew instead of treating future refresh metadata as current", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-26T10:30:00Z"));

    render(
      <StatusBar
        latestDate="2026-05-25"
        censorshipPct={33.4}
        lastRefresh={new Date("2026-05-26T11:30:00Z")}
        freshness={{
          ...freshness,
          status: "lagging",
          sourceDate: "2026-05-25",
          sourceAgeDays: 1,
          generatedAt: new Date("2026-05-26T11:30:00Z"),
          generatedAgeLabel: null,
          sourceLabel: "Daily snapshot through 2026-05-25",
        }}
      />,
    );

    expect(screen.getByText("Clock skew")).toBeInTheDocument();
    expect(screen.queryByText("0s ago")).not.toBeInTheDocument();
  });
});
