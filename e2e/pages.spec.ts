import { test, expect } from "@playwright/test";

test("methodology page renders", async ({ page }) => {
  const res = await page.goto("/methodology");
  expect(res?.status()).toBeLessThan(400);
  await expect(page.getByText(/methodology/i).first()).toBeVisible();
});

test("explorer page renders the relay directory", async ({ page }) => {
  const res = await page.goto("/explorer");
  expect(res?.status()).toBeLessThan(400);
  await expect(page.getByText(/relay/i).first()).toBeVisible();
});

test("embed page renders the metric card", async ({ page }) => {
  const res = await page.goto("/embed");
  expect(res?.status()).toBeLessThan(400);
  await expect(page.getByText(/MEV WATCH/i).first()).toBeVisible();
  await expect(page.getByText(/%/).first()).toBeVisible();
});

test("api-docs page renders", async ({ page }) => {
  const res = await page.goto("/api-docs");
  expect(res?.status()).toBeLessThan(400);
  await expect(page.getByText(/api/i).first()).toBeVisible();
});

test("status page renders", async ({ page }) => {
  const res = await page.goto("/status");
  expect(res?.status()).toBeLessThan(400);
  await expect(page.getByText(/status/i).first()).toBeVisible();
});

test("public API returns JSON", async ({ request }) => {
  const res = await request.get("/api/v1/summary");
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body).toHaveProperty("summary");
});
