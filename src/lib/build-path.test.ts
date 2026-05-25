import packageJson from "../../package.json";
import { describe, expect, it } from "vitest";
import { createReadOnlyMevWatchDatabase, readSnapshotFromDatabase } from "./mev-watch-sqlite";

describe("production build path", () => {
  it("does not fetch upstream data during the Next.js build", () => {
    expect(packageJson.scripts.build).toBe("next build");
  });

  it("does not override Vercel's build command with data generation", () => {
    expect(packageJson.scripts["vercel-build"]).toBeUndefined();
  });

  it("ships with an initial SQLite data artifact", () => {
    const db = createReadOnlyMevWatchDatabase();
    try {
      const snapshot = readSnapshotFromDatabase(db);
      expect(snapshot.sourceStartDate).toBe("2022-09-15");
      expect(snapshot.sourceEndDate).not.toBeNull();
      expect(snapshot.days.length).toBeGreaterThan(1);
    } finally {
      db.close();
    }
  });
});
