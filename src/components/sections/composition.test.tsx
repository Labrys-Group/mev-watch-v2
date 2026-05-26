import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { DataFreshness } from "@/lib/data-freshness";
import type { LedgerData } from "@/lib/live-ledger/types";
import type { LatestStats } from "@/lib/queries";
import { Composition } from "./composition";

vi.mock("./epoch-ledger", () => ({
  EpochLedger: () => (
    <div aria-label="Live epoch ledger">Live recent slots</div>
  ),
}));

const latest: LatestStats = {
  date: "2023-10-24",
  censorshipPct: 33.4,
  neutralPct: 66.6,
  nonBoostPct: 10,
  totalBlocks: 11869,
};

const ledger: LedgerData = {
  headSlot: 1,
  fetchedAt: "2026-05-26T00:00:00.000Z",
  degradedRelays: [],
  epochs: [],
};

const freshness: DataFreshness = {
  status: "stale",
  sourceDate: "2023-10-24",
  sourceAgeDays: 945,
  generatedAt: null,
  generatedAgeLabel: null,
  sourceLabel: "Daily snapshot through 2023-10-24",
};

describe("Composition", () => {
  it("labels daily relay totals as deliveries and separates live ledger context", () => {
    render(<Composition latest={latest} ledger={ledger} freshness={freshness} />);

    expect(screen.getAllByText("Daily snapshot through 2023-10-24").length).toBeGreaterThan(0);
    expect(screen.getByText(/11,869 DELIVERIES/)).toBeInTheDocument();
    expect(screen.getAllByText("MEV-boost deliveries")).toHaveLength(2);
    expect(screen.getByLabelText("Live epoch ledger")).toBeInTheDocument();
    expect(
      screen.getByText("Recent slots, independent of the daily snapshot"),
    ).toBeInTheDocument();
  });
});
