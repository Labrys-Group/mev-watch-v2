import { afterEach, describe, expect, it, vi } from "vitest";
import { isAuthorizedCronRequest } from "./route";

describe("Vercel data cron route", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects requests when CRON_SECRET is not configured", () => {
    vi.stubEnv("CRON_SECRET", "");

    const request = new Request("https://mevwatch.info/api/cron/update-data", {
      headers: { authorization: "Bearer anything" },
    });

    expect(isAuthorizedCronRequest(request)).toBe(false);
  });

  it("accepts Vercel cron requests with the configured bearer secret", () => {
    vi.stubEnv("CRON_SECRET", "s3cret");

    const request = new Request("https://mevwatch.info/api/cron/update-data", {
      headers: { authorization: "Bearer s3cret" },
    });

    expect(isAuthorizedCronRequest(request)).toBe(true);
  });
});
