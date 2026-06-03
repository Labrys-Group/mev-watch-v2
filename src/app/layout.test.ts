import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/font/google", () => ({
  Manrope: () => ({ variable: "font-manrope" }),
  Spline_Sans_Mono: () => ({ variable: "font-spline-sans-mono" }),
}));

async function renderLayoutWithGtmId(gtmId: string | undefined) {
  vi.resetModules();
  if (gtmId === undefined) {
    vi.unstubAllEnvs();
  } else {
    vi.stubEnv("NEXT_PUBLIC_GTM_ID", gtmId);
  }

  const { default: RootLayout } = await import("./layout");
  return renderToStaticMarkup(
    React.createElement(
      RootLayout,
      null,
      React.createElement("main", null, "Child"),
    ),
  );
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("root metadata", () => {
  it("uses the deployed Vercel production URL as the canonical metadata host", async () => {
    const { metadata } = await import("./layout");

    expect(metadata.metadataBase?.toString()).toBe(
      "https://mev-watch-v2.vercel.app/",
    );
    expect(metadata.alternates?.canonical).toBe(
      "https://mev-watch-v2.vercel.app/",
    );
    expect(JSON.stringify(metadata.openGraph)).toContain(
      "https://mev-watch-v2.vercel.app",
    );
  });

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

  it("uses a real Apple touch icon instead of the favicon", async () => {
    const { metadata } = await import("./layout");
    const serialized = JSON.stringify(metadata.icons);

    expect(serialized).toContain("/apple-icon");
    expect(serialized).not.toContain('"apple":{"url":"/favicon.ico"');
  });

  it("skips GTM when the container id is invalid", async () => {
    const html = await renderLayoutWithGtmId(`GTM-BAD'ID`);

    expect(html).not.toContain("googletagmanager.com/gtm.js");
    expect(html).not.toContain("googletagmanager.com/ns.html");
  });

  it("serializes a valid GTM id before embedding it in inline script", async () => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_GTM_ID", "GTM-ABC123");
    const { getGtmInitScript } = await import("./layout");
    const html = await renderLayoutWithGtmId("GTM-ABC123");

    expect(getGtmInitScript("GTM-ABC123")).toContain('"GTM-ABC123"');
    expect(html).toContain("googletagmanager.com/ns.html?id=GTM-ABC123");
  });
});
