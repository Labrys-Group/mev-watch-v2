import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/font/google", () => ({
  Manrope: () => ({ variable: "font-manrope" }),
  Spline_Sans_Mono: () => ({ variable: "font-spline-sans-mono" }),
}));

describe("root metadata", () => {
  it("uses censoring language without mentioning OFAC", async () => {
    const { metadata } = await import("./layout");
    const serialized = JSON.stringify(metadata);

    expect(serialized).toContain("censoring");
    expect(serialized).toContain("non-censoring");
    expect(serialized).not.toContain("OFAC");
  });

  it("does not emit FAQ structured data globally", async () => {
    const { default: RootLayout } = await import("./layout");
    const html = renderToStaticMarkup(
      React.createElement(
        RootLayout,
        null,
        React.createElement("main", null, "Child"),
      ),
    );

    expect(html).not.toContain('"@type":"FAQPage"');
  });
});
