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
  it("renders the 2-tile epoch-grid layout with correct labels", () => {
    render(<Composition latest={latest} ledger={ledger} freshness={freshness} />);

    // Section title
    expect(screen.getByText("Censoring vs. neutral relays.")).toBeInTheDocument();

    // Aside block count (not DELIVERIES)
    expect(screen.getByText(/11,869 BLOCKS/)).toBeInTheDocument();

    // Live epoch ledger wired via prop
    expect(screen.getByLabelText("Live epoch ledger")).toBeInTheDocument();

    // Legend strip
    expect(screen.getByText("OFAC Censoring")).toBeInTheDocument();
    expect(screen.getByText("Neutral")).toBeInTheDocument();
    expect(screen.getByText("Non-MEV-Boost")).toBeInTheDocument();

    // 2-tile labels
    expect(screen.getAllByText("Censoring relays").length).toBeGreaterThan(0);
    expect(screen.getByText("Neutral relays")).toBeInTheDocument();

    // Tile sub-labels use "MEV-boost deliveries"
    expect(screen.getAllByText("MEV-boost deliveries")).toHaveLength(2);

    // 3-band composition view should NOT appear
    expect(screen.queryByText("Non-censoring + unknown")).not.toBeInTheDocument();
    expect(screen.queryByText("Non-censoring relays")).not.toBeInTheDocument();
    // The old aside had "{N} DELIVERIES" as the block-count label; it is now "BLOCKS"
    expect(screen.queryByText(/\d+,?\d* DELIVERIES/)).not.toBeInTheDocument();
  });
});
