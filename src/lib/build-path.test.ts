import packageJson from "../../package.json";
import nextConfig from "../../next.config";
import vercelConfig from "../../vercel.json";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  bootstrapMevWatchDatabase,
  createReadOnlyMevWatchDatabase,
  readSnapshotFromDatabase,
} from "./mev-watch-sqlite";

describe("production build path", () => {
  it("does not fetch upstream data during the Next.js build", () => {
    expect(packageJson.scripts.build).toBe("next build");
  });

  it("does not override Vercel's build command with data generation", () => {
    expect(packageJson.scripts["vercel-build"]).toBeUndefined();
  });

  it("runs the daily data cron shortly after relayscan's UTC day closes", () => {
    expect(vercelConfig.crons).toContainEqual({
      path: "/api/cron/update-data",
      schedule: "45 0 * * *",
    });
  });

  it("bootstraps the local SQLite artifact before build and test commands", () => {
    expect(packageJson.scripts.prebuild).toBe("tsx scripts/bootstrap-data.ts");
    expect(packageJson.scripts.pretest).toBe("tsx scripts/bootstrap-data.ts");
  });

  it("does not bundle the local SQLite artifact into the production server", () => {
    expect(nextConfig).not.toHaveProperty("outputFileTracingIncludes");
    expect(nextConfig).toHaveProperty("outputFileTracingExcludes");
    expect(nextConfig.outputFileTracingExcludes).toEqual({
      "/*": ["src/data/mev-watch.sqlite", "data/*.sqlite"],
    });
  });

  it("can create an empty local SQLite artifact for clean clones", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "mev-watch-build-path-"));
    const dbPath = path.join(dir, "mev-watch.sqlite");
    try {
      expect(bootstrapMevWatchDatabase(dbPath, "2026-05-26T01:00:00.000Z")).toBe(
        true,
      );

      const db = createReadOnlyMevWatchDatabase(dbPath);
      try {
        const snapshot = readSnapshotFromDatabase(db);
        expect(snapshot.sourceStartDate).toBe("2022-09-15");
        expect(snapshot.sourceEndDate).toBeNull();
        expect(snapshot.days).toEqual([]);
      } finally {
        db.close();
      }
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
