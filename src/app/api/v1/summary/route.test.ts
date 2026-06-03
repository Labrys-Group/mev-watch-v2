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
});
