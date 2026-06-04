import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { DataFreshness } from "@/lib/data-freshness";
import { StatusBar } from "./status-bar";
import { UpdatedAge } from "./status-bar-live-values";

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
    vi.unstubAllGlobals();
  });

  it("renders ON SCHEDULE from the freshness verdict and labels the UTC source day", () => {
    render(
      <StatusBar
        latestDate="2023-10-24"
        censorshipPct={33.4}
        freshness={freshness}
      />,
    );

    expect(screen.getByText("ON SCHEDULE")).toBeInTheDocument();
    expect(screen.getByText("SOURCE DAY (UTC)")).toBeInTheDocument();
    expect(screen.getByText("2023-10-24")).toBeInTheDocument();
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

  it("falls back when refresh metadata is an invalid date", () => {
    render(
      <StatusBar
        latestDate="2026-05-25"
        censorshipPct={33.4}
        lastRefresh={new Date("bad timestamp")}
        freshness={{
          ...freshness,
          status: "lagging",
          sourceDate: "2026-05-25",
          sourceAgeDays: 1,
          generatedAt: new Date("bad timestamp"),
          generatedAgeLabel: null,
          sourceLabel: "Daily snapshot through 2026-05-25",
        }}
      />,
    );

    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("refreshes the updated age immediately after mounting", () => {
    const RealDate = Date;
    let currentTimeCalls = 0;

    class MockDate extends RealDate {
      constructor(value?: string | number | Date) {
        if (arguments.length === 0) {
          currentTimeCalls += 1;
          super(
            currentTimeCalls === 1
              ? "2026-05-26T03:00:00Z"
              : "2026-05-26T04:00:00Z",
          );
          return;
        }

        super(value);
      }

      static now() {
        return new MockDate().getTime();
      }
    }

    vi.stubGlobal("Date", MockDate);

    render(
      <UpdatedAge
        generatedAt="2026-05-25T07:00:00Z"
        fallback="fallback"
      />,
    );

    expect(screen.getByText("21h ago")).toBeInTheDocument();
    expect(screen.queryByText("20h ago")).not.toBeInTheDocument();
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
