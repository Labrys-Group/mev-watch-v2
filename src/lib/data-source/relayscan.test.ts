import { describe, it, expect, vi, afterEach } from "vitest";
import { RelayscanDataSource } from "./relayscan";

const SAMPLE = {
  date: "2026-05-20",
  relays: [
    { relay: "relay.ultrasound.money", num_payloads: 4163, percent: "35.41" },
    { relay: "boost-relay.flashbots.net", num_payloads: 283, percent: "2.40" },
  ],
  builders: [],
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("RelayscanDataSource", () => {
  it("fetchDay parses relay payload counts for a date", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify(SAMPLE), { status: 200 })),
    );

    const source = new RelayscanDataSource();
    const result = await source.fetchDay("2026-05-20");

    expect(result.date).toBe("2026-05-20");
    expect(result.relays).toEqual([
      { relayId: "relay.ultrasound.money", numPayloads: 4163 },
      { relayId: "boost-relay.flashbots.net", numPayloads: 283 },
    ]);
  });

  it("requests the correct daily endpoint", async () => {
    const fetchMock = vi.fn(
      async () => new Response(JSON.stringify(SAMPLE), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await new RelayscanDataSource().fetchDay("2026-05-20");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://www.relayscan.io/stats/day/2026-05-20/json",
      expect.any(Object),
    );
  });

  it("throws on a non-OK HTTP status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("not found", { status: 404 })),
    );
    await expect(new RelayscanDataSource().fetchDay("2026-05-20")).rejects.toThrow(
      /relayscan/i,
    );
  });

  it("throws when the response shape is invalid", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ wrong: true }), { status: 200 })),
    );
    await expect(new RelayscanDataSource().fetchDay("2026-05-20")).rejects.toThrow();
  });

  it("has the provider name 'relayscan.io'", () => {
    expect(new RelayscanDataSource().name).toBe("relayscan.io");
  });
});
