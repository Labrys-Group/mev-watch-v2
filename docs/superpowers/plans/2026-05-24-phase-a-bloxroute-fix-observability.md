# Phase A — bloXroute Polling Fix + Relay Observability

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/superpowers/specs/2026-05-24-per-slot-honest-metric-design.md` §6

**Goal:** Stop silently dropping bloXroute deliveries (HTTP 400 from `limit=200`; their max is 100) and surface per-relay health so the next silent failure can't hide. Hard prerequisite for Phase C onward — without this, an "honest" per-slot daily metric would silently exclude 31% market share.

**Architecture:** Two-line code fix (lower `limit=200` → `limit=100`) plus four observability hooks: structured per-relay warn log on rejection, propagate `failedRelays` through `IngestResult`, persist as JSON in `refresh_log.message`, render a per-relay health table on `/status`.

**Tech stack:** TypeScript, Vitest, Next.js route, Drizzle.

---

## Background

Probe results from 2026-05-24 (recorded in spec §6):

```
GET https://bloxroute.max-profit.blxrbdn.com/relay/v1/data/bidtraces/proposer_payload_delivered?limit=200
→ HTTP 400  {"code":400,"message":"maximum limit is 100"}

GET .../?limit=100
→ HTTP 200  (valid records)
```

`relay-payloads.ts:37` hardcodes `?limit=200`. `ingest.ts:51` returns only the *count* of failed relays in `IngestResult`, dropping the actual `failedRelays: string[]` list. Nothing logs it.

---

## Task 1: Lower the page-size constant to bloXroute's max

**Files:**
- Modify: `src/lib/epochs/relay-payloads.ts`
- Test: `src/lib/epochs/relay-payloads.test.ts`

- [ ] **Step 1: Read the test file to understand fixtures**

  Read `src/lib/epochs/relay-payloads.test.ts` end-to-end. Note how fetch is mocked and whether any test asserts the URL or `limit` param.

- [ ] **Step 2: Add a failing test asserting limit=100 in the fetched URL**

  Append to `relay-payloads.test.ts`:

  ```ts
  it("requests limit=100 (bloXroute's documented max)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response("[]", { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    await new RelayPayloadSource().fetchRecentDeliveries();
    for (const call of fetchMock.mock.calls) {
      expect(call[0]).toContain("limit=100");
      expect(call[0]).not.toContain("limit=200");
    }
  });
  ```

- [ ] **Step 3: Run the test, confirm failure**

  ```
  pnpm test -- src/lib/epochs/relay-payloads.test.ts
  ```

  Expected: FAIL — current URL ends in `limit=200`.

- [ ] **Step 4: Apply the fix**

  In `relay-payloads.ts`, change:

  ```ts
  const ENDPOINT =
    "/relay/v1/data/bidtraces/proposer_payload_delivered?limit=200";
  ```

  to:

  ```ts
  // bloXroute caps limit at 100; other relays accept 200+, but 100 is the safe
  // common max and avoids HTTP 400 silent-failures. See spec §6.
  const ENDPOINT =
    "/relay/v1/data/bidtraces/proposer_payload_delivered?limit=100";
  ```

- [ ] **Step 5: Run the test, confirm pass**

  ```
  pnpm test -- src/lib/epochs/relay-payloads.test.ts
  ```

---

## Task 2: Log per-relay rejection reasons

**Files:**
- Modify: `src/lib/epochs/relay-payloads.ts`
- Test: `src/lib/epochs/relay-payloads.test.ts`

- [ ] **Step 1: Add a failing test**

  ```ts
  it("emits a structured warn line when a relay rejects", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url) => {
        if (String(url).includes("bloxroute.max-profit")) {
          return new Response('{"code":400}', { status: 400 });
        }
        return new Response("[]", { status: 200 });
      }),
    );
    await new RelayPayloadSource().fetchRecentDeliveries();
    expect(warn).toHaveBeenCalledWith(
      expect.stringMatching(/relay.*bloxroute\.max-profit/),
      expect.objectContaining({ status: 400 }),
    );
  });
  ```

- [ ] **Step 2: Run, confirm failure** (no warn emitted today).

- [ ] **Step 3: Implement the warn hook**

  In `fetchOne`, wrap the failure path. Pattern:

  ```ts
  try {
    // existing fetch + parse
  } catch (err) {
    const status = (err as { status?: number }).status;
    console.warn(`relay-payloads: ${relayId} failed`, {
      host,
      status,
      errorClass: err instanceof Error ? err.constructor.name : typeof err,
      message: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
  ```

  If the existing code uses an HTTP-status check (`if (!res.ok) throw …`), include the status in the thrown error so the catch can read it.

- [ ] **Step 4: Run, confirm pass.**

---

## Task 3: Propagate `failedRelays` through `IngestResult`

**Files:**
- Modify: `src/lib/epochs/ingest.ts`
- Test: `src/lib/epochs/ingest.test.ts`

- [ ] **Step 1: Update the type and assertions**

  Current `IngestResult` exposes only counts. Add `failedRelays: string[]`.

- [ ] **Step 2: Failing test**

  Append to `ingest.test.ts`:

  ```ts
  it("returns failedRelays list (not just count)", async () => {
    const source: PayloadSource = {
      fetchRecentDeliveries: vi.fn(async () => ({
        payloads: [],
        okRelays: ["relay.ultrasound.money"],
        failedRelays: ["bloxroute.max-profit.blxrbdn.com"],
      })),
    };
    const store = makeMemoryStore();
    const r = await ingestRecentBlocks(source, store, NOW);
    expect(r.failedRelays).toEqual(["bloxroute.max-profit.blxrbdn.com"]);
    expect(r.relaysOk).toBe(1);
    expect(r.relaysTotal).toBe(2);
  });
  ```

- [ ] **Step 3: Implement** — thread `failedRelays` through `ingestRecentBlocks`'s return value.

- [ ] **Step 4: Verify all existing tests still pass.**

---

## Task 4: Persist `failedRelays` in `refresh_log.message`

**Files:**
- Modify: `src/lib/refresh/index.ts`
- Test: `src/lib/refresh/index.test.ts` (if it exists; otherwise create)

- [ ] **Step 1: Locate the refresh entry-point** that writes to `refresh_log`. Inspect what's already serialised into `message`.

- [ ] **Step 2: Failing test**

  Mock a failed-bloXroute scenario; assert `refresh_log.message` contains a parseable JSON array of failed relay IDs.

- [ ] **Step 3: Implement** — JSON-encode `{ ok: string[], failed: string[] }` and append/embed in the message string. Keep human-readable prefix so the audit log still reads naturally.

  Example message format:
  ```
  Refreshed 2026-05-24: 12 relays ok; failed=["bloxroute.max-profit.blxrbdn.com"]
  ```

- [ ] **Step 4: Run all refresh tests; confirm no regressions.**

---

## Task 5: Render per-relay health on `/status`

**Files:**
- Modify: `src/app/status/page.tsx`
- New helper: `src/lib/refresh/relay-health.ts`
- Test: `src/lib/refresh/relay-health.test.ts`

- [ ] **Step 1: Define `RelayHealth` shape**

  ```ts
  export interface RelayHealth {
    relayId: string;
    lastSuccessAt: Date | null;
    lastFailureAt: Date | null;
    lastFailureReason: string | null;
  }
  ```

- [ ] **Step 2: Read `refresh_log` rows for the last N runs (e.g. 30) and reduce to `RelayHealth[]`**

  Parse the JSON-embedded ok/failed lists from Task 4. For each relay in `RELAYS`, compute the latest success/failure timestamps.

- [ ] **Step 3: Failing test** — fixture refresh_log rows, assert the reducer pulls the most recent success and failure correctly.

- [ ] **Step 4: Render on /status**

  Add a section "Per-relay health" — a small table:

  ```
  Relay                          Last OK       Last Fail     Reason
  relay.ultrasound.money         2m ago        —             —
  bloxroute.max-profit.blxrbdn   2m ago        3d ago        HTTP 400 (pre-fix)
  ```

  Style consistent with the rest of `/status`. Use existing helpers for "time ago" formatting.

- [ ] **Step 5: Snapshot test on the rendered HTML.**

---

## Task 6: Deploy-and-verify checklist

Manual verification gate before Phase B can start.

- [ ] **Deploy Phase A to production.** Confirm the deployment is on the new commit.

- [ ] **Force a `/api/refresh` run** (or wait for the next 02:00 UTC cron).

- [ ] **Verify in `refresh_log`:**

  ```sql
  SELECT ran_at, status, message FROM refresh_log ORDER BY ran_at DESC LIMIT 5;
  ```

  Expected: `message` contains a parseable `failed=[...]` segment.

- [ ] **Verify `recent_blocks` shows bloXroute records:**

  ```sql
  SELECT json_array_length(relays) AS n,
         (SELECT COUNT(*) FROM json_each(relays) WHERE value LIKE 'bloxroute%') AS bx
  FROM recent_blocks WHERE bx > 0 LIMIT 5;
  ```

  Expected: ≥1 row with `bx > 0` within one cron cycle.

- [ ] **Verify `/status` shows both bloXroute rows healthy.**

- [ ] **Synthetic failure check:** temporarily set bloXroute's URL to a 404-returning host in a dev env, run `/api/refresh`, confirm `/status` flips to "last fail = now, reason: HTTP 404". Revert.

---

## Task 7: Commit & gate Phase B

- [ ] All Vitest tests green: `pnpm test`
- [ ] Lint clean (no new errors): `pnpm lint`
- [ ] Build green: `pnpm build`
- [ ] Production verification (Task 6) complete
- [ ] Commit message follows project style; reference spec §6

Only after all the above tick: Phase B (`2026-05-24-phase-b-schema-migration.md`) may begin.
