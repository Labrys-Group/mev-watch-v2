import { afterEach, describe, expect, it, vi } from "vitest";
import {
  readUpdateDataConcurrency,
  readUpdateDataRepairMaxDays,
} from "./update-data";

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

  it("returns undefined when UPDATE_DATA_REPAIR_MAX_DAYS is unset", () => {
    vi.stubEnv("UPDATE_DATA_REPAIR_MAX_DAYS", "");
    expect(readUpdateDataRepairMaxDays()).toBeUndefined();
  });

  it("returns 0 to skip repair when UPDATE_DATA_REPAIR_MAX_DAYS=0", () => {
    vi.stubEnv("UPDATE_DATA_REPAIR_MAX_DAYS", "0");
    expect(readUpdateDataRepairMaxDays()).toBe(0);
  });

  it("accepts a positive integer UPDATE_DATA_REPAIR_MAX_DAYS value", () => {
    vi.stubEnv("UPDATE_DATA_REPAIR_MAX_DAYS", "50");
    expect(readUpdateDataRepairMaxDays()).toBe(50);
  });

  it("returns undefined when UPDATE_DATA_REPAIR_MAX_DAYS is invalid", () => {
    vi.stubEnv("UPDATE_DATA_REPAIR_MAX_DAYS", "nope");
    expect(readUpdateDataRepairMaxDays()).toBeUndefined();
  });
});
