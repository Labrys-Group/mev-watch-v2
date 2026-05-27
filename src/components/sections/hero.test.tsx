import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { DataFreshness } from "@/lib/data-freshness";
import type { HeroVerdict } from "@/lib/hero-verdict";
import { Hero } from "./hero";

const verdict: HeroVerdict = {
  state: "falling",
  headlineWord: "FALLING",
  tone: "good",
  arrow: "▼",
  current: 33.4,
  changePct: -20,
  message: "Down 20% over the last 30 days — censorship resistance is gaining ground.",
};

const staleFreshness: DataFreshness = {
  status: "stale",
  sourceDate: "2023-10-24",
  sourceAgeDays: 945,
  generatedAt: null,
  generatedAgeLabel: null,
  sourceLabel: "Daily snapshot through 2023-10-24",
};

describe("Hero", () => {
  it("keeps the verdict but discloses stale daily snapshot context", () => {
    render(<Hero verdict={verdict} freshness={staleFreshness} />);

    expect(screen.getByText("FALLING")).toBeInTheDocument();
    expect(screen.getByText("Daily data through 2023-10-24")).toBeInTheDocument();
    expect(screen.getByText(/This historical daily snapshot tracks/)).toBeInTheDocument();
    expect(screen.getByText(/filter censoring-targeted transactions/i)).toBeInTheDocument();
    expect(screen.queryByText(/OFAC/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/shows that share falling over time/)).not.toBeInTheDocument();
  });
});
