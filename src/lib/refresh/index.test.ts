import { describe, it, expect, vi } from "vitest";
import { refreshDay } from "./index";
import type { DataSource, BlockCountSource } from "../data-source/types";

function fakeSource(overrides: Partial<DataSource> = {}): DataSource {
  return {
    name: "fake",
    fetchDay: vi.fn(async (date: string) => ({
      date,
      relays: [{ relayId: "relay.ultrasound.money", numPayloads: 100 }],
      builders: [],
    })),
    ...overrides,
  };
}

function fakeBlockSource(total = 7200): BlockCountSource {
  return {
    name: "fake-rpc",
    totalBlocks: vi.fn(async () => total),
  };
}

describe("refreshDay", () => {
  it("returns ok and persists the day with its chain block count", async () => {
    const persist = vi.fn(async () => {});
    const log = vi.fn(async () => {});
    const result = await refreshDay(
      "2026-05-20",
      fakeSource(),
      fakeBlockSource(7200),
      { persist, log },
    );

    expect(result.status).toBe("ok");
    expect(persist).toHaveBeenCalledWith(
      expect.objectContaining({ totalChainBlocks: 7200 }),
    );
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({ status: "ok", source: "fake" }),
    );
  });

  it("returns error and logs it when the relay source throws", async () => {
    const source = fakeSource({
      fetchDay: vi.fn(async () => {
        throw new Error("network down");
      }),
    });
    const persist = vi.fn(async () => {});
    const log = vi.fn(async () => {});
    const result = await refreshDay("2026-05-20", source, fakeBlockSource(), {
      persist,
      log,
    });

    expect(result.status).toBe("error");
    expect(persist).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({ status: "error", source: "fake" }),
    );
  });

  it("still succeeds with a zero block count when the block source fails", async () => {
    const blockSource: BlockCountSource = {
      name: "fake-rpc",
      totalBlocks: vi.fn(async () => {
        throw new Error("all RPC endpoints failed");
      }),
    };
    const persist = vi.fn(async () => {});
    const log = vi.fn(async () => {});
    const result = await refreshDay("2026-05-20", fakeSource(), blockSource, {
      persist,
      log,
    });

    expect(result.status).toBe("ok");
    expect(persist).toHaveBeenCalledWith(
      expect.objectContaining({ totalChainBlocks: 0 }),
    );
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "ok",
        message: expect.stringContaining("block count unavailable"),
      }),
    );
  });
});
