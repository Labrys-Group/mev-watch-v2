# MEV Watch v2 — Phase 4: Deployment — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Make MEV Watch v2 deployable to production — a Turso-backed database, a secret-protected cron refresh endpoint, Slack failure alerts, and a deployment guide. All code and config are completed here; the actual cloud provisioning (creating the Turso database, deploying on Vercel) is performed by a human following `docs/DEPLOYMENT.md`, because it requires account credentials an agent cannot hold.

**Architecture:** The same libSQL/Drizzle data layer works against a hosted Turso database in production (a `libsql://` URL + auth token) exactly as it does against a local file. A Vercel Cron job calls a secret-protected `/api/refresh` route on a schedule; that route runs the existing Phase 2 refresh routine. Failures are posted to a Slack webhook.

**Tech Stack:** Next.js 16 route handlers · Vercel Cron · Turso (hosted libSQL) · Vitest.

**Scope:** Phase 4 of 5. Builds on Phases 1-3. Phase 5 (builders, public API, status page) follows.

**Conventions:** Repo root `C:\Users\Joshr\Desktop\Projects\Labrys-Group\mev-watch`, branch `MEVWatch-2`, PowerShell. App code uses `@/*`.

---

## Task 1: Turso auth-token support in the DB client

The libSQL client must pass an auth token when pointed at a hosted Turso database. For a local `file:` URL the token is absent and ignored.

**Files:**
- Modify: `src/lib/db/index.ts`, `.env.example`

- [ ] **Step 1: Replace `src/lib/db/index.ts`** with:

```ts
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { getDatabaseUrl } from "../env";
import * as schema from "./schema";

const client = createClient({
  url: getDatabaseUrl(),
  // Required for a hosted Turso database (libsql:// URL); absent/ignored for a
  // local file: URL.
  authToken: process.env.DATABASE_AUTH_TOKEN,
});

export const db = drizzle(client, { schema });
```

- [ ] **Step 2: Update `.env.example`** to document the production variables. Replace its contents with:

```
# Local development: a libSQL file. Production: a Turso libsql:// URL.
DATABASE_URL=file:./data/mevwatch.db

# Required only for a hosted Turso database (production). Leave empty locally.
DATABASE_AUTH_TOKEN=

# Shared secret protecting the /api/refresh cron endpoint (production).
CRON_SECRET=

# Optional: a Slack incoming-webhook URL for refresh-failure alerts.
SLACK_WEBHOOK_URL=
```

- [ ] **Step 3:** `pnpm build` → succeeds. `pnpm test` → all pass (local file URL still works; `authToken` is `undefined` locally).
- [ ] **Step 4: Commit:** `git add -A && git commit -m "feat: support Turso auth token in the DB client"`

---

## Task 2: Slack failure alerts

**Files:**
- Create: `src/lib/refresh/slack.ts`, `src/lib/refresh/slack.test.ts`
- Modify: `src/lib/refresh/index.ts`

- [ ] **Step 1: Write the failing test** — `src/lib/refresh/slack.test.ts`:

```ts
import { describe, it, expect, vi, afterEach } from "vitest";
import { sendSlackAlert } from "./slack";

const original = process.env.SLACK_WEBHOOK_URL;
afterEach(() => {
  process.env.SLACK_WEBHOOK_URL = original;
  vi.restoreAllMocks();
});

describe("sendSlackAlert", () => {
  it("posts to the webhook when configured", async () => {
    process.env.SLACK_WEBHOOK_URL = "https://hooks.slack.example/abc";
    const fetchMock = vi.fn(async () => new Response("ok", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await sendSlackAlert("something broke");

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0][0]).toBe("https://hooks.slack.example/abc");
  });

  it("is a no-op when the webhook is not configured", async () => {
    delete process.env.SLACK_WEBHOOK_URL;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await sendSlackAlert("something broke");

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("never throws even if the webhook request fails", async () => {
    process.env.SLACK_WEBHOOK_URL = "https://hooks.slack.example/abc";
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new Error("network down");
    }));

    await expect(sendSlackAlert("something broke")).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 2: Run it — expect FAIL.** `pnpm test src/lib/refresh/slack.test.ts`

- [ ] **Step 3: Create `src/lib/refresh/slack.ts`:**

```ts
/**
 * Posts a message to the Slack incoming webhook in SLACK_WEBHOOK_URL, if set.
 * A no-op when unconfigured. Never throws — alerting must not break the caller.
 */
export async function sendSlackAlert(message: string): Promise<void> {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: `[MEV Watch] ${message}` }),
    });
  } catch {
    // Swallow — a failed alert must never disrupt the refresh pipeline.
  }
}
```

- [ ] **Step 4: Run it — expect PASS.** `pnpm test src/lib/refresh/slack.test.ts`

- [ ] **Step 5: Wire it into `src/lib/refresh/index.ts`** — add the import at the top:

```ts
import { sendSlackAlert } from "./slack";
```

and in `refreshDay`'s `catch` block, after the `deps.log(...)` call and before `return`, add:

```ts
    await sendSlackAlert(`Refresh failed for ${date}: ${message}`);
```

So the catch block becomes:
```ts
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await deps.log({ status: "error", source: source.name, message });
    await sendSlackAlert(`Refresh failed for ${date}: ${message}`);
    return { status: "error", date, message };
  }
```

- [ ] **Step 6:** `pnpm test` → all pass; `pnpm build` → succeeds.
- [ ] **Step 7: Commit:** `git add -A && git commit -m "feat: add Slack failure alerts to the refresh pipeline"`

---

## Task 3: The cron refresh API route

**Files:**
- Create: `src/app/api/refresh/route.ts`, `src/app/api/refresh/route.test.ts`

- [ ] **Step 1: Write the failing test** — `src/app/api/refresh/route.test.ts`:

```ts
import { describe, it, expect, afterEach } from "vitest";
import { GET } from "./route";

const original = process.env.CRON_SECRET;
afterEach(() => {
  process.env.CRON_SECRET = original;
});

function request(authHeader?: string): Request {
  return new Request("http://localhost/api/refresh", {
    headers: authHeader ? { authorization: authHeader } : {},
  });
}

describe("GET /api/refresh", () => {
  it("returns 401 when no CRON_SECRET is configured", async () => {
    delete process.env.CRON_SECRET;
    const res = await GET(request("Bearer anything"));
    expect(res.status).toBe(401);
  });

  it("returns 401 when the Authorization header does not match", async () => {
    process.env.CRON_SECRET = "s3cret";
    const res = await GET(request("Bearer wrong"));
    expect(res.status).toBe(401);
  });
});
```

- [ ] **Step 2: Run it — expect FAIL.** `pnpm test src/app/api/refresh/route.test.ts`

- [ ] **Step 3: Create `src/app/api/refresh/route.ts`:**

```ts
import { NextResponse } from "next/server";
import { refreshDay } from "@/lib/refresh";
import { RelayscanDataSource } from "@/lib/data-source/relayscan";

export const runtime = "nodejs";
// Always run fresh — never serve a cached refresh.
export const dynamic = "force-dynamic";

/** Yesterday (UTC) as an ISO date — the most recent complete day. */
function yesterdayUtc(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Cron entry point. Vercel Cron sends `Authorization: Bearer ${CRON_SECRET}`
 * when a CRON_SECRET env var is set; we reject anything that does not match.
 */
export async function GET(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const date = yesterdayUtc();
  const result = await refreshDay(date, new RelayscanDataSource());

  return NextResponse.json(result, {
    status: result.status === "ok" ? 200 : 500,
  });
}
```

- [ ] **Step 4: Run it — expect PASS.** `pnpm test src/app/api/refresh/route.test.ts`

- [ ] **Step 5:** `pnpm build` → succeeds and lists `/api/refresh` in the routes.
- [ ] **Step 6: Commit:** `git add -A && git commit -m "feat: add secret-protected cron refresh route"`

---

## Task 4: Vercel cron + build configuration

**Files:**
- Create: `vercel.json`

- [ ] **Step 1: Create `vercel.json`** at the repo root:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "crons": [
    {
      "path": "/api/refresh",
      "schedule": "0 2 * * *"
    }
  ]
}
```

(Daily at 02:00 UTC — refreshes the previous complete day. Vercel's Hobby plan allows once-daily cron; on Pro this can be made more frequent.)

- [ ] **Step 2:** `pnpm build` → still succeeds.
- [ ] **Step 3: Commit:** `git add -A && git commit -m "feat: add Vercel cron configuration"`

---

## Task 5: Deployment guide

**Files:**
- Create: `docs/DEPLOYMENT.md`

- [ ] **Step 1: Create `docs/DEPLOYMENT.md`** — a precise, step-by-step guide a human follows to take MEV Watch v2 live. It must cover, in order, with exact commands:

  1. **Create the Turso database** — install the Turso CLI, `turso auth login`, `turso db create mev-watch`, then `turso db show mev-watch --url` (the `libsql://` URL) and `turso db tokens create mev-watch` (the auth token).
  2. **Apply the schema to Turso** — set `DATABASE_URL` to the Turso URL and `DATABASE_AUTH_TOKEN` to the token in `.env`, then `pnpm db:migrate`.
  3. **Seed production history** — with the same env still pointed at Turso, run `pnpm seed-history` (this backfills the Turso database from relayscan.io). Then restore `.env` to the local `file:` URL for local development.
  4. **Deploy to Vercel** — install the Vercel CLI / connect the GitHub repo at vercel.com, import `Labrys-Group/mev-watch` (branch as appropriate). Framework preset: Next.js. Build command default.
  5. **Set Vercel environment variables** (Project Settings → Environment Variables): `DATABASE_URL` (Turso URL), `DATABASE_AUTH_TOKEN` (Turso token), `CRON_SECRET` (a long random string), `SLACK_WEBHOOK_URL` (optional). Note that Vercel automatically sends `Authorization: Bearer $CRON_SECRET` to cron invocations once `CRON_SECRET` is set.
  6. **Verify** — after deploy, the homepage loads; the Vercel dashboard shows the cron job under the project's Cron Jobs tab; trigger `/api/refresh` once manually with the `Authorization` header to confirm it returns `{"status":"ok"}`.
  7. **Custom domain** — point `mevwatch.info` at the Vercel deployment.

  Write it clearly with fenced command blocks. Note explicitly that the Hobby plan limits cron to once daily.

- [ ] **Step 2: Commit:** `git add -A && git commit -m "docs: add deployment guide"`

---

## Task 6: Verification and docs

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Run the full quality suite** — `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm test:e2e` — all must pass.
- [ ] **Step 2: Update `CLAUDE.md`:**
  - In `## Commands`, no change needed (refresh commands already documented).
  - Change `## Status` to: `Phases 1-4 complete (foundation, data layer, core UI, deployment config). Phase 5 (iteration) tracked in docs/superpowers/plans/. Production provisioning: see docs/DEPLOYMENT.md.`
  - Add a line to the `## Data pipeline` section: `In production, a Vercel Cron job calls the secret-protected /api/refresh route daily; failures alert via Slack.`
- [ ] **Step 3: Commit:** `git add -A && git commit -m "docs: update CLAUDE.md for Phase 4"`

---

## Done — Phase 4 complete

All deployment code and config are in place: Turso-ready DB client, the secret-protected `/api/refresh` cron route, Slack alerting, `vercel.json`, and `docs/DEPLOYMENT.md`. Going live is now a human-operated checklist (Turso + Vercel accounts). Phase 5 adds builder data, a public API, and a status page.
