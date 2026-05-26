import { test, expect } from "@playwright/test";

test.use({ viewport: { width: 390, height: 900 } });

test("homepage keeps freshness visible without horizontal overflow on mobile", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page.getByText(/DAILY (FRESH|STALE)/)).toBeVisible();
  await expect(page.getByText("THROUGH", { exact: true })).toBeVisible();
  await expect(page.getByText("CENSORSHIP").first()).toBeVisible();

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
