import { test, expect } from "@playwright/test";

test("homepage renders the dashboard with real data", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /CENSORSHIP/i }).first(),
  ).toBeVisible();
  // A percentage appears somewhere on the page (hero / composition).
  await expect(page.getByText(/%/).first()).toBeVisible();
  // Leaderboard section is present.
  await expect(page.getByText(/RELAY LEADERBOARD/i)).toBeVisible();
});

test("the trend chart renders its area series", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".recharts-area-area").first()).toBeVisible({
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
