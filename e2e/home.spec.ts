import { test, expect } from "@playwright/test";

test("homepage renders the dashboard shell", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Database is empty/i }).first(),
  ).toBeVisible();
  // Leaderboard section is present.
  await expect(page.getByText(/RELAY LEADERBOARD/i)).toBeVisible();
});

test("the trend chart renders an empty snapshot state", async ({ page }) => {
  await page.goto("/");
  await page.getByText("02 / CENSORSHIP OVER TIME").scrollIntoViewIfNeeded();
  await expect(
    page.locator("section").filter({ hasText: "02 / CENSORSHIP OVER TIME" }),
  ).toContainText(/No daily snapshots yet/i);
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
  await expect(page.getByText(/No daily snapshots yet/i).first()).toBeVisible();
  expect(epochRequests).toEqual([]);
});
