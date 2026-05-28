import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import * as embedPage from "./page";

vi.mock("@/lib/queries", () => ({
  getLatestStats: vi.fn(async () => ({
    date: "2023-10-24",
    censorshipPct: 33.4,
    neutralPct: 66.6,
    nonBoostPct: 10,
    totalBlocks: 11869,
  })),
  getStatsSummary: vi.fn(async () => ({
    current: 33.4,
    peak: 80,
    peakDate: "2022-11-01",
    trough: 20,
  })),
}));

describe("embed page", () => {
  it("uses a short route metadata title", () => {
    expect(embedPage.metadata.title).toBe("Embed");
  });

  it("renders the metric with OFAC-censoring relay wording", async () => {
    render(await embedPage.default());

    expect(screen.getByText("33.4%")).toBeInTheDocument();
    expect(
      screen.getByText("of MEV-boost blocks via OFAC-censoring relays"),
    ).toBeInTheDocument();
  });
});
