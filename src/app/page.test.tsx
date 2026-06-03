import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import Home from "./page";
import { FAQ_ITEMS } from "@/config/faq";

vi.mock("@/components/sections/status-bar.data", () => ({
  StatusBarData: () => <div>Status bar</div>,
}));
vi.mock("@/components/sections/hero.data", () => ({
  HeroData: () => <section>Hero</section>,
}));
vi.mock("@/components/sections/composition.data", () => ({
  CompositionData: () => <section>01 / POST-MERGE COMPOSITION</section>,
}));
vi.mock("@/components/sections/trend-chart.data", () => ({
  TrendChartData: () => <section>02 / CENSORSHIP OVER TIME</section>,
}));
vi.mock("@/components/sections/leaderboard.data", () => ({
  LeaderboardData: () => <section>03 / RELAY LEADERBOARD</section>,
}));
vi.mock("@/components/sections/builder-leaderboard.data", () => ({
  BuilderLeaderboardData: () => <section>04 / BUILDER LEADERBOARD</section>,
}));
vi.mock("@/components/sections/what-to-do", () => ({
  WhatToDo: () => <section>05 / WHAT TO DO</section>,
}));
vi.mock("@/components/sections/faq", () => ({
  Faq: () => <section>06 / FAQ</section>,
}));
vi.mock("@/components/sections/site-header", () => ({
  SiteHeader: () => <header>Header</header>,
}));
vi.mock("@/components/sections/site-footer", () => ({
  SiteFooter: () => <footer>Footer</footer>,
}));

describe("Home", () => {
  it("emits FAQ structured data where the FAQ content is visible", () => {
    const { container } = render(<Home />);
    const script = container.querySelector(
      'script[type="application/ld+json"]',
    );

    expect(script).not.toBeNull();
    const jsonLd = JSON.parse(script?.textContent ?? "{}");

    expect(jsonLd).toMatchObject({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "@id": "https://mev-watch-v2.vercel.app/#faq",
    });
    expect(jsonLd.mainEntity).toHaveLength(FAQ_ITEMS.length);
    expect(jsonLd.mainEntity[0]).toMatchObject({
      "@type": "Question",
      name: FAQ_ITEMS[0].q,
      acceptedAnswer: {
        "@type": "Answer",
        text: FAQ_ITEMS[0].a,
      },
    });
  });

  it("renders visible section labels in increasing order", () => {
    render(<Home />);

    const labels = [
      "01 / POST-MERGE COMPOSITION",
      "02 / CENSORSHIP OVER TIME",
      "03 / RELAY LEADERBOARD",
      "04 / BUILDER LEADERBOARD",
      "05 / WHAT TO DO",
      "06 / FAQ",
    ];
    const text = screen.getByText("Hero").parentElement?.textContent ?? "";

    let lastIndex = -1;
    for (const label of labels) {
      const index = text.indexOf(label);
      expect(index).toBeGreaterThan(lastIndex);
      lastIndex = index;
    }
  });
});
