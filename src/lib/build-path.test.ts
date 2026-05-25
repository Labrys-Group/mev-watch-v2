import packageJson from "../../package.json";
import { describe, expect, it } from "vitest";

describe("production build path", () => {
  it("generates the checked-in data snapshot before building Next.js", () => {
    expect(packageJson.scripts.build).toBe("pnpm update-data && next build");
  });

  it("uses the same data-generating build path on Vercel", () => {
    expect(packageJson.scripts["vercel-build"]).toBe("pnpm build");
  });
});
