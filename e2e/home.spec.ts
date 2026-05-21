import { test, expect } from "@playwright/test";

test("home page renders the terminal shell", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "MEV Watch v2" })).toBeVisible();
  await expect(page.getByText("// Public Transparency Tool")).toBeVisible();
});

test("theme toggle switches the document theme", async ({ page }) => {
  await page.goto("/");
  const html = page.locator("html");
  await expect(html).toHaveClass(/dark/);

  await page.getByRole("button", { name: /toggle theme/i }).click();
  await expect(html).toHaveClass(/light/);
});
