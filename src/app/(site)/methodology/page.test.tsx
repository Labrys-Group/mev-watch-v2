import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/sections/site-footer", () => ({
  SiteFooter: () => <footer>Footer</footer>,
}));
vi.mock("@/components/reveal", () => ({
  Reveal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe("MethodologyPage", () => {
  it("uses censoring and non-censoring terminology without mentioning OFAC", async () => {
    const { default: MethodologyPage, metadata } = await import("./page");
    render(<MethodologyPage />);

    const pageText = document.body.textContent ?? "";
    const serializedMetadata = JSON.stringify(metadata);

    expect(screen.getByText("05 / RELAY CLASSIFICATION")).toBeInTheDocument();
    expect(pageText).toContain("non-censoring");
    expect(pageText).toContain("censoring relays");
    expect(`${serializedMetadata} ${pageText}`).not.toMatch(/OFAC/i);
  });
});
