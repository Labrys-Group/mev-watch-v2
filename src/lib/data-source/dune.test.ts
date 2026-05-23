import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { DuneDataSource } from "./dune";

const okResponse = (body: unknown) =>
  new Response(JSON.stringify(body), { status: 200 });

beforeEach(() => {
  // Make the 2s poll interval instant.
  vi.spyOn(global, "setTimeout").mockImplementation((cb: () => void) => {
    cb();
    return 0 as unknown as NodeJS.Timeout;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("DuneDataSource", () => {
  it("has the provider name 'dune.com'", () => {
    expect(new DuneDataSource("key", 1).name).toBe("dune.com");
  });

  it("executes the query, polls to completion, and parses the result rows", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(okResponse({ execution_id: "exec-1" })) // execute
      .mockResolvedValueOnce(okResponse({ state: "QUERY_STATE_EXECUTING" })) // poll 1
      .mockResolvedValueOnce(okResponse({ state: "QUERY_STATE_COMPLETED" })) // poll 2
      .mockResolvedValueOnce(
        okResponse({
          result: {
            rows: [
              { relay: "relay.ultrasound.money", num_payloads: 2380 },
              { relay: "titanrelay.xyz", num_payloads: 1680 },
            ],
          },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const result = await new DuneDataSource("key-123", 42).fetchDay("2026-05-21");

    expect(result.date).toBe("2026-05-21");
    expect(result.relays).toEqual([
      { relayId: "relay.ultrasound.money", numPayloads: 2380 },
      { relayId: "titanrelay.xyz", numPayloads: 1680 },
    ]);
    expect(result.builders).toEqual([]);

    // 1 execute + 2 polls + 1 results = 4 calls
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("sends the date parameter to the execute endpoint", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(okResponse({ execution_id: "exec-1" }))
      .mockResolvedValueOnce(okResponse({ state: "QUERY_STATE_COMPLETED" }))
      .mockResolvedValueOnce(okResponse({ result: { rows: [] } }));
    vi.stubGlobal("fetch", fetchMock);

    await new DuneDataSource("key-123", 42).fetchDay("2026-05-21");

    const executeCall = fetchMock.mock.calls[0];
    expect(executeCall[0]).toBe("https://api.dune.com/api/v1/query/42/execute");
    const body = JSON.parse(executeCall[1].body as string);
    expect(body).toEqual({ query_parameters: { date: "2026-05-21" } });
    expect(executeCall[1].headers["X-Dune-API-Key"]).toBe("key-123");
  });

  it("throws when the execute endpoint returns a non-OK status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(new Response("nope", { status: 500 })),
    );
    await expect(
      new DuneDataSource("k", 1).fetchDay("2026-05-21"),
    ).rejects.toThrow(/dune/i);
  });

  it("throws when the poll reports QUERY_STATE_FAILED", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(okResponse({ execution_id: "exec-1" }))
        .mockResolvedValueOnce(okResponse({ state: "QUERY_STATE_FAILED" })),
    );
    await expect(
      new DuneDataSource("k", 1).fetchDay("2026-05-21"),
    ).rejects.toThrow(/failed/i);
  });

  it("throws when the result shape is invalid", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(okResponse({ execution_id: "exec-1" }))
        .mockResolvedValueOnce(okResponse({ state: "QUERY_STATE_COMPLETED" }))
        .mockResolvedValueOnce(okResponse({ unexpected: true })),
    );
    await expect(
      new DuneDataSource("k", 1).fetchDay("2026-05-21"),
    ).rejects.toThrow();
  });
});
