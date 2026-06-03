import { describe, expect, it } from "vitest";
import { OPTIONS } from "./route";

describe("OPTIONS /api/v1/summary", () => {
  it("allows browser CORS preflight requests with common headers", async () => {
    const response = await OPTIONS();

    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
    expect(response.headers.get("access-control-allow-methods")).toBe(
      "GET, OPTIONS",
    );
    expect(response.headers.get("access-control-allow-headers")).toBe(
      "Authorization, Content-Type",
    );
  });

  it("echoes requested non-simple headers for browser preflight requests", async () => {
    const request = new Request("https://www.mevwatch.info/api/v1/summary", {
      method: "OPTIONS",
      headers: {
        "Access-Control-Request-Headers": "X-Requested-With, X-Api-Key",
      },
    });
    const response = await (OPTIONS as (request: Request) => Response)(request);

    expect(response.headers.get("access-control-allow-headers")).toBe(
      "X-Requested-With, X-Api-Key",
    );
    expect(response.headers.get("vary")).toBe(
      "Access-Control-Request-Headers",
    );
  });
});
