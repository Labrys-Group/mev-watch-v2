import { describe, it, expect, afterEach } from "vitest";
import { getDatabaseUrl } from "./env";

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
