# MEV Watch v2 — Phase 1: Foundation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the v1 monorepo with a single, running, themed Next.js application wired to a local libSQL database — the foundation every later phase builds on.

**Architecture:** A single Next.js (App Router) app at the repo root. The database is libSQL (a SQLite fork) — a local file in development, hosted Turso in production — accessed through Drizzle ORM. Styling, theming, and tooling are ported from `labrys-website-v2` so MEV Watch v2 shares the Labrys ecosystem. No data fetching or real pages yet — this phase delivers a verified skeleton: themed shell, passing unit + e2e smoke tests, connected database.

**Tech Stack:** Next.js 16 · React 19 · TypeScript · Tailwind CSS v4 · shadcn/ui (radix-nova) · next-themes · Drizzle ORM · Turso / libSQL (local file) · pnpm · Vitest · Playwright.

**Scope:** This is Phase 1 of 5 (see `docs/superpowers/specs/2026-05-21-mev-watch-v2-overhaul-design.md`). Phase 2 (data layer), Phase 3 (core UI), Phase 4 (deploy), and Phase 5 (builders / API / status) each get their own plan.

**Reference source:** `labrys-website-v2` worktree at `C:\Users\Joshr\.config\superpowers\worktrees\labrys-website-v2\landing-page-redesign` — the source of truth for tokens, configs, and conventions. Read files there when a step says "matches labrys-website-v2".

**Conventions for every task:** Run all commands from the repo root `C:\Users\Joshr\Desktop\Projects\Labrys-Group\mev-watch` unless noted. The repo is a git repo on branch `MEVWatch-2`. The primary shell is PowerShell.

---

## Task 1: Remove the v1 monorepo

Clear out the old Turborepo so the directory is ready for a fresh Next.js app. Keep `.git`, `CLAUDE.md`, `docs/`, `mockup-b-terminal.html`, `.gitignore`, and `.superpowers/`.

**Files:**
- Delete: `apps/`, `packages/`, `.github/`, `.vscode/`, `turbo.json`, `yarn.lock`, `package.json`, `README.md`, `.eslintrc.js`, `.dockerignore`, `.env.vault`

- [ ] **Step 1: Remove the v1 files**

Run:
```powershell
git rm -r --quiet apps packages .github .vscode turbo.json yarn.lock package.json README.md .eslintrc.js .dockerignore .env.vault
```
Expected: no error; `git status` shows the deletions staged.

- [ ] **Step 2: Verify what remains**

Run:
```powershell
git status --short; Get-ChildItem -Force -Name
```
Expected: staged deletions listed; remaining items are `.git`, `.gitignore`, `.superpowers`, `CLAUDE.md`, `docs`, `mockup-b-terminal.html`.

- [ ] **Step 3: Commit**

```powershell
git add -A
git commit -m "chore: remove v1 monorepo to make way for the v2 rebuild"
```

---

## Task 2: Scaffold the Next.js application

Create the Next.js app in a temporary subfolder, then move it into the repo root (scaffolding directly fails because the directory is non-empty).

**Files:**
- Create: the standard Next.js app tree (`package.json`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, `postcss.config.mjs`, `next-env.d.ts`, `.gitignore`, `src/app/*`, `public/*`)

- [ ] **Step 1: Scaffold into a temp folder**

Run:
```powershell
pnpm create next-app@latest .scaffold-tmp --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-pnpm --turbopack --no-git --skip-install --yes
```
Expected: a `.scaffold-tmp` folder is created containing a Next.js project.

- [ ] **Step 2: Move the scaffold into the repo root**

Run:
```powershell
Remove-Item .gitignore -Force
Get-ChildItem -Force .scaffold-tmp | Move-Item -Destination . -Force
Remove-Item .scaffold-tmp -Recurse -Force
```
Expected: `package.json`, `tsconfig.json`, `src/`, `public/`, `.gitignore` etc. now exist at the repo root; `.scaffold-tmp` is gone.

- [ ] **Step 3: Restore custom `.gitignore` entries**

Append these lines to the end of `.gitignore`:
```
# superpowers brainstorm scratch
.superpowers

# env & local infra
.env
.env*.local

# drizzle / playwright artifacts
/test-results
/playwright-report
/blob-report
```

- [ ] **Step 4: Set the package name**

In `package.json`, change the `"name"` field to `"mev-watch"`.

- [ ] **Step 5: Install dependencies**

Run:
```powershell
pnpm install
```
Expected: completes without error; `node_modules/` and `pnpm-lock.yaml` exist.

- [ ] **Step 6: Verify the app boots**

Run:
```powershell
pnpm dev
```
Expected: dev server starts, "Ready" logged on `http://localhost:3000`. Stop it with `Ctrl+C`.

- [ ] **Step 7: Commit**

```powershell
git add -A
git commit -m "feat: scaffold Next.js 16 app (App Router, TypeScript, Tailwind v4)"
```

---

## Task 3: Vitest setup and the first unit (formatPercent)

Add Vitest matching the `labrys-website-v2` config, and prove it works with a real, useful utility built test-first.

**Files:**
- Create: `vitest.config.ts`, `vitest.setup.ts`, `src/lib/format.ts`, `src/lib/format.test.ts`
- Modify: `package.json` (scripts)

- [ ] **Step 1: Install test dependencies**

Run:
```powershell
pnpm add -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom
```

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});
```

- [ ] **Step 3: Create `vitest.setup.ts`**

```ts
import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

// jsdom does not implement matchMedia, which next-themes requires.
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }),
});

afterEach(() => {
  cleanup();
});
```

- [ ] **Step 4: Add test scripts to `package.json`**

In the `"scripts"` block, add:
```json
"test": "vitest run --passWithNoTests",
"test:watch": "vitest"
```

- [ ] **Step 5: Write the failing test**

Create `src/lib/format.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { formatPercent } from "./format";

describe("formatPercent", () => {
  it("formats a whole number with one decimal place", () => {
    expect(formatPercent(24)).toBe("24.0%");
  });

  it("rounds to one decimal place", () => {
    expect(formatPercent(78.42)).toBe("78.4%");
  });

  it("formats zero", () => {
    expect(formatPercent(0)).toBe("0.0%");
  });

  it("respects an explicit fractionDigits argument", () => {
    expect(formatPercent(24.456, 2)).toBe("24.46%");
  });
});
```

- [ ] **Step 6: Run the test to verify it fails**

Run: `pnpm test`
Expected: FAIL — cannot resolve `./format` / `formatPercent` is not defined.

- [ ] **Step 7: Write the minimal implementation**

Create `src/lib/format.ts`:
```ts
/**
 * Formats a percentage value (already on a 0-100 scale) for display.
 *
 * @param value - the percentage, e.g. 24 for "24%"
 * @param fractionDigits - decimal places to show (default 1)
 */
export function formatPercent(value: number, fractionDigits = 1): string {
  return `${value.toFixed(fractionDigits)}%`;
}
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `pnpm test`
Expected: PASS — 4 tests pass.

- [ ] **Step 9: Commit**

```powershell
git add -A
git commit -m "test: add Vitest setup and formatPercent utility"
```

---

## Task 4: Playwright setup and a smoke e2e test

**Files:**
- Create: `playwright.config.ts`, `e2e/smoke.spec.ts`
- Modify: `package.json` (scripts)

- [ ] **Step 1: Install Playwright**

Run:
```powershell
pnpm add -D @playwright/test
pnpm exec playwright install chromium
```

- [ ] **Step 2: Create `playwright.config.ts`**

```ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  use: {
    baseURL: "http://localhost:3000",
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
  retries: 0,
  webServer: {
    command: "pnpm dev",
    port: 3000,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
```

- [ ] **Step 3: Add the e2e script to `package.json`**

In `"scripts"`, add:
```json
"test:e2e": "playwright test"
```

- [ ] **Step 4: Write the smoke test**

Create `e2e/smoke.spec.ts`:
```ts
import { test, expect } from "@playwright/test";

test("the app boots and serves the home page", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.status()).toBeLessThan(400);
  await expect(page.locator("body")).toBeVisible();
});
```

- [ ] **Step 5: Run the smoke test**

Run: `pnpm test:e2e`
Expected: PASS — 1 test passes (Playwright auto-starts the dev server).

- [ ] **Step 6: Commit**

```powershell
git add -A
git commit -m "test: add Playwright setup and a boot smoke test"
```

---

## Task 5: shadcn/ui (radix-nova) configuration

Wire up the shadcn/ui configuration exactly as in `labrys-website-v2`. The Button primitive itself is added in Task 6, after the design tokens exist.

**Files:**
- Create: `components.json`, `src/lib/utils.ts`

- [ ] **Step 1: Install the shadcn supporting dependencies**

Run:
```powershell
pnpm add clsx tailwind-merge class-variance-authority lucide-react tw-animate-css @tailwindcss/typography radix-ui shadcn
```

- [ ] **Step 2: Create `components.json`**

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "radix-nova",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/app/globals.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "iconLibrary": "lucide",
  "rtl": false,
  "menuColor": "default",
  "menuAccent": "subtle",
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

- [ ] **Step 3: Create `src/lib/utils.ts`**

```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 4: Commit**

```powershell
git add -A
git commit -m "feat: add shadcn/ui (radix-nova) config and the cn() helper"
```

---

## Task 6: Labrys design tokens and the Button primitive

Replace the scaffolded `globals.css` with the Labrys design-token system, adapted for MEV Watch: a smaller `--radius` for the terminal aesthetic, normal document scrolling (no fixed app-shell), and a `.terminal-grid` background utility. Then add the shadcn Button — after the tokens exist, so its utility classes resolve.

**Files:**
- Modify: `src/app/globals.css` (full replacement)
- Create: `src/components/ui/button.tsx` (generated by shadcn)

- [ ] **Step 1: Replace `src/app/globals.css` entirely**

```css
@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";

@custom-variant dark (&:is(.dark *));
@plugin "@tailwindcss/typography";

:root {
  /* Labrys design tokens */
  --background:    #F8F8FC;
  --panel:         #FFFFFF;
  --panel-alt:     #EEEEF6;
  --foreground:    #0D0E16;
  --fg-muted:      #0D0E1680;
  --border-labrys: #0D0E1614;
  --nav-item:      #0D0E1680;
  --accent-color: #00EF9F;
  --accent-alt-color: #4F0CE5;

  /* MEV Watch semantic colours — light mode (pastel) */
  --ofac:    #F0A9A0;
  --ofac-fg: #5E1A13;
  --neutral: #7DE9C4;
  --neutral-fg: #0A3D2C;
  --good:    #00A86B;
  --warn:    #C9543F;

  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
  --radius: 0.25rem;
}

.dark {
  /* Labrys design tokens */
  --background:    #0D0E16;
  --panel:         #13141F;
  --panel-alt:     #1A1B26;
  --foreground:    #FFFFFF;
  --fg-muted:      #FFFFFF80;
  --border-labrys: #FFFFFF14;
  --nav-item:      #FFFFFF80;
  --accent-color: #4F0CE5;
  --accent-alt-color: #00EF9F;

  /* MEV Watch semantic colours — dark mode (saturated) */
  --ofac:    #FF6B6B;
  --ofac-fg: #0D0E16;
  --neutral: #00EF9F;
  --neutral-fg: #0D0E16;
  --good:    #00EF9F;
  --warn:    #FF6B6B;

  --card: oklch(0.205 0 0);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.205 0 0);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.922 0 0);
  --primary-foreground: oklch(0.205 0 0);
  --secondary: oklch(0.269 0 0);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.269 0 0);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.556 0 0);
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-panel: var(--panel);
  --color-panel-alt: var(--panel-alt);
  --color-fg-muted: var(--fg-muted);
  --color-border-labrys: var(--border-labrys);
  --color-nav-item: var(--nav-item);

  --color-accent-brand: var(--accent-color);
  --color-accent-alt: var(--accent-alt-color);

  --color-ofac: var(--ofac);
  --color-ofac-fg: var(--ofac-fg);
  --color-neutral-relay: var(--neutral);
  --color-neutral-relay-fg: var(--neutral-fg);
  --color-good: var(--good);
  --color-warn: var(--warn);

  --font-sans: var(--font-manrope);
  --font-mono: var(--font-spline-sans-mono);

  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);

  --radius-sm: calc(var(--radius) * 0.6);
  --radius-md: calc(var(--radius) * 0.8);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) * 1.4);
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
    font-family: var(--font-mono), monospace;
    font-size: 1rem;
    line-height: 1.6;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
}

/* Terminal isometric grid background — theme aware */
.terminal-grid {
  background-image:
    linear-gradient(var(--border-labrys) 1px, transparent 1px),
    linear-gradient(90deg, var(--border-labrys) 1px, transparent 1px);
  background-size: 32px 32px;
}
```

- [ ] **Step 2: Add the Button primitive**

Run:
```powershell
pnpm dlx shadcn@latest add button --yes
```
Expected: `src/components/ui/button.tsx` is created. (If shadcn appends anything to `globals.css`, it is harmless — the token set above is already complete.)

- [ ] **Step 3: Verify the build compiles**

Run: `pnpm build`
Expected: build completes without CSS or TypeScript errors — the Button's utility classes resolve against the tokens.

- [ ] **Step 4: Commit**

```powershell
git add -A
git commit -m "feat: add Labrys design tokens and the Button primitive"
```

---

## Task 7: Fonts and the root layout

Wire Manrope + Spline Sans Mono via `next/font`, exactly as `labrys-website-v2` does, and set up a minimal root layout.

**Files:**
- Modify: `src/app/layout.tsx` (full replacement)

- [ ] **Step 1: Replace `src/app/layout.tsx` entirely**

```tsx
import type { Metadata } from "next";
import { Manrope, Spline_Sans_Mono } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const splineSansMono = Spline_Sans_Mono({
  variable: "--font-spline-sans-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MEV Watch",
  description:
    "A public transparency tool tracking OFAC censorship of Ethereum MEV-boost blocks.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${manrope.variable} ${splineSansMono.variable}`}>
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Verify the build compiles**

Run: `pnpm build`
Expected: build completes; fonts are fetched without error.

- [ ] **Step 3: Commit**

```powershell
git add -A
git commit -m "feat: wire Manrope and Spline Sans Mono fonts into the root layout"
```

---

## Task 8: Theme provider and theme toggle

Add light/dark theming with `next-themes` and a toggle component.

**Files:**
- Create: `src/components/theme-provider.tsx`, `src/components/theme-toggle.tsx`, `src/components/theme-toggle.test.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Install next-themes**

Run:
```powershell
pnpm add next-themes
```

- [ ] **Step 2: Create `src/components/theme-provider.tsx`**

```tsx
"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="dark" enableSystem>
      {children}
    </NextThemesProvider>
  );
}
```

- [ ] **Step 3: Write the failing test for the toggle**

Create `src/components/theme-toggle.test.tsx`:
```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "./theme-provider";
import { ThemeToggle } from "./theme-toggle";

describe("ThemeToggle", () => {
  it("renders a button with an accessible label", () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );
    expect(
      screen.getByRole("button", { name: /toggle theme/i }),
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `pnpm test`
Expected: FAIL — cannot resolve `./theme-toggle`.

- [ ] **Step 5: Create `src/components/theme-toggle.tsx`**

```tsx
"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle theme"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      <Sun className="hidden h-4 w-4 dark:block" />
      <Moon className="block h-4 w-4 dark:hidden" />
    </Button>
  );
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `pnpm test`
Expected: PASS — the ThemeToggle test passes alongside the format tests.

- [ ] **Step 7: Wrap the app in `ThemeProvider`**

In `src/app/layout.tsx`, add the import and wrap `{children}`:
```tsx
import type { Metadata } from "next";
import { Manrope, Spline_Sans_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const splineSansMono = Spline_Sans_Mono({
  variable: "--font-spline-sans-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MEV Watch",
  description:
    "A public transparency tool tracking OFAC censorship of Ethereum MEV-boost blocks.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${manrope.variable} ${splineSansMono.variable}`}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 8: Commit**

```powershell
git add -A
git commit -m "feat: add next-themes provider and theme toggle"
```

---

## Task 9: Local libSQL database location and the env module

Configure the local libSQL database file and a tested helper for reading its URL. libSQL is a SQLite fork — in development the "database" is just a file on disk, so there is no server or container to install or run.

**Files:**
- Create: `data/.gitkeep`, `.env`, `.env.example`, `src/lib/env.ts`, `src/lib/env.test.ts`
- Modify: `.gitignore`

- [ ] **Step 1: Create the database directory**

Create an empty file `data/.gitkeep`. (libSQL creates the database file but not its parent directory, so the `data/` directory must exist and be tracked.)

- [ ] **Step 2: Ignore the database files**

Append to `.gitignore`:
```
# local libSQL database
/data/*
!/data/.gitkeep
```

- [ ] **Step 3: Create `.env.example`**

```
DATABASE_URL=file:./data/mevwatch.db
```

- [ ] **Step 4: Create `.env`** (same content — `.env` is gitignored)

```
DATABASE_URL=file:./data/mevwatch.db
```

- [ ] **Step 5: Write the failing test for the env helper**

Create `src/lib/env.test.ts`:
```ts
import { describe, it, expect, afterEach } from "vitest";
import { getDatabaseUrl } from "./env";

const original = process.env.DATABASE_URL;

afterEach(() => {
  process.env.DATABASE_URL = original;
});

describe("getDatabaseUrl", () => {
  it("returns the value when DATABASE_URL is set", () => {
    process.env.DATABASE_URL = "file:./data/test.db";
    expect(getDatabaseUrl()).toBe("file:./data/test.db");
  });

  it("throws a clear error when DATABASE_URL is missing", () => {
    delete process.env.DATABASE_URL;
    expect(() => getDatabaseUrl()).toThrow(/DATABASE_URL/);
  });
});
```

- [ ] **Step 6: Run the test to verify it fails**

Run: `pnpm test`
Expected: FAIL — cannot resolve `./env`.

- [ ] **Step 7: Create `src/lib/env.ts`**

```ts
/**
 * Reads the libSQL database URL. Throws if it is not configured,
 * so misconfiguration fails loudly rather than silently connecting nowhere.
 */
export function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL environment variable is not set. Copy .env.example to .env.",
    );
  }
  return url;
}
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `pnpm test`
Expected: PASS — all unit tests pass.

- [ ] **Step 9: Commit**

```powershell
git add -A
git commit -m "feat: configure the local libSQL database location and env helper"
```

---

## Task 10: Drizzle ORM client (libSQL)

Wire Drizzle to the local libSQL database. Modules under `src/lib/db` use **relative imports** internally so standalone scripts (run via `tsx`) resolve them without a path-alias resolver.

**Files:**
- Create: `drizzle.config.ts`, `src/lib/db/index.ts`
- Modify: `package.json` (scripts)

- [ ] **Step 1: Install Drizzle and the libSQL driver**

Run:
```powershell
pnpm add drizzle-orm @libsql/client
pnpm add -D drizzle-kit dotenv tsx
```

- [ ] **Step 2: Create `drizzle.config.ts`**

```ts
import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "turso",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

> The `turso` dialect drives both a local `file:` URL and a hosted `libsql://` URL, so the same config serves local development and Phase 4 production.

- [ ] **Step 3: Create `src/lib/db/index.ts`**

```ts
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { getDatabaseUrl } from "../env";
import * as schema from "./schema";

const client = createClient({ url: getDatabaseUrl() });

export const db = drizzle(client, { schema });
```

> Note: `./schema` is created in Task 11; the build verification happens there.

- [ ] **Step 4: Add Drizzle scripts to `package.json`**

In `"scripts"`, add:
```json
"db:generate": "drizzle-kit generate",
"db:migrate": "drizzle-kit migrate"
```

- [ ] **Step 5: Commit**

```powershell
git add -A
git commit -m "feat: add Drizzle ORM client and config"
```

---

## Task 11: Database schema, migration, and connection check

Define the four snapshot tables from the spec using Drizzle's SQLite core, generate and apply the migration, and verify a real round-trip against the local libSQL file.

**Files:**
- Create: `src/lib/db/schema.ts`, `scripts/check-db.ts`, `drizzle/` (generated migration)
- Modify: `package.json` (scripts)

- [ ] **Step 1: Create `src/lib/db/schema.ts`**

```ts
import {
  sqliteTable,
  text,
  integer,
  real,
  unique,
} from "drizzle-orm/sqlite-core";

/** One row per day — drives the censorship trend chart. */
export const dailyStats = sqliteTable("daily_stats", {
  date: text("date").primaryKey(), // ISO date, e.g. "2026-05-21"
  censorshipPct: real("censorship_pct").notNull(),
  neutralPct: real("neutral_pct").notNull(),
  nonBoostPct: real("non_boost_pct").notNull(),
  totalBlocks: integer("total_blocks").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

/** Per relay per day — drives the leaderboard and per-relay sparklines. */
export const relayDailyStats = sqliteTable(
  "relay_daily_stats",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    relayKey: text("relay_key").notNull(),
    date: text("date").notNull(),
    blocks: integer("blocks").notNull(),
    sharePct: real("share_pct").notNull(),
    censorshipRate: real("censorship_rate").notNull(),
  },
  (t) => [unique("relay_daily_stats_relay_date_unq").on(t.relayKey, t.date)],
);

/** Rolling window of the most recent blocks — drives the live block grid. */
export const recentBlocks = sqliteTable("recent_blocks", {
  slot: integer("slot").primaryKey(),
  blockNumber: integer("block_number").notNull(),
  relayKey: text("relay_key"),
  category: text("category").notNull(),
  ts: integer("ts", { mode: "timestamp" }).notNull(),
});

/** Audit log of every refresh run — drives "last updated" and alerting. */
export const refreshLog = sqliteTable("refresh_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ranAt: integer("ran_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  status: text("status").notNull(),
  source: text("source").notNull(),
  message: text("message"),
});
```

- [ ] **Step 2: Verify the build compiles with the schema**

Run: `pnpm build`
Expected: build completes — `src/lib/db/index.ts` now resolves `./schema`.

- [ ] **Step 3: Generate the migration**

Run:
```powershell
pnpm db:generate
```
Expected: a SQL migration file appears under `drizzle/`.

- [ ] **Step 4: Apply the migration**

Run:
```powershell
pnpm db:migrate
```
Expected: migration applies without error; the file `data/mevwatch.db` is created.

- [ ] **Step 5: Create `scripts/check-db.ts`**

```ts
import "dotenv/config";
import { db } from "../src/lib/db";
import { refreshLog } from "../src/lib/db/schema";

async function main() {
  const [inserted] = await db
    .insert(refreshLog)
    .values({ status: "ok", source: "check-db", message: "connection check" })
    .returning();

  console.log("Inserted refresh_log row id:", inserted.id);

  const rows = await db.select().from(refreshLog);
  console.log("refresh_log row count:", rows.length);

  console.log("DATABASE CONNECTION OK");
  process.exit(0);
}

main().catch((error) => {
  console.error("DATABASE CONNECTION FAILED");
  console.error(error);
  process.exit(1);
});
```

- [ ] **Step 6: Add the check script to `package.json`**

In `"scripts"`, add:
```json
"db:check": "tsx scripts/check-db.ts"
```

- [ ] **Step 7: Run the connection check**

Run:
```powershell
pnpm db:check
```
Expected: output ends with `DATABASE CONNECTION OK`; exit code 0.

- [ ] **Step 8: Commit**

```powershell
git add -A
git commit -m "feat: add database schema, migration, and connection check"
```

---

## Task 12: Terminal-shell home page and e2e verification

Replace the scaffolded home page with a minimal terminal-styled shell that proves the foundation: terminal grid background, mono type, working theme toggle. The full homepage sections come in Phase 3.

**Files:**
- Modify: `src/app/page.tsx` (full replacement)
- Create: `e2e/home.spec.ts`

- [ ] **Step 1: Replace `src/app/page.tsx` entirely**

```tsx
import { ThemeToggle } from "@/components/theme-toggle";

export default function Home() {
  return (
    <main className="terminal-grid min-h-screen">
      <header className="flex items-center justify-between border-b border-border-labrys px-6 py-4">
        <div className="font-mono text-sm tracking-wide">
          <span className="font-bold">MEVWATCH</span>{" "}
          <span className="text-fg-muted">// MONITOR</span>
        </div>
        <ThemeToggle />
      </header>

      <section className="px-6 py-20">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-accent-brand">
          // Public Transparency Tool
        </p>
        <h1 className="mt-4 font-sans text-5xl font-extrabold tracking-tight">
          MEV Watch v2
        </h1>
        <p className="mt-4 max-w-md font-mono text-sm text-fg-muted">
          Foundation online. Data pipeline and dashboard arrive in the next
          phases.
        </p>
      </section>
    </main>
  );
}
```

- [ ] **Step 2: Write the e2e test**

Create `e2e/home.spec.ts`:
```ts
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
```

- [ ] **Step 3: Run the e2e tests**

Run: `pnpm test:e2e`
Expected: PASS — all 3 e2e tests pass (`smoke.spec.ts` + 2 in `home.spec.ts`).

- [ ] **Step 4: Commit**

```powershell
git add -A
git commit -m "feat: add terminal-shell home page with theme toggle"
```

---

## Task 13: Rewrite CLAUDE.md and full verification

Update the repo guidance for the v2 architecture and run every quality gate.

**Files:**
- Modify: `CLAUDE.md` (full replacement)

- [ ] **Step 1: Replace `CLAUDE.md` entirely**

```markdown
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

MEV Watch v2 ([mevwatch.info](https://mevwatch.info)) — a public transparency tool tracking OFAC censorship of Ethereum MEV-boost blocks. A single Next.js application; the v1 Turborepo monorepo was fully replaced. See `docs/superpowers/specs/2026-05-21-mev-watch-v2-overhaul-design.md` for the design and `docs/superpowers/plans/` for phased implementation plans.

## Commands

Package manager is **pnpm**. Run from the repo root.

- `pnpm dev` — start the dev server (http://localhost:3000)
- `pnpm build` — production build
- `pnpm lint` — ESLint
- `pnpm test` — Vitest unit tests
- `pnpm test:watch` — Vitest in watch mode
- `pnpm test -- src/lib/format.test.ts` — run a single test file
- `pnpm test:e2e` — Playwright e2e tests (auto-starts the dev server)
- `pnpm db:generate` — generate a Drizzle migration from `src/lib/db/schema.ts`
- `pnpm db:migrate` — apply migrations
- `pnpm db:check` — verify the database connection

## Architecture

Next.js 16 App Router app. Styling is Tailwind CSS v4 + shadcn/ui (radix-nova), themed with the Labrys design tokens in `src/app/globals.css` (light/dark via `next-themes`, accent is mint in light mode and blurple in dark). Data is stored in libSQL (a local file in development, hosted Turso in production) and accessed via Drizzle ORM.

### Key conventions

- Path alias `@/*` maps to `src/*` for application code. Modules under `src/lib/db` use **relative imports** internally so `tsx` scripts (e.g. `scripts/`) resolve them without a path-alias resolver.
- Database schema lives in `src/lib/db/schema.ts`; the Drizzle client is `src/lib/db/index.ts`.
- The local database is a libSQL file under `data/`; it needs a `.env` file (copy from `.env.example`) and `pnpm db:migrate`.
- Unit tests sit beside their source as `*.test.ts(x)`; e2e tests live in `e2e/`.

## Status

Phase 1 (Foundation) complete. Phases 2–5 (data layer, core UI, deploy, iteration) are tracked in `docs/superpowers/plans/`.
```

- [ ] **Step 2: Run the full verification suite**

Run each and confirm all pass:
```powershell
pnpm lint
pnpm test
pnpm build
pnpm test:e2e
```
Expected: `pnpm lint` — no errors; `pnpm test` — all unit tests pass; `pnpm build` — succeeds; `pnpm test:e2e` — all 3 e2e tests pass.

- [ ] **Step 3: Commit**

```powershell
git add -A
git commit -m "docs: rewrite CLAUDE.md for the v2 architecture"
```

---

## Done — Phase 1 complete

The repository now holds a single Next.js 16 application: themed terminal shell, light/dark switching, a connected libSQL database with the snapshot schema, and passing unit + e2e suites. Phase 2 (the external data adapter, refresh routine, and metric computation) gets its own plan — and that plan should begin by verifying the real relayscan.io API surface.
