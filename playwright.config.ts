import { defineConfig } from "@playwright/test";

const e2eSqlitePath = "data/e2e-mev-watch.sqlite";

export default defineConfig({
  testDir: "e2e",
  use: {
    baseURL: "http://localhost:3000",
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
  retries: 0,
  webServer: {
    command: "pnpm dev",
    env: {
      MEV_WATCH_SQLITE_PATH: e2eSqlitePath,
    },
    port: 3000,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
