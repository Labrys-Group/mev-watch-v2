import { describe, it, expect, vi } from "vitest";
import { CompositeDataSource } from "./composite";
import type { DataSource } from "./types";

const makeSource = (
  name: string,
  result: { relays?: unknown[]; builders?: unknown[] },
): DataSource => ({
  name,
  fetchDay: vi.fn(async (date: string) => ({
    date,
    relays: (result.relays ?? []) as never,
    builders: (result.builders ?? []) as never,
  })),
});

describe("CompositeDataSource", () => {
  it("composes the name from both children", () => {
    const composite = new CompositeDataSource(
      makeSource("dune.com", {}),
      makeSource("relayscan.io", {}),
    );
    expect(composite.name).toBe("dune.com+relayscan.io");
  });

  it("takes relays from the first source and builders from the second", async () => {
    const relays = [{ relayId: "ultra", numPayloads: 100 }];
    const builders = [{ builderId: "titan", numBlocks: 50 }];
    const composite = new CompositeDataSource(
      makeSource("dune.com", { relays, builders: [{ builderId: "WRONG", numBlocks: 1 }] }),
      makeSource("relayscan.io", { relays: [{ relayId: "WRONG", numPayloads: 1 }], builders }),
    );

    const result = await composite.fetchDay("2026-05-21");

    expect(result.date).toBe("2026-05-21");
    expect(result.relays).toEqual(relays);
    expect(result.builders).toEqual(builders);
  });

  it("fetches both children in parallel", async () => {
    const order: string[] = [];
    const slowRelays: DataSource = {
      name: "dune.com",
      fetchDay: vi.fn(async (date: string) => {
        await new Promise((r) => setTimeout(r, 20));
        order.push("relays");
        return { date, relays: [], builders: [] };
      }),
    };
    const fastBuilders: DataSource = {
      name: "relayscan.io",
      fetchDay: vi.fn(async (date: string) => {
        order.push("builders");
        return { date, relays: [], builders: [] };
      }),
    };

    await new CompositeDataSource(slowRelays, fastBuilders).fetchDay("2026-05-21");

    expect(order).toEqual(["builders", "relays"]);
  });

  it("propagates errors from the relays child", async () => {
    const broken: DataSource = {
      name: "dune.com",
      fetchDay: vi.fn(async () => {
        throw new Error("dune down");
      }),
    };
    const ok = makeSource("relayscan.io", {});
    await expect(
      new CompositeDataSource(broken, ok).fetchDay("2026-05-21"),
    ).rejects.toThrow(/dune down/);
  });

  it("propagates errors from the builders child", async () => {
    const ok = makeSource("dune.com", {});
    const broken: DataSource = {
      name: "relayscan.io",
      fetchDay: vi.fn(async () => {
        throw new Error("relayscan down");
      }),
    };
    await expect(
      new CompositeDataSource(ok, broken).fetchDay("2026-05-21"),
    ).rejects.toThrow(/relayscan down/);
  });
});
