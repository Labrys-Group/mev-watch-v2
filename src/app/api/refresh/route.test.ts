import { describe, it, expect, afterEach } from "vitest";
import { GET } from "./route";

const original = process.env.CRON_SECRET;
afterEach(() => {
  process.env.CRON_SECRET = original;
});

function request(authHeader?: string): Request {
  return new Request("http://localhost/api/refresh", {
    headers: authHeader ? { authorization: authHeader } : {},
  });
}

describe("GET /api/refresh", () => {
  it("returns 401 when no CRON_SECRET is configured", async () => {
    delete process.env.CRON_SECRET;
    const res = await GET(request("Bearer anything"));
    expect(res.status).toBe(401);
  });

  it("returns 401 when the Authorization header does not match", async () => {
    process.env.CRON_SECRET = "s3cret";
    const res = await GET(request("Bearer wrong"));
    expect(res.status).toBe(401);
  });
});
