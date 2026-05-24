import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { RelayPayloadSource } from "./relay-payloads";
import { RELAYS } from "@/config/relays";

beforeEach(() => {
  // Silence the per-relay failure warn for every test in this file — the
  // single test that asserts the warn shape installs its own spy below.
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

const SAMPLE = [
  {
    slot: "14382097",
    parent_hash: "0xpar",
    block_hash: "0xblk",
    builder_pubkey: "0xbuilder",
    proposer_pubkey: "0xprop",
    proposer_fee_recipient: "0xfee",
    gas_limit: "60000000",
    gas_used: "18802227",
    value: "5238498425452159",
    num_tx: "161",
    block_number: "25147170",
  },
];

afterEach(() => {
  vi.restoreAllMocks();
});

describe("RelayPayloadSource", () => {
  it("maps delivered payloads and tags them with the relay id", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify(SAMPLE), { status: 200 })),
    );

    const result = await new RelayPayloadSource().fetchRecentDeliveries();

    expect(result.okRelays).toHaveLength(RELAYS.length);
    expect(result.failedRelays).toHaveLength(0);

    const first = result.payloads[0];
    expect(first.slot).toBe(14382097);
    expect(first.numTx).toBe(161);
    expect(first.blockNumber).toBe(25147170);
    expect(first.valueWei).toBe("5238498425452159");
    expect(RELAYS.map((r) => r.id)).toContain(first.relayId);
  });

  it("requests limit at or below bloXroute's documented max of 100 (anything higher returns HTTP 400)", async () => {
    const fetchMock = vi.fn(
      async (_input: string | URL | Request, _init?: RequestInit) =>
        new Response(JSON.stringify(SAMPLE), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await new RelayPayloadSource().fetchRecentDeliveries();

    expect(fetchMock).toHaveBeenCalled();
    for (const call of fetchMock.mock.calls) {
      const url = new URL(String(call[0]));
      const limit = url.searchParams.get("limit");
      expect(limit).not.toBeNull();
      expect(Number(limit)).toBeGreaterThan(0);
      expect(Number(limit)).toBeLessThanOrEqual(100);
    }
  });

  it("emits a structured console.warn naming the relay and the failure reason", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (String(url).includes("flashbots")) {
          return new Response(
            '{"code":400,"message":"limit too high"}',
            { status: 400 },
          );
        }
        return new Response(JSON.stringify(SAMPLE), { status: 200 });
      }),
    );

    await new RelayPayloadSource().fetchRecentDeliveries();

    const flashbotsWarn = warnSpy.mock.calls.find((call) =>
      call.some(
        (arg) => typeof arg === "string" && arg.includes("flashbots"),
      ),
    );
    expect(flashbotsWarn).toBeDefined();
    const context = flashbotsWarn?.find(
      (arg) => typeof arg === "object" && arg !== null,
    ) as Record<string, unknown> | undefined;
    expect(context).toMatchObject({
      relayId: "boost-relay.flashbots.net",
      host: "boost-relay.flashbots.net",
    });
    expect(String(context?.message ?? "")).toContain("400");
  });

  it("does NOT warn for AbortError timeouts (expected per-poll noise; would drown new failures)", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: RequestInit) => {
        // Simulate fetch rejecting with an AbortError when the signal aborts.
        // The implementation's TIMEOUT_MS triggers controller.abort().
        await new Promise<void>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            const err = new Error("The operation was aborted.");
            err.name = "AbortError";
            reject(err);
          });
        });
        return new Response("[]", { status: 200 });
      }),
    );

    const result = await new RelayPayloadSource().fetchRecentDeliveries();

    expect(result.failedRelays.length).toBe(RELAYS.length);
    expect(warnSpy).not.toHaveBeenCalled();
  }, 10_000);

  it("skips a relay whose API fails, keeping the rest", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (String(url).includes("flashbots")) {
          return new Response("down", { status: 503 });
        }
        return new Response(JSON.stringify(SAMPLE), { status: 200 });
      }),
    );

    const result = await new RelayPayloadSource().fetchRecentDeliveries();

    expect(result.failedRelays).toContain("boost-relay.flashbots.net");
    expect(result.okRelays).not.toContain("boost-relay.flashbots.net");
    expect(result.okRelays).toHaveLength(RELAYS.length - 1);
  });
});
