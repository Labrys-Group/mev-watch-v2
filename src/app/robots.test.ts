import { describe, expect, it } from "vitest";
import robots from "./robots";

describe("robots", () => {
  it("keeps public v1 API downloads crawlable for dataset structured data", () => {
    const config = robots();
    const rules = Array.isArray(config.rules) ? config.rules[0] : config.rules;

    expect(rules.allow).toEqual(["/", "/api/v1/"]);
    expect(rules.disallow).toEqual(["/api/", "/embed", "/preview"]);
  });
});
