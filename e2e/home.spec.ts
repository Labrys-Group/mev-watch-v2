import { test, expect } from "@playwright/test";

test("homepage renders the dashboard with checked-in data", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /CENSORSHIP IS/i }).first(),
  ).toBeVisible();
  await expect(page.getByText(/%/).first()).toBeVisible();
  await expect(page.getByText(/RELAY LEADERBOARD/i)).toBeVisible();
});

test("the trend chart renders the checked-in snapshot series", async ({ page }) => {
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

test("the composition section does not poll the removed live epoch API", async ({
  page,
}) => {
  const epochRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/epochs")) epochRequests.push(request.url());
  });

  await page.goto("/");
  await expect(page.getByText(/DAILY MEV-BOOST DELIVERY DISTRIBUTION/i)).toBeVisible();
  expect(epochRequests).toEqual([]);
});
