import { describe, it, expect, afterEach } from "vitest";
import { getDatabaseUrl, getDuneApiKey, getDunePayloadsQueryId } from "./env";

const original = { ...process.env };

afterEach(() => {
  process.env = { ...original };
});

describe("getDatabaseUrl", () => {
  it("returns the value when DATABASE_URL is set", () => {
    process.env.DATABASE_URL = "file:./data/test.db";
    expect(getDatabaseUrl()).toBe("file:./data/test.db");
  });

  it("throws a clear error when DATABASE_URL is missing", () => {
    delete process.env.DATABASE_URL;
    expect(() => getDatabaseUrl()).toThrow(/DATABASE_URL/);
  });
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
