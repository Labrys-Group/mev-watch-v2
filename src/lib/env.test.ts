import { describe, it, expect, afterEach } from "vitest";
import { getDuneApiKey, getDunePayloadsQueryId } from "./env";

const original = { ...process.env };

afterEach(() => {
  process.env = { ...original };
});

describe("getDuneApiKey", () => {
  it("returns the key when set", () => {
    process.env.DUNE_API_KEY = "abc123";
    expect(getDuneApiKey()).toBe("abc123");
  });

  it("throws when missing", () => {
    delete process.env.DUNE_API_KEY;
    expect(() => getDuneApiKey()).toThrow(/DUNE_API_KEY/);
  });
});

describe("getDunePayloadsQueryId", () => {
  it("returns the numeric query id when set", () => {
    process.env.DUNE_PAYLOADS_QUERY_ID = "12345";
    expect(getDunePayloadsQueryId()).toBe(12345);
  });

  it("throws when missing", () => {
    delete process.env.DUNE_PAYLOADS_QUERY_ID;
    expect(() => getDunePayloadsQueryId()).toThrow(/DUNE_PAYLOADS_QUERY_ID/);
  });

  it("throws when not a positive integer", () => {
    process.env.DUNE_PAYLOADS_QUERY_ID = "not-a-number";
    expect(() => getDunePayloadsQueryId()).toThrow(/integer/i);
  });
});
