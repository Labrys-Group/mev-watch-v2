import { describe, it, expect, afterEach } from "vitest";
import { getDatabaseUrl } from "./env";

// Mutate the keys we touch and restore each individually — never reassign
// `process.env`, which would replace Node's host object with a plain object
// (loses Windows case-insensitive lookup, breaks the object identity that
// later tests in the same vitest worker may capture).
const original = process.env.DATABASE_URL;

afterEach(() => {
  if (original === undefined) {
    delete process.env.DATABASE_URL;
  } else {
    process.env.DATABASE_URL = original;
  }
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
