import { describe, it, expect, afterEach } from "vitest";
import { getDataSource } from "./factory";
import { RelayscanDataSource } from "./relayscan";
import { CompositeDataSource } from "./composite";

const original = { ...process.env };

afterEach(() => {
  process.env = { ...original };
});

describe("getDataSource", () => {
  it("returns a RelayscanDataSource when DATA_SOURCE_MODE is unset", () => {
    delete process.env.DATA_SOURCE_MODE;
    expect(getDataSource()).toBeInstanceOf(RelayscanDataSource);
  });

  it("returns a RelayscanDataSource when DATA_SOURCE_MODE=relayscan", () => {
    process.env.DATA_SOURCE_MODE = "relayscan";
    expect(getDataSource()).toBeInstanceOf(RelayscanDataSource);
  });

  it("returns a CompositeDataSource when DATA_SOURCE_MODE=composite", () => {
    process.env.DATA_SOURCE_MODE = "composite";
    process.env.DUNE_API_KEY = "k";
    process.env.DUNE_PAYLOADS_QUERY_ID = "42";
    const source = getDataSource();
    expect(source).toBeInstanceOf(CompositeDataSource);
    expect(source.name).toBe("dune.com+relayscan.io");
  });

  it("throws on an unknown DATA_SOURCE_MODE", () => {
    process.env.DATA_SOURCE_MODE = "made-up";
    expect(() => getDataSource()).toThrow(/DATA_SOURCE_MODE/);
  });
});
