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

test("the trend chart renders three stacked bands", async ({ page }) => {
  await page.goto("/");
  // Scroll the chart section into view to trigger the IntersectionObserver.
  await page.getByText("02 / CENSORSHIP OVER TIME").scrollIntoViewIfNeeded();
  await expect(page.locator(".recharts-area-area").first()).toBeVisible({
    timeout: 15000,
  });
  await expect(page.locator(".recharts-area-area")).toHaveCount(3);
});

test("theme toggle flips the document theme", async ({ page }) => {
  await page.goto("/");
  const html = page.locator("html");
  await expect(html).toHaveClass(/dark/);
  await page.getByRole("button", { name: /toggle theme/i }).click();
  await expect(html).toHaveClass(/light/);
});

test("the composition section renders the live epoch ledger", async ({
  page,
}) => {
  await page.goto("/");
  // The ledger footnote is present regardless of relay liveness.
  await expect(page.getByText(/one real slot/i)).toBeVisible();
  // The in-progress epoch row is labelled live.
  await expect(page.getByText(/live ·/i)).toBeVisible({ timeout: 15000 });
});
