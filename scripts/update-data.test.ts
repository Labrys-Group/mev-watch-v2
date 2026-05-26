import { afterEach, describe, expect, it, vi } from "vitest";
import { readUpdateDataConcurrency } from "./update-data";

describe("update-data script tuning", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("falls back when UPDATE_DATA_CONCURRENCY is invalid", () => {
    vi.stubEnv("UPDATE_DATA_CONCURRENCY", "nope");
    expect(readUpdateDataConcurrency()).toBe(8);
  });

  it("accepts positive integer UPDATE_DATA_CONCURRENCY values", () => {
    vi.stubEnv("UPDATE_DATA_CONCURRENCY", "3.9");
    expect(readUpdateDataConcurrency()).toBe(3);
  });
});
