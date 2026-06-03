// Capture the `/preview` React page as a 1200×630 PNG suitable for the
// site's OpenGraph card. Requires a running dev or production server.
//
// Usage:
//   pnpm capture-preview                   # → public/preview.png at 2×
//   PREVIEW_URL=http://localhost:3001/preview pnpm capture-preview
//   PREVIEW_OUTPUT=tmp/preview.png pnpm capture-preview
//   PREVIEW_SCALE=1 pnpm capture-preview   # 1× capture (1200×630 exact)

import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const URL = process.env.PREVIEW_URL ?? "http://localhost:3000/preview";
const OUTPUT = resolve(process.env.PREVIEW_OUTPUT ?? "public/preview.png");
const SCALE = Number(process.env.PREVIEW_SCALE ?? "2");

async function main() {
  console.log(`→ capturing ${URL}`);
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      deviceScaleFactor: SCALE,
      colorScheme: "dark",
    });
    const page = await ctx.newPage();
    await page.goto(URL, { waitUntil: "networkidle" });
    // Belt-and-braces: wait for fonts to settle so the logo + tagline don't
    // get screenshotted mid-font-swap.
    await page.evaluate(() => document.fonts.ready);
    const canvas = page.locator("#preview-canvas");
    await canvas.waitFor({ state: "visible" });
    await mkdir(dirname(OUTPUT), { recursive: true });
    await canvas.screenshot({ path: OUTPUT, animations: "disabled" });
    console.log(`✓ wrote ${OUTPUT} (${SCALE}× scale)`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
