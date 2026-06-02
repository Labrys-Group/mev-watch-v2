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
  it("renders the verdict headline and hardcoded readme copy", () => {
    render(<Hero verdict={verdict} freshness={staleFreshness} />);

    expect(screen.getByText("FALLING")).toBeInTheDocument();
    expect(screen.getByText(verdict.message)).toBeInTheDocument();
    expect(screen.getByText(/OFAC-sanctioned transactions/i)).toBeInTheDocument();
    expect(screen.getByText(/shows that share falling over time/i)).toBeInTheDocument();
    expect(screen.queryByText(/Daily data through/)).not.toBeInTheDocument();
    expect(screen.queryByText(/This historical daily snapshot tracks/)).not.toBeInTheDocument();
  });
});
