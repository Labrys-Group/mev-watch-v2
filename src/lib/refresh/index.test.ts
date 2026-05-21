import { describe, it, expect, vi } from "vitest";
import { refreshDay } from "./index";
import type { DataSource } from "../data-source/types";

function fakeSource(overrides: Partial<DataSource> = {}): DataSource {
  return {
    name: "fake",
    fetchDay: vi.fn(async (date: string) => ({
      date,
      relays: [{ relayId: "relay.ultrasound.money", numPayloads: 100 }],
    })),
    ...overrides,
  };
}

describe("refreshDay", () => {
  it("returns ok with the date when the source succeeds", async () => {
    const persist = vi.fn(async () => {});
    const log = vi.fn(async () => {});
    const result = await refreshDay("2026-05-20", fakeSource(), { persist, log });

    expect(result.status).toBe("ok");
    expect(persist).toHaveBeenCalledOnce();
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({ status: "ok", source: "fake" }),
    );
  });

  it("returns error and logs it when the source throws", async () => {
    const source = fakeSource({
      fetchDay: vi.fn(async () => {
        throw new Error("network down");
      }),
    });
    const persist = vi.fn(async () => {});
    const log = vi.fn(async () => {});
    const result = await refreshDay("2026-05-20", source, { persist, log });

    expect(result.status).toBe("error");
    expect(persist).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({ status: "error", source: "fake" }),
    );
  });
});
