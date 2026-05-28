import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BuilderLeaderboard } from "./builder-leaderboard";
import { Leaderboard } from "./leaderboard";

describe("relay leaderboard terminology", () => {
  it("labels relay payload counts as blocks", () => {
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

    const relaySection = screen.getByText("04 / RELAY LEADERBOARD").closest("section");
    expect(relaySection).toHaveTextContent("Top relays by share");
    expect(relaySection).toHaveTextContent("123 blocks");
    expect(relaySection).toHaveTextContent("BLOCKS");
    expect(relaySection).toHaveTextContent("NEUTRAL");
    expect(relaySection).not.toHaveTextContent("NON-CENSORING");
    expect(relaySection).not.toHaveTextContent("DELIVERIES");
  });

  it("labels censoring relays by OFAC instead of CENSORING", () => {
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

    const relaySection = screen.getByText("04 / RELAY LEADERBOARD").closest("section");
    expect(relaySection).toHaveTextContent("OFAC");
    expect(relaySection).not.toHaveTextContent("CENSORING");
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
      .getByText("05 / BUILDER LEADERBOARD")
      .closest("section");
    expect(builderSection).toHaveTextContent("12 blocks");
    expect(builderSection).toHaveTextContent("BLOCKS");
  });
});
