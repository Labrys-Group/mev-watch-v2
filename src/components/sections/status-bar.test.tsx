import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

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
  it("renders DAILY FRESH from the freshness verdict and shows latest date + censorship pct", () => {
    render(
      <StatusBar
        latestDate="2023-10-24"
        censorshipPct={33.4}
        freshness={freshness}
      />,
    );

    expect(screen.getByText("DAILY FRESH")).toBeInTheDocument();
    expect(screen.getByText("DATA THROUGH")).toBeInTheDocument();
    expect(screen.getByText("2023-10-24")).toBeInTheDocument();
    expect(screen.getByText("33.4%")).toBeInTheDocument();
    expect(screen.queryByText(/DAILY STALE/i)).not.toBeInTheDocument();
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
    expect(screen.queryByText("DAILY FRESH")).not.toBeInTheDocument();
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
    expect(screen.queryByText("DAILY FRESH")).not.toBeInTheDocument();
  });
});
