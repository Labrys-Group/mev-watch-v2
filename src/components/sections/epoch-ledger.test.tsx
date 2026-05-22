import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { EpochLedger } from "./epoch-ledger";
import type { LedgerData } from "@/lib/epochs/get-live-epochs";

function fakeLedger(): LedgerData {
  const epochs = [0, 1, 2, 3].map((e) => {
    const epoch = 449440 - e;
    const inProgress = e === 0;
    const slots = Array.from({ length: 32 }, (_, i) => ({
      slot: epoch * 32 + i,
      indexInEpoch: i,
      category:
        inProgress && i >= 20
          ? ("pending" as const)
          : i % 5 === 0
            ? ("censoring" as const)
            : ("neutral" as const),
      relays:
        i % 5 === 0
          ? ["boost-relay.flashbots.net"]
          : ["relay.ultrasound.money"],
      builder: "0xbuilder",
      valueWei: "52384984254521590",
      blockNumber: 25147000 + i,
      numTx: 120,
    }));
    return { epoch, inProgress, slots };
  });
  return {
    epochs,
    headSlot: 449440 * 32 + 19,
    fetchedAt: Date.now(),
    relaysOk: 8,
    relaysTotal: 8,
  };
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("EpochLedger", () => {
  it("renders four epoch rows with their epoch numbers", () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(() => {})));
    render(<EpochLedger initial={fakeLedger()} />);
    expect(screen.getByText("449,440")).toBeInTheDocument();
    expect(screen.getByText("449,437")).toBeInTheDocument();
  });

  it("labels the in-progress epoch as live with its filled count", () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(() => {})));
    render(<EpochLedger initial={fakeLedger()} />);
    expect(screen.getByText(/live · 20\/32/i)).toBeInTheDocument();
  });
});
