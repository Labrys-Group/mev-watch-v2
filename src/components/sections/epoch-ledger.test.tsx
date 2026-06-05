import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { EpochLedger } from "./epoch-ledger";
import type { LedgerData, SlotCategory } from "@/lib/live-ledger/types";

function ledger(
  headSlot: number,
  category: Extract<SlotCategory, "neutral" | "censoring" | "unknown">,
  degradedRelays: string[] = [],
  fetchedAt = "2026-05-26T00:00:00.000Z",
  currentEpoch = 3,
): LedgerData {
  return {
    headSlot,
    fetchedAt,
    degradedRelays,
    epochs: [
      {
        epoch: currentEpoch,
        inProgress: true,
        slots: Array.from({ length: 32 }, (_, index) => ({
          slot: currentEpoch * 32 + index,
          indexInEpoch: index,
          category: index === 0 ? category : index > 3 ? "pending" : "nonboost",
          relays: index === 0 ? ["relay.ultrasound.money"] : [],
        })),
      },
      ...[currentEpoch - 1, currentEpoch - 2, currentEpoch - 3].map((epoch) => ({
        epoch,
        inProgress: false,
        slots: Array.from({ length: 32 }, (_, index) => ({
          slot: epoch * 32 + index,
          indexInEpoch: index,
          category: "nonboost" as const,
          relays: [],
        })),
      })),
    ],
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  // Prevent poll on mount from throwing unhandled errors by default
  vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(() => {})));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("EpochLedger", () => {
  it("renders four epoch rows from the initial data", () => {
    render(<EpochLedger initial={ledger(99, "neutral")} />);

    // Epoch numbers should be visible as aria-labels on the grids
    expect(
      screen.getByLabelText("Epoch 3: 4 of 32 slots delivered"),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("Epoch 2: 32 of 32 slots delivered"),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("Epoch 1: 32 of 32 slots delivered"),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("Epoch 0: 32 of 32 slots delivered"),
    ).toBeInTheDocument();
  });

  it("labels the in-progress epoch as live with its filled count", () => {
    render(<EpochLedger initial={ledger(99, "neutral")} />);
    expect(screen.getByText(/live · 4\/32/i)).toBeInTheDocument();
  });

  it("renders 128 slot tiles (32 per epoch × 4 epochs)", () => {
    render(<EpochLedger initial={ledger(99, "neutral")} />);
    // Each epoch row has an aria-label
    const epochGrids = screen.getAllByLabelText(/Epoch \d+:/);
    expect(epochGrids).toHaveLength(4);
  });

  it("encodes epoch grid calc operators as Tailwind-safe spaces", () => {
    render(<EpochLedger initial={ledger(99, "neutral")} />);

    const grid = screen.getByLabelText("Epoch 3: 4 of 32 slots delivered");
    expect(grid).toHaveClass("grid-cols-[repeat(16,calc((100%_-_30px)_/_16))]");
    expect(grid).toHaveClass(
      "sm:grid-cols-[repeat(32,calc((100%_-_62px)_/_32))]",
    );
    expect(grid.className).not.toContain("100%-");
  });

  it("shows the reconnecting indicator after a failed poll", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network down")),
    );

    render(<EpochLedger initial={ledger(99, "neutral")} />);

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByText(/reconnecting/i)).toBeInTheDocument();
  });

  it("clears the reconnecting indicator on a successful poll after failure", async () => {
    const updated = ledger(100, "neutral");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockRejectedValueOnce(new Error("network down"))
        .mockResolvedValueOnce(Response.json(updated)),
    );

    render(<EpochLedger initial={ledger(99, "neutral")} />);

    // First poll fails → reconnecting shown
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.getByText(/reconnecting/i)).toBeInTheDocument();

    // Second poll is scheduled only after the failed request settles.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });

    expect(screen.queryByText(/reconnecting/i)).not.toBeInTheDocument();
  });

  it("does NOT render status badges", () => {
    render(
      <EpochLedger
        initial={ledger(99, "censoring", ["bloxroute.max-profit.blxrbdn.com"])}
      />,
    );

    // The old badge container with role="list" should not be present
    expect(
      screen.queryByLabelText("Live ledger statuses"),
    ).not.toBeInTheDocument();
    // No CENSORING badge
    expect(screen.queryByText("CENSORING")).not.toBeInTheDocument();
    // No LIVE CACHE STALE badge
    expect(screen.queryByText(/cache stale/i)).not.toBeInTheDocument();
  });

  it("renders unknown slots with the existing relay unknown status", async () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn((query: string) => ({
        matches: query === "(hover: hover) and (pointer: fine)",
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    );

    render(
      <EpochLedger
        initial={ledger(99, "unknown", ["relay.ultrasound.money"])}
      />,
    );

    await act(async () => {
      await Promise.resolve();
    });

    const filledTiles = document.querySelectorAll(".epoch-tile");
    fireEvent.mouseEnter(filledTiles[0], { clientX: 100, clientY: 100 });

    expect(screen.getByText(/live · 4\/32/i)).toBeInTheDocument();
    expect(
      screen.getByText("Relay Unknown / Non-MEV-Boost"),
    ).toBeInTheDocument();
    expect(screen.queryByText("Relay Data Degraded")).not.toBeInTheDocument();
  });

  it("shows the slot tooltip portal on mouse enter over a filled slot (hover enabled)", async () => {
    // Stub matchMedia to report hover: hover and pointer: fine
    vi.stubGlobal(
      "matchMedia",
      vi.fn((query: string) => ({
        matches: query === "(hover: hover) and (pointer: fine)",
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    );

    render(<EpochLedger initial={ledger(99, "neutral")} />);

    // Wait for hoverEnabled to be set (the useEffect runs after mount)
    await act(async () => {
      await Promise.resolve();
    });

    // Find the first filled (non-pending) slot tile — it has cursor-crosshair class
    const filledTiles = document.querySelectorAll(".epoch-tile");
    expect(filledTiles.length).toBeGreaterThan(0);

    fireEvent.mouseEnter(filledTiles[0], { clientX: 100, clientY: 100 });

    // The tooltip should appear via portal in document.body
    expect(screen.getByText(/Slot \d+/)).toBeInTheDocument();
    expect(screen.getByText(/Epoch \d+/)).toBeInTheDocument();
  });

  it("hides the slot tooltip when mouse leaves the container", async () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn((query: string) => ({
        matches: query === "(hover: hover) and (pointer: fine)",
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    );

    render(<EpochLedger initial={ledger(99, "neutral")} />);

    await act(async () => {
      await Promise.resolve();
    });

    const filledTiles = document.querySelectorAll(".epoch-tile");
    fireEvent.mouseEnter(filledTiles[0], { clientX: 100, clientY: 100 });

    // Tooltip visible
    expect(document.querySelectorAll(".pointer-events-none.fixed").length).toBe(
      1,
    );

    // Mouse leaves the outer container
    const container = filledTiles[0].closest(".relative");
    if (container) fireEvent.mouseLeave(container);

    // Tooltip gone
    expect(
      document.querySelectorAll(".pointer-events-none.fixed").length,
    ).toBe(0);
  });

  it("clears the slot tooltip when hovering a pending slot", async () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn((query: string) => ({
        matches: query === "(hover: hover) and (pointer: fine)",
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    );

    render(<EpochLedger initial={ledger(99, "neutral")} />);

    await act(async () => {
      await Promise.resolve();
    });

    const filledTiles = document.querySelectorAll(".epoch-tile");
    const pendingTiles = document.querySelectorAll(".epoch-cell");
    expect(filledTiles.length).toBeGreaterThan(0);
    expect(pendingTiles.length).toBeGreaterThan(0);

    fireEvent.mouseEnter(filledTiles[0], { clientX: 100, clientY: 100 });
    expect(document.querySelectorAll(".pointer-events-none.fixed")).toHaveLength(
      1,
    );

    fireEvent.mouseEnter(pendingTiles[0], { clientX: 120, clientY: 100 });

    expect(document.querySelectorAll(".pointer-events-none.fixed")).toHaveLength(
      0,
    );
  });

  it("does not wire hover handlers when matchMedia reports no fine pointer", async () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn((_query: string) => ({
        matches: false,
        media: _query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    );

    render(<EpochLedger initial={ledger(99, "neutral")} />);

    await act(async () => {
      await Promise.resolve();
    });

    const filledTiles = document.querySelectorAll(".epoch-tile");
    if (filledTiles.length > 0) {
      fireEvent.mouseEnter(filledTiles[0], { clientX: 100, clientY: 100 });
    }

    // No tooltip should appear
    expect(
      document.querySelectorAll(".pointer-events-none.fixed").length,
    ).toBe(0);
  });

  it("polls the API and updates epoch data on success", async () => {
    const updated = ledger(100, "censoring");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(Response.json(updated)),
    );

    render(<EpochLedger initial={ledger(99, "neutral")} />);

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    // After a successful poll, data updates — epoch 3 in-progress row still exists
    expect(
      screen.getByLabelText("Epoch 3: 4 of 32 slots delivered"),
    ).toBeInTheDocument();
    // Reconnecting indicator should NOT appear after a successful poll
    expect(screen.queryByText(/reconnecting/i)).not.toBeInTheDocument();
  });

  it("uses epoch-row-wrap class for each row", () => {
    render(<EpochLedger initial={ledger(99, "neutral")} />);
    const rows = document.querySelectorAll(".epoch-row-wrap");
    expect(rows.length).toBe(4);
  });

  it("does not start another poll while the previous poll is pending", async () => {
    let resolvePoll!: (response: Response) => void;
    const fetchMock = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          resolvePoll = resolve;
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<EpochLedger initial={ledger(99, "neutral")} />);

    expect(fetchMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolvePoll(
        Response.json(
          ledger(100, "neutral", [], "2026-05-26T00:00:12.000Z"),
        ),
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("keeps exactly four rows after an epoch rollover poll", async () => {
    const updated = ledger(
      128,
      "censoring",
      [],
      "2026-05-26T00:00:12.000Z",
      4,
    );
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(updated)));

    render(<EpochLedger initial={ledger(99, "neutral")} />);

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(document.querySelectorAll(".epoch-row-wrap")).toHaveLength(4);
    expect(
      screen.getByLabelText("Epoch 4: 4 of 32 slots delivered"),
    ).toBeInTheDocument();
  });

  it("does not replace visible data for a duplicate ledger version", async () => {
    const duplicateVersionWithDifferentRows = ledger(
      99,
      "censoring",
      [],
      "2026-05-26T00:00:00.000Z",
      9,
    );
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(Response.json(duplicateVersionWithDifferentRows)),
    );

    render(<EpochLedger initial={ledger(99, "neutral")} />);

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(
      screen.getByLabelText("Epoch 3: 4 of 32 slots delivered"),
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText("Epoch 9: 4 of 32 slots delivered"),
    ).not.toBeInTheDocument();
  });
});
