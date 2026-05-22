import { describe, it, expect } from "vitest";
import { classifySlot } from "./classify";

describe("classifySlot", () => {
  it("is nonboost when no relay delivered the slot", () => {
    expect(classifySlot([])).toBe("nonboost");
  });

  it("is neutral when only neutral relays delivered it", () => {
    expect(classifySlot(["relay.ultrasound.money"])).toBe("neutral");
  });

  it("is censoring when any censoring relay delivered it", () => {
    expect(classifySlot(["boost-relay.flashbots.net"])).toBe("censoring");
  });

  it("censoring wins over a mixed delivery set", () => {
    expect(
      classifySlot(["relay.ultrasound.money", "boost-relay.flashbots.net"]),
    ).toBe("censoring");
  });

  it("treats an unknown-posture relay as not censoring", () => {
    expect(classifySlot(["relay.ethgas.com"])).toBe("neutral");
  });
});
