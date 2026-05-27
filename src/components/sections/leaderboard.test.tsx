import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BuilderLeaderboard } from "./builder-leaderboard";
import { Leaderboard } from "./leaderboard";

describe("relay leaderboard terminology", () => {
  it("labels relay payload counts as deliveries, not blocks", () => {
    render(
      <Leaderboard
        rows={[
          {
            relayId: "relay-a",
            name: "Relay A",
            posture: "neutral",
            blocks: 123,
            sharePct: 100,
          },
        ]}
      />,
    );

    const relaySection = screen.getByText("03 / RELAY LEADERBOARD").closest("section");
    expect(relaySection).toHaveTextContent("Top relays by delivery share");
    expect(relaySection).toHaveTextContent("123 deliveries");
    expect(relaySection).toHaveTextContent("DELIVERIES");
    expect(relaySection).toHaveTextContent("NON-CENSORING");
    expect(relaySection).not.toHaveTextContent("OFAC");
    expect(relaySection).not.toHaveTextContent("BLOCKS");
  });

  it("labels censoring relays by posture instead of OFAC", () => {
    render(
      <Leaderboard
        rows={[
          {
            relayId: "relay-a",
            name: "Relay A",
            posture: "censoring",
            blocks: 123,
            sharePct: 100,
          },
        ]}
      />,
    );

    const relaySection = screen.getByText("03 / RELAY LEADERBOARD").closest("section");
    expect(relaySection).toHaveTextContent("CENSORING");
    expect(relaySection).not.toHaveTextContent("OFAC");
  });
});

describe("builder leaderboard terminology", () => {
  it("keeps builder counts labelled as blocks", () => {
    render(
      <BuilderLeaderboard
        rows={[
          {
            builderId: "builder-a",
            blocks: 12,
            sharePct: 100,
          },
        ]}
      />,
    );

    const builderSection = screen
      .getByText("04 / BUILDER LEADERBOARD")
      .closest("section");
    expect(builderSection).toHaveTextContent("12 blocks");
    expect(builderSection).toHaveTextContent("BLOCKS");
  });
});
