import { test, expect } from "@playwright/test";

test("homepage renders the dashboard with generated test data", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /CENSORSHIP IS/i }).first(),
  ).toBeVisible();
  await expect(page.getByText(/%/).first()).toBeVisible();
  await expect(page.getByText(/RELAY LEADERBOARD/i)).toBeVisible();
});

test("the trend chart renders the generated snapshot series", async ({ page }) => {
  await page.goto("/");
  await page.getByText("02 / CENSORSHIP OVER TIME").scrollIntoViewIfNeeded();
  const section = page.locator("section").filter({
    hasText: "02 / CENSORSHIP OVER TIME",
  });
  await expect(section).toContainText(/SEP 2022/i);
  await expect(section.locator(".recharts-area-area").first()).toBeVisible({
    timeout: 15000,
  });
});

test("theme toggle flips the document theme", async ({ page }) => {
  await page.goto("/");
  const html = page.locator("html");
  await expect(html).toHaveClass(/dark/);
  await page.getByRole("button", { name: /toggle theme/i }).click();
  await expect(html).toHaveClass(/light/);
});

test("the composition section renders and polls the live epoch API", async ({ page }) => {
  const epochRequests: string[] = [];
  await page.route("**/api/epochs", async (route) => {
    epochRequests.push(route.request().url());
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        headSlot: 99,
        fetchedAt: "2026-05-26T00:00:00.000Z",
        degradedRelays: [],
        epochs: [3, 2, 1, 0].map((epoch, rowIndex) => ({
          epoch,
          inProgress: rowIndex === 0,
          slots: Array.from({ length: 32 }, (_, indexInEpoch) => ({
            slot: epoch * 32 + indexInEpoch,
            indexInEpoch,
            category:
              rowIndex === 0 && indexInEpoch > 3 ? "pending" : "nonboost",
            relays: [],
          })),
        })),
      }),
    });
  });

  page.on("request", (request) => {
    if (request.url().includes("/api/epochs")) epochRequests.push(request.url());
  });

  await page.goto("/");
  await expect(page.getByText(/DISTRIBUTION OF MEV-BOOST BLOCKS/i)).toBeVisible();
  await expect(
    page.getByLabel(/Epoch \d+: \d+ of 32 slots delivered/).first(),
  ).toBeVisible();
  const firstEpochGrid = page
    .getByLabel(/Epoch \d+: \d+ of 32 slots delivered/)
    .first();
  await expect
    .poll(async () =>
      firstEpochGrid.evaluate(
        (el) =>
          getComputedStyle(el)
            .gridTemplateColumns.trim()
            .split(/\s+/)
            .filter(Boolean).length,
      ),
    )
    .toBe(32);

  await page.setViewportSize({ width: 390, height: 900 });
  await expect
    .poll(async () =>
      firstEpochGrid.evaluate(
        (el) =>
          getComputedStyle(el)
            .gridTemplateColumns.trim()
            .split(/\s+/)
            .filter(Boolean).length,
      ),
    )
    .toBe(16);
  expect(epochRequests.length).toBeGreaterThan(0);
});
