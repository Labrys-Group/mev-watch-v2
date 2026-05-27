import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { EpochLedger } from "./epoch-ledger";
import type { LedgerData } from "@/lib/live-ledger/types";

function ledger(
  headSlot: number,
  category: "neutral" | "censoring",
  degradedRelays: string[] = [],
): LedgerData {
  return {
    headSlot,
    fetchedAt: "2026-05-26T00:00:00.000Z",
    degradedRelays,
    epochs: [
      {
        epoch: 3,
        inProgress: true,
        slots: Array.from({ length: 32 }, (_, index) => ({
          slot: 96 + index,
          indexInEpoch: index,
          category: index === 0 ? category : index > 3 ? "pending" : "nonboost",
          relays: index === 0 ? ["relay.ultrasound.money"] : [],
        })),
      },
      ...[2, 1, 0].map((epoch) => ({
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
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("EpochLedger", () => {
  it("renders four epoch rows from the initial data", () => {
    render(<EpochLedger initial={ledger(99, "neutral")} />);

    expect(screen.getByLabelText("Live epoch ledger")).toBeInTheDocument();
    expect(screen.getByLabelText("Epoch 3 in progress")).toBeInTheDocument();
    expect(screen.getByLabelText("Epoch 2")).toBeInTheDocument();
    expect(screen.getAllByTitle(/Slot /)).toHaveLength(128);
  });

  it("polls the API and keeps the last good state after a failed poll", async () => {
    const updated = ledger(100, "censoring");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json(updated))
      .mockRejectedValueOnce(new Error("network down"));
    vi.stubGlobal("fetch", fetchMock);

    render(<EpochLedger initial={ledger(99, "neutral")} />);

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.getByText("CENSORING")).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });

    expect(screen.getByText("LIVE CACHE STALE")).toBeInTheDocument();
    expect(screen.getByText("CENSORING")).toBeInTheDocument();
  });

  it("renders degraded coverage and censoring as separate explained statuses", () => {
    render(
      <EpochLedger
        initial={ledger(99, "censoring", ["bloxroute.max-profit.blxrbdn.com"])}
      />,
    );

    const statuses = screen.getByLabelText("Live ledger statuses");
    expect(statuses).toBeInTheDocument();

    expect(
      screen.getByLabelText(
        "Data status: Degraded relay coverage. One or more relay APIs did not respond, so the live ledger may be missing relay observations.",
      ),
    ).toHaveAttribute(
      "title",
      "One or more relay APIs did not respond, so the live ledger may be missing relay observations.",
    );
    expect(
      screen.getByLabelText(
        "Slot status: Censoring relay observed. At least one visible recent slot was delivered through a relay classified as censoring.",
      ),
    ).toHaveAttribute(
      "title",
      "At least one visible recent slot was delivered through a relay classified as censoring.",
    );
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });
});
