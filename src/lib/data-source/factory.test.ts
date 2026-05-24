import { describe, it, expect } from "vitest";
import { getDataSource } from "./factory";
import { RelayscanDataSource } from "./relayscan";

describe("getDataSource", () => {
  it("returns a RelayscanDataSource", () => {
    expect(getDataSource()).toBeInstanceOf(RelayscanDataSource);
  });
});
