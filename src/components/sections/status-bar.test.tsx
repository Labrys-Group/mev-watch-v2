import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { DataFreshness } from "@/lib/data-freshness";
import { StatusBar } from "./status-bar";

const staleFreshness: DataFreshness = {
  status: "stale",
  sourceDate: "2023-10-24",
  sourceAgeDays: 945,
  generatedAt: new Date("2026-05-25T07:07:43.521Z"),
  generatedAgeLabel: "1d ago",
  sourceLabel: "Daily snapshot through 2023-10-24",
};

describe("StatusBar", () => {
  it("renders stale daily data state and keeps freshness visible", () => {
    render(
      <StatusBar
        latestDate="2023-10-24"
        censorshipPct={33.4}
        freshness={staleFreshness}
      />,
    );

    expect(screen.getByText("DAILY STALE")).toBeInTheDocument();
    expect(screen.getByText("DATA THROUGH")).toBeInTheDocument();
    expect(screen.getAllByText("2023-10-24")).not.toHaveLength(0);
    expect(screen.getByText("945d old")).toBeInTheDocument();
    expect(screen.getByText("33.4%")).toBeInTheDocument();
  });
});
