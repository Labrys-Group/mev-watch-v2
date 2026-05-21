import { describe, it, expect } from "vitest";
import { RELAYS, classifyRelay } from "./relays";

describe("RELAYS config", () => {
  it("has unique relay ids", () => {
    const ids = RELAYS.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("only uses valid posture values", () => {
    for (const r of RELAYS) {
      expect(["censoring", "neutral", "unknown"]).toContain(r.posture);
    }
  });
});

describe("classifyRelay", () => {
  it("returns the known posture for a configured relay", () => {
    expect(classifyRelay("boost-relay.flashbots.net").posture).toBe("censoring");
    expect(classifyRelay("relay.ultrasound.money").posture).toBe("neutral");
  });

  it("returns an unknown entry for an unconfigured relay", () => {
    const result = classifyRelay("brand-new-relay.example");
    expect(result.posture).toBe("unknown");
    expect(result.id).toBe("brand-new-relay.example");
    expect(result.name).toBe("brand-new-relay.example");
  });
});
