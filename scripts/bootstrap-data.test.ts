import { existsSync } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

describe("bootstrap-data script", () => {
  it("loads Next env files before resolving the SQLite artifact path", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "mev-watch-bootstrap-"));
    const originalCwd = process.cwd();
    const originalNodeEnv = process.env.NODE_ENV;
    const originalSqlitePath = process.env.MEV_WATCH_SQLITE_PATH;
    const originalNextProcessedEnv = process.env.__NEXT_PROCESSED_ENV;
    try {
      await writeFile(
        path.join(dir, ".env.local"),
        "MEV_WATCH_SQLITE_PATH=data/env-file.sqlite\n",
      );

      process.chdir(dir);
      process.env.NODE_ENV = "development";
      delete process.env.MEV_WATCH_SQLITE_PATH;
      delete process.env.__NEXT_PROCESSED_ENV;

      const moduleUrl = pathToFileURL(
        path.join(originalCwd, "scripts/bootstrap-data.ts"),
      );
      moduleUrl.searchParams.set("test", String(Date.now()));
      const { main } = await import(moduleUrl.href);
      await main();

      expect(existsSync(path.join(dir, "data/env-file.sqlite"))).toBe(true);
      expect(existsSync(path.join(dir, "src/data/mev-watch.sqlite"))).toBe(false);
    } finally {
      process.chdir(originalCwd);
      restoreEnv("NODE_ENV", originalNodeEnv);
      restoreEnv("MEV_WATCH_SQLITE_PATH", originalSqlitePath);
      restoreEnv("__NEXT_PROCESSED_ENV", originalNextProcessedEnv);
      await rm(dir, { recursive: true, force: true });
    }
  });
});

function restoreEnv(key: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
}
