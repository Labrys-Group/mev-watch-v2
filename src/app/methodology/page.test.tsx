import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/sections/site-header", () => ({
  SiteHeader: () => <header>Header</header>,
}));
vi.mock("@/components/sections/site-footer", () => ({
  SiteFooter: () => <footer>Footer</footer>,
}));
vi.mock("@/components/reveal", () => ({
  Reveal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe("MethodologyPage", () => {
  it("preserves shared social preview metadata", async () => {
    const { metadata } = await import("./page");

    expect(JSON.stringify(metadata.openGraph)).toContain("/preview.png");
    expect(JSON.stringify(metadata.twitter)).toContain("/preview.png");
    expect(JSON.stringify(metadata.openGraph)).toContain("MEV Watch");
    expect(JSON.stringify(metadata.twitter)).toContain("@labrys_io");
  });

  it("uses OFAC terminology, neutral classification, and correct section labels", async () => {
    const { default: MethodologyPage, metadata } = await import("./page");
    render(<MethodologyPage />);

    const pageText = document.body.textContent ?? "";
    const serializedMetadata = JSON.stringify(metadata);

    // Section label reverted to OFAC variant
    expect(
      screen.getByText("05 / OFAC RELAY CLASSIFICATION"),
    ).toBeInTheDocument();

    // OFAC terminology restored
    expect(`${serializedMetadata} ${pageText}`).toMatch(/OFAC/i);
    expect(pageText).toContain("OFAC-censoring relays");
    expect(pageText).toContain("OFAC sanctions filtering");

    // neutral restored (not non-censoring in prose)
    expect(pageText).toContain("neutral");

    // Limitation #4 has updated title and live ledger mention
    expect(pageText).toContain(
      "Headline is daily; the live ledger is a separate view",
    );
    expect(pageText).toContain("epoch ledger");

    // Exception B: relays.json reference preserved
    expect(pageText).toContain("relays.json");

    // Exception A: Vercel Blob reference preserved
    expect(pageText).toContain("Vercel Blob");
  });
});
