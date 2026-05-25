import { describe, it, expect } from "vitest";
import { RELAYS, HISTORICAL_RELAYS, classifyRelay } from "./relays";

const ALL_RELAYS = [...RELAYS, ...HISTORICAL_RELAYS];

describe("RELAYS config", () => {
  it("has unique relay ids across active and historical relays", () => {
    const ids = ALL_RELAYS.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("only uses valid posture values", () => {
    for (const r of ALL_RELAYS) {
      expect(["censoring", "neutral", "unknown"]).toContain(r.posture);
    }
  });

  it("matches the verified current relay table", () => {
    expect(RELAYS.map(({ id, name, posture }) => ({ id, name, posture }))).toEqual([
      {
        id: "relay.ultrasound.money",
        name: "Ultra Sound",
        posture: "neutral",
      },
      {
        id: "relay-filtered.ultrasound.money",
        name: "Ultra Sound Filtered",
        posture: "censoring",
      },
      {
        id: "titanrelay.xyz",
        name: "Titan Relay",
        posture: "neutral",
      },
      {
        id: "regional.titanrelay.xyz",
        name: "Titan Relay Regional",
        posture: "censoring",
      },
      {
        id: "bloxroute.max-profit.blxrbdn.com",
        name: "bloXroute Max Profit",
        posture: "censoring",
      },
      {
        id: "bloxroute.regulated.blxrbdn.com",
        name: "bloXroute Regulated",
        posture: "censoring",
      },
      {
        id: "aestus.live",
        name: "Aestus",
        posture: "neutral",
      },
      {
        id: "boost-relay.flashbots.net",
        name: "Flashbots",
        posture: "censoring",
      },
      {
        id: "agnostic-relay.net",
        name: "Agnostic Gnosis",
        posture: "neutral",
      },
      {
        id: "relay.ethgas.com",
        name: "EthGas",
        posture: "unknown",
      },
    ]);
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

describe("classifyRelay — date-aware posture", () => {
  // bloXroute Max Profit was non-censoring until bloXroute's 2023-12-18
  // announcement that all its relays would reject OFAC transactions.
  const MAX_PROFIT = "bloxroute.max-profit.blxrbdn.com";

  it("returns the historical posture for a date before a posture change", () => {
    expect(classifyRelay(MAX_PROFIT, "2023-01-15").posture).toBe("neutral");
  });

  it("returns the current posture on and after the change date", () => {
    expect(classifyRelay(MAX_PROFIT, "2023-12-18").posture).toBe("censoring");
    expect(classifyRelay(MAX_PROFIT, "2024-06-15").posture).toBe("censoring");
  });

  it("returns the current posture when no date is given", () => {
    expect(classifyRelay(MAX_PROFIT).posture).toBe("censoring");
  });

  it("ignores the date for a relay whose posture never changed", () => {
    expect(classifyRelay("boost-relay.flashbots.net", "2022-10-01").posture).toBe(
      "censoring",
    );
  });
});
