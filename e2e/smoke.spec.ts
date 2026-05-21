import { test, expect } from "@playwright/test";

test("the app boots and serves the home page", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.status()).toBeLessThan(400);
  await expect(page.locator("body")).toBeVisible();
});
