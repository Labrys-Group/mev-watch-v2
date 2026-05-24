import { describe, it, expect, afterEach } from "vitest";
import { getDataSource } from "./factory";

const original = process.env.DATA_SOURCE_MODE;

afterEach(() => {
  if (original === undefined) {
    delete process.env.DATA_SOURCE_MODE;
  } else {
    process.env.DATA_SOURCE_MODE = original;
  }
});

describe("getDataSource", () => {
  it("returns a DataSource whose name is relayscan.io (default mode)", () => {
    delete process.env.DATA_SOURCE_MODE;
    const ds = getDataSource();
    expect(ds.name).toBe("relayscan.io");
    expect(typeof ds.fetchDay).toBe("function");
  });

  it("accepts an explicit DATA_SOURCE_MODE=relayscan", () => {
    process.env.DATA_SOURCE_MODE = "relayscan";
    expect(getDataSource().name).toBe("relayscan.io");
  });

  it("throws on an unknown DATA_SOURCE_MODE so stale env vars fail loud", () => {
    process.env.DATA_SOURCE_MODE = "composite";
    expect(() => getDataSource()).toThrow(/DATA_SOURCE_MODE/);
  });
});
