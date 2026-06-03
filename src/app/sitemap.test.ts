import { describe, expect, it } from "vitest";
import sitemap from "./sitemap";

describe("sitemap", () => {
  it("uses the current stable methodology revision date", () => {
    const methodology = sitemap().find(
      (entry) => entry.url === "https://mev-watch-v2.vercel.app/methodology",
    );

    expect(methodology?.lastModified).toEqual(
      new Date("2026-06-03T00:00:00Z"),
    );
  });
});
