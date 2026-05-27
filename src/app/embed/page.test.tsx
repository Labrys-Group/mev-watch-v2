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
  getLastRefresh: vi.fn(async () => ({
    ranAt: new Date("2026-05-25T07:07:43.521Z"),
    status: "ok",
    source: "src/data/mev-watch.sqlite",
    message: "Data through 2023-10-24",
  })),
}));

describe("embed page", () => {
  it("uses a short route metadata title", () => {
    expect(embedPage.metadata.title).toBe("Embed");
  });

  it("renders snapshot freshness and delivery-share wording", async () => {
    render(await embedPage.default());

    expect(screen.getByText("33.4%")).toBeInTheDocument();
    expect(screen.getByText("Daily snapshot through 2023-10-24")).toBeInTheDocument();
    expect(
      screen.getByText("Censoring relay delivery share"),
    ).toBeInTheDocument();
    expect(screen.queryByText(/OFAC/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/blocks via censoring relays/i)).not.toBeInTheDocument();
  });
});
