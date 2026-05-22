# Live Epoch Ledger Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the homepage's illustrative 128-tile composition waffle with a live, per-slot epoch ledger — 4 epoch rows polled every 30s from the relay data APIs.

**Architecture:** A self-contained live subsystem under `src/lib/epochs/` plus one API route and one client component. Pure slot/epoch math + a relay-data-API fetcher + a "censoring path wins" classifier feed `getLiveEpochs()`, which assembles 4 epoch rows (the in-progress epoch + 3 completed). A client component renders them, polls `/api/epochs` every 30s, pops new slots in and shifts rows on epoch boundaries. No cron, no database table, no migration.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind v4, Zod, Vitest, Playwright. **Zero new dependencies.**

Design spec: `docs/superpowers/specs/2026-05-22-live-epoch-ledger-design.md`.

---

## Task 1: Chain-time math

Pure slot/epoch arithmetic for Ethereum mainnet. No I/O, fully testable.

**Files:**
- Create: `src/lib/epochs/chain-time.ts`
- Test: `src/lib/epochs/chain-time.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/epochs/chain-time.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  GENESIS_TIME,
  SLOTS_PER_EPOCH,
  currentSlot,
  epochOf,
  epochSlotRange,
} from "./chain-time";

describe("chain-time", () => {
  it("currentSlot is 0 at genesis", () => {
    expect(currentSlot(GENESIS_TIME * 1000)).toBe(0);
  });

  it("currentSlot advances one per 12 seconds", () => {
    expect(currentSlot((GENESIS_TIME + 12) * 1000)).toBe(1);
    expect(currentSlot((GENESIS_TIME + 32 * 12) * 1000)).toBe(32);
  });

  it("epochOf groups 32 slots per epoch", () => {
    expect(epochOf(0)).toBe(0);
    expect(epochOf(31)).toBe(0);
    expect(epochOf(32)).toBe(1);
    expect(epochOf(449440 * SLOTS_PER_EPOCH)).toBe(449440);
  });

  it("epochSlotRange returns the inclusive slot bounds", () => {
    expect(epochSlotRange(1)).toEqual({ first: 32, last: 63 });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test -- src/lib/epochs/chain-time.test.ts`
Expected: FAIL — cannot find module `./chain-time`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/epochs/chain-time.ts`:

```ts
/** Beacon-chain time math for Ethereum mainnet. Pure functions, no I/O. */

/** Mainnet beacon-chain genesis, Unix seconds (2020-12-01 12:00:23 UTC). */
export const GENESIS_TIME = 1606824023;
export const SECONDS_PER_SLOT = 12;
export const SLOTS_PER_EPOCH = 32;

/** The head slot for a given moment (default: now). */
export function currentSlot(now: number = Date.now()): number {
  return Math.floor(
    (Math.floor(now / 1000) - GENESIS_TIME) / SECONDS_PER_SLOT,
  );
}

/** The epoch a slot belongs to. */
export function epochOf(slot: number): number {
  return Math.floor(slot / SLOTS_PER_EPOCH);
}

/** The inclusive [first, last] slot range of an epoch. */
export function epochSlotRange(epoch: number): { first: number; last: number } {
  const first = epoch * SLOTS_PER_EPOCH;
  return { first, last: first + SLOTS_PER_EPOCH - 1 };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test -- src/lib/epochs/chain-time.test.ts`
Expected: PASS — 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/epochs/chain-time.ts src/lib/epochs/chain-time.test.ts
git commit -m "feat: add beacon-chain slot/epoch time math"
```

---

## Task 2: Relay data-API hosts

Add the data-API hostname to each relay's config. The relayscan `id` is a display
shorthand and is not always a resolvable host, so the host is recorded explicitly.

**Files:**
- Modify: `src/config/relays.ts`

- [ ] **Step 1: Replace the file contents**

Overwrite `src/config/relays.ts` with:

```ts
/**
 * Editorial OFAC-censorship classification of MEV-boost relays.
 *
 * relayscan.io reports each relay's market share, but whether a relay filters
 * OFAC-sanctioned transactions is an editorial judgement — so it is maintained
 * here by hand. Posture sourced from the ethstaker MEV relay list and relay
 * operator statements (as of May 2026). Review when relays are added/changed.
 */

export type RelayPosture = "censoring" | "neutral" | "unknown";

export interface RelayInfo {
  /** Identifier exactly as reported by relayscan.io's API (`relay` field). */
  id: string;
  /** Human-readable display name. */
  name: string;
  posture: RelayPosture;
  /**
   * Hostname of the relay's standard MEV-boost data API. Used to query
   * `/relay/v1/data/bidtraces/proposer_payload_delivered`. Often equal to
   * `id`, but recorded separately because `id` is not always a resolvable host.
   */
  dataApiHost: string;
}

export const RELAYS: RelayInfo[] = [
  { id: "relay.ultrasound.money", name: "Ultra Sound", posture: "neutral", dataApiHost: "relay.ultrasound.money" },
  { id: "titanrelay.xyz", name: "Titan", posture: "neutral", dataApiHost: "titanrelay.xyz" },
  { id: "bloxroute.max-profit.blxrbdn.com", name: "bloXroute Max Profit", posture: "censoring", dataApiHost: "bloxroute.max-profit.blxrbdn.com" },
  { id: "bloxroute.regulated.blxrbdn.com", name: "bloXroute Regulated", posture: "censoring", dataApiHost: "bloxroute.regulated.blxrbdn.com" },
  { id: "aestus.live", name: "Aestus", posture: "neutral", dataApiHost: "mainnet.aestus.live" },
  { id: "boost-relay.flashbots.net", name: "Flashbots", posture: "censoring", dataApiHost: "boost-relay.flashbots.net" },
  { id: "agnostic-relay.net", name: "Agnostic Gnosis", posture: "neutral", dataApiHost: "agnostic-relay.net" },
  { id: "relay.ethgas.com", name: "EthGas", posture: "unknown", dataApiHost: "relay.ethgas.com" },
];

const byId = new Map(RELAYS.map((r) => [r.id, r]));

/**
 * Look up a relay by its relayscan identifier. An unconfigured relay returns a
 * synthetic entry with posture "unknown" so new relays never crash the pipeline.
 */
export function classifyRelay(id: string): RelayInfo {
  return byId.get(id) ?? { id, name: id, posture: "unknown", dataApiHost: id };
}
```

- [ ] **Step 2: Verify each data-API host responds**

Run this check:

```bash
for h in relay.ultrasound.money titanrelay.xyz bloxroute.max-profit.blxrbdn.com bloxroute.regulated.blxrbdn.com mainnet.aestus.live boost-relay.flashbots.net agnostic-relay.net relay.ethgas.com; do
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 8 "https://$h/relay/v1/data/bidtraces/proposer_payload_delivered?limit=1")
  echo "$h -> $code"
done
```

Expected: each host prints `200`. If a host prints `000`, `404`, or a redirect
code, that relay's data-API hostname differs — find the correct host from the
relay's status page or the ethstaker relay list and correct its `dataApiHost`
value. A relay that is genuinely unreachable can keep its best-guess host; the
fetcher (Task 3) skips failures gracefully.

- [ ] **Step 3: Verify existing tests still pass**

Run: `pnpm test`
Expected: PASS — the existing suite is unaffected (the new field is additive).

- [ ] **Step 4: Commit**

```bash
git add src/config/relays.ts
git commit -m "feat: record each relay's MEV-boost data-API host"
```

---

## Task 3: Relay payloads data source

Fetch recent delivered payloads from every relay's standard data API.

**Files:**
- Create: `src/lib/epochs/relay-payloads.ts`
- Test: `src/lib/epochs/relay-payloads.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/epochs/relay-payloads.test.ts`:

```ts
import { describe, it, expect, vi, afterEach } from "vitest";
import { RelayPayloadSource } from "./relay-payloads";
import { RELAYS } from "@/config/relays";

const SAMPLE = [
  {
    slot: "14382097",
    parent_hash: "0xpar",
    block_hash: "0xblk",
    builder_pubkey: "0xbuilder",
    proposer_pubkey: "0xprop",
    proposer_fee_recipient: "0xfee",
    gas_limit: "60000000",
    gas_used: "18802227",
    value: "5238498425452159",
    num_tx: "161",
    block_number: "25147170",
  },
];

afterEach(() => {
  vi.restoreAllMocks();
});

describe("RelayPayloadSource", () => {
  it("maps delivered payloads and tags them with the relay id", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify(SAMPLE), { status: 200 })),
    );

    const result = await new RelayPayloadSource().fetchRecentDeliveries();

    expect(result.okRelays).toHaveLength(RELAYS.length);
    expect(result.failedRelays).toHaveLength(0);

    const first = result.payloads[0];
    expect(first.slot).toBe(14382097);
    expect(first.numTx).toBe(161);
    expect(first.blockNumber).toBe(25147170);
    expect(first.valueWei).toBe("5238498425452159");
    expect(RELAYS.map((r) => r.id)).toContain(first.relayId);
  });

  it("skips a relay whose API fails, keeping the rest", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (String(url).includes("flashbots")) {
          return new Response("down", { status: 503 });
        }
        return new Response(JSON.stringify(SAMPLE), { status: 200 });
      }),
    );

    const result = await new RelayPayloadSource().fetchRecentDeliveries();

    expect(result.failedRelays).toContain("boost-relay.flashbots.net");
    expect(result.okRelays).not.toContain("boost-relay.flashbots.net");
    expect(result.okRelays).toHaveLength(RELAYS.length - 1);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test -- src/lib/epochs/relay-payloads.test.ts`
Expected: FAIL — cannot find module `./relay-payloads`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/epochs/relay-payloads.ts`:

```ts
import { z } from "zod";
import { RELAYS } from "@/config/relays";

/** One delivered MEV-boost payload, normalised and tagged with its relay. */
export interface DeliveredPayload {
  slot: number;
  blockHash: string;
  builderPubkey: string;
  valueWei: string;
  numTx: number;
  blockNumber: number;
  relayId: string;
}

/** The combined result of querying every relay's data API. */
export interface RelayDeliveriesResult {
  payloads: DeliveredPayload[];
  okRelays: string[];
  failedRelays: string[];
}

/** Anything that can supply recent relay deliveries (real or a test fake). */
export interface PayloadSource {
  fetchRecentDeliveries(): Promise<RelayDeliveriesResult>;
}

const DeliveredPayloadSchema = z.object({
  slot: z.coerce.number(),
  block_hash: z.string(),
  builder_pubkey: z.string(),
  value: z.string(),
  num_tx: z.coerce.number(),
  block_number: z.coerce.number(),
});
const ResponseSchema = z.array(DeliveredPayloadSchema);

const ENDPOINT =
  "/relay/v1/data/bidtraces/proposer_payload_delivered?limit=200";
const TIMEOUT_MS = 4000;

/** Fetches recent delivered payloads from every configured relay's data API. */
export class RelayPayloadSource implements PayloadSource {
  readonly name = "mev-boost relay data API";

  async fetchRecentDeliveries(): Promise<RelayDeliveriesResult> {
    const settled = await Promise.allSettled(
      RELAYS.map((relay) => this.fetchOne(relay.dataApiHost, relay.id)),
    );

    const payloads: DeliveredPayload[] = [];
    const okRelays: string[] = [];
    const failedRelays: string[] = [];

    settled.forEach((result, i) => {
      const relayId = RELAYS[i].id;
      if (result.status === "fulfilled") {
        payloads.push(...result.value);
        okRelays.push(relayId);
      } else {
        failedRelays.push(relayId);
      }
    });

    return { payloads, okRelays, failedRelays };
  }

  private async fetchOne(
    host: string,
    relayId: string,
  ): Promise<DeliveredPayload[]> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(`https://${host}${ENDPOINT}`, {
        headers: { accept: "application/json" },
        signal: controller.signal,
        next: { revalidate: 15 },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const parsed = ResponseSchema.parse(await res.json());
      return parsed.map((p) => ({
        slot: p.slot,
        blockHash: p.block_hash,
        builderPubkey: p.builder_pubkey,
        valueWei: p.value,
        numTx: p.num_tx,
        blockNumber: p.block_number,
        relayId,
      }));
    } finally {
      clearTimeout(timer);
    }
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test -- src/lib/epochs/relay-payloads.test.ts`
Expected: PASS — 2 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/epochs/relay-payloads.ts src/lib/epochs/relay-payloads.test.ts
git commit -m "feat: add relay data-API payload fetcher"
```

---

## Task 4: Slot classification

Classify a slot from the relays that delivered its block: "censoring path wins".

**Files:**
- Create: `src/lib/epochs/classify.ts`
- Test: `src/lib/epochs/classify.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/epochs/classify.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { classifySlot } from "./classify";

describe("classifySlot", () => {
  it("is nonboost when no relay delivered the slot", () => {
    expect(classifySlot([])).toBe("nonboost");
  });

  it("is neutral when only neutral relays delivered it", () => {
    expect(classifySlot(["relay.ultrasound.money"])).toBe("neutral");
  });

  it("is censoring when any censoring relay delivered it", () => {
    expect(classifySlot(["boost-relay.flashbots.net"])).toBe("censoring");
  });

  it("censoring wins over a mixed delivery set", () => {
    expect(
      classifySlot(["relay.ultrasound.money", "boost-relay.flashbots.net"]),
    ).toBe("censoring");
  });

  it("treats an unknown-posture relay as not censoring", () => {
    expect(classifySlot(["relay.ethgas.com"])).toBe("neutral");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test -- src/lib/epochs/classify.test.ts`
Expected: FAIL — cannot find module `./classify`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/epochs/classify.ts`:

```ts
import { classifyRelay } from "@/config/relays";

/** The censorship category of a single slot. */
export type SlotCategory = "censoring" | "neutral" | "nonboost";

/**
 * Classify a slot from the set of relays that delivered its block.
 *
 * "Censoring path wins": if any censoring relay was in the delivery set the
 * slot is censoring; a slot delivered only by neutral or unknown-posture
 * relays is neutral; a slot with no relay delivery is nonboost.
 */
export function classifySlot(relayIds: string[]): SlotCategory {
  if (relayIds.length === 0) return "nonboost";
  for (const id of relayIds) {
    if (classifyRelay(id).posture === "censoring") return "censoring";
  }
  return "neutral";
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test -- src/lib/epochs/classify.test.ts`
Expected: PASS — 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/epochs/classify.ts src/lib/epochs/classify.test.ts
git commit -m "feat: add per-slot censorship classification"
```

---

## Task 5: Epoch assembly

Combine chain-time + the payload source + the classifier into `getLiveEpochs()`,
which returns the 4 epoch rows the UI renders.

**Files:**
- Create: `src/lib/epochs/get-live-epochs.ts`
- Test: `src/lib/epochs/get-live-epochs.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/epochs/get-live-epochs.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { getLiveEpochs } from "./get-live-epochs";
import { GENESIS_TIME, SLOTS_PER_EPOCH } from "./chain-time";
import type { DeliveredPayload, PayloadSource } from "./relay-payloads";

const EPOCH = 1000;
const HEAD_SLOT = EPOCH * SLOTS_PER_EPOCH + 10; // slot index 10 of epoch 1000
const NOW = (GENESIS_TIME + HEAD_SLOT * 12) * 1000;

function source(payloads: DeliveredPayload[]): PayloadSource {
  return {
    fetchRecentDeliveries: async () => ({
      payloads,
      okRelays: ["relay.ultrasound.money"],
      failedRelays: [],
    }),
  };
}

function payload(slot: number, relayId: string): DeliveredPayload {
  return {
    slot,
    blockHash: "0xblk",
    builderPubkey: "0xbuilder",
    valueWei: "1000",
    numTx: 100,
    blockNumber: 1,
    relayId,
  };
}

describe("getLiveEpochs", () => {
  it("returns four rows, newest first, in-progress at the top", async () => {
    const data = await getLiveEpochs(source([]), NOW);
    expect(data.epochs).toHaveLength(4);
    expect(data.epochs[0].epoch).toBe(EPOCH);
    expect(data.epochs[0].inProgress).toBe(true);
    expect(data.epochs[3].epoch).toBe(EPOCH - 3);
    expect(data.epochs[3].inProgress).toBe(false);
  });

  it("marks not-yet-happened slots of the in-progress epoch as pending", async () => {
    const data = await getLiveEpochs(source([]), NOW);
    const top = data.epochs[0];
    expect(top.slots[10].category).not.toBe("pending"); // == head, happened
    expect(top.slots[11].category).toBe("pending"); // > head
    expect(top.slots[31].category).toBe("pending");
  });

  it("classifies a slot censoring when a censoring relay delivered it", async () => {
    const slot = (EPOCH - 1) * SLOTS_PER_EPOCH + 5;
    const data = await getLiveEpochs(
      source([payload(slot, "boost-relay.flashbots.net")]),
      NOW,
    );
    const cell = data.epochs[1].slots[5];
    expect(cell.category).toBe("censoring");
    expect(cell.relays).toContain("boost-relay.flashbots.net");
  });

  it("classifies an undelivered past slot as nonboost", async () => {
    const data = await getLiveEpochs(source([]), NOW);
    expect(data.epochs[1].slots[0].category).toBe("nonboost");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test -- src/lib/epochs/get-live-epochs.test.ts`
Expected: FAIL — cannot find module `./get-live-epochs`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/epochs/get-live-epochs.ts`:

```ts
import { currentSlot, epochOf, epochSlotRange, SLOTS_PER_EPOCH } from "./chain-time";
import { classifySlot, type SlotCategory } from "./classify";
import { RelayPayloadSource, type DeliveredPayload, type PayloadSource } from "./relay-payloads";

/** Number of epoch rows the ledger shows (in-progress + 3 completed). */
export const EPOCH_ROWS = 4;

/** One slot tile's data. `category` "pending" means the slot has not happened. */
export interface SlotCell {
  slot: number;
  indexInEpoch: number;
  category: SlotCategory | "pending";
  relays: string[];
  builder: string | null;
  valueWei: string | null;
  blockNumber: number | null;
  numTx: number | null;
}

/** One epoch row — 32 slot cells. */
export interface EpochRow {
  epoch: number;
  inProgress: boolean;
  slots: SlotCell[];
}

/** The full ledger payload returned to the UI and the API route. */
export interface LedgerData {
  epochs: EpochRow[]; // newest (in-progress) first
  headSlot: number;
  fetchedAt: number;
  relaysOk: number;
  relaysTotal: number;
}

/**
 * Fetch + classify the latest EPOCH_ROWS epochs, newest first. Never throws —
 * on a total fetch failure it returns rows of nonboost/pending slots and
 * `relaysOk: 0` so the client can show a "reconnecting" state.
 */
export async function getLiveEpochs(
  source: PayloadSource = new RelayPayloadSource(),
  now: number = Date.now(),
): Promise<LedgerData> {
  const head = currentSlot(now);
  const headEpoch = epochOf(head);

  let payloads: DeliveredPayload[] = [];
  let okRelays: string[] = [];
  let failedRelays: string[] = [];
  try {
    const result = await source.fetchRecentDeliveries();
    payloads = result.payloads;
    okRelays = result.okRelays;
    failedRelays = result.failedRelays;
  } catch {
    // leave defaults — every slot becomes nonboost/pending, relaysOk stays 0
  }

  const bySlot = new Map<number, DeliveredPayload[]>();
  for (const p of payloads) {
    const list = bySlot.get(p.slot);
    if (list) list.push(p);
    else bySlot.set(p.slot, [p]);
  }

  const epochs: EpochRow[] = [];
  for (let e = 0; e < EPOCH_ROWS; e++) {
    const epoch = headEpoch - e;
    const inProgress = e === 0;
    const { first } = epochSlotRange(epoch);
    const slots: SlotCell[] = [];

    for (let i = 0; i < SLOTS_PER_EPOCH; i++) {
      const slot = first + i;
      const delivered = bySlot.get(slot) ?? [];
      const category: SlotCell["category"] =
        slot > head
          ? "pending"
          : classifySlot(delivered.map((d) => d.relayId));
      const best = delivered[0] ?? null;
      slots.push({
        slot,
        indexInEpoch: i,
        category,
        relays: delivered.map((d) => d.relayId),
        builder: best?.builderPubkey ?? null,
        valueWei: best?.valueWei ?? null,
        blockNumber: best?.blockNumber ?? null,
        numTx: best?.numTx ?? null,
      });
    }
    epochs.push({ epoch, inProgress, slots });
  }

  return {
    epochs,
    headSlot: head,
    fetchedAt: now,
    relaysOk: okRelays.length,
    relaysTotal: okRelays.length + failedRelays.length,
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test -- src/lib/epochs/get-live-epochs.test.ts`
Expected: PASS — 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/epochs/get-live-epochs.ts src/lib/epochs/get-live-epochs.test.ts
git commit -m "feat: assemble the live epoch ledger data"
```

---

## Task 6: Ledger diff

A pure helper the client uses to decide which tiles to pop and whether to run
the epoch-shift animation between two polls.

**Files:**
- Create: `src/lib/epochs/diff.ts`
- Test: `src/lib/epochs/diff.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/epochs/diff.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { diffLedger } from "./diff";
import type { LedgerData } from "./get-live-epochs";

function ledger(topEpoch: number, fillTopUpTo: number): LedgerData {
  const epochs = [0, 1, 2, 3].map((e) => {
    const epoch = topEpoch - e;
    const inProgress = e === 0;
    const slots = Array.from({ length: 32 }, (_, i) => ({
      slot: epoch * 32 + i,
      indexInEpoch: i,
      category:
        inProgress && i > fillTopUpTo
          ? ("pending" as const)
          : ("neutral" as const),
      relays: [] as string[],
      builder: null,
      valueWei: null,
      blockNumber: null,
      numTx: null,
    }));
    return { epoch, inProgress, slots };
  });
  return { epochs, headSlot: 0, fetchedAt: 0, relaysOk: 8, relaysTotal: 8 };
}

describe("diffLedger", () => {
  it("reports nothing when there is no previous data", () => {
    expect(diffLedger(null, ledger(100, 10))).toEqual({
      filledSlots: [],
      epochShift: 0,
    });
  });

  it("lists slots that turned from pending to a real category", () => {
    const d = diffLedger(ledger(100, 10), ledger(100, 13));
    expect(d.filledSlots).toEqual([100 * 32 + 11, 100 * 32 + 12, 100 * 32 + 13]);
    expect(d.epochShift).toBe(0);
  });

  it("reports the epoch delta when the in-progress epoch advances", () => {
    expect(diffLedger(ledger(100, 31), ledger(101, 2)).epochShift).toBe(1);
    expect(diffLedger(ledger(100, 31), ledger(109, 2)).epochShift).toBe(9);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test -- src/lib/epochs/diff.test.ts`
Expected: FAIL — cannot find module `./diff`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/epochs/diff.ts`:

```ts
import type { LedgerData } from "./get-live-epochs";

/** What changed between two ledger snapshots. */
export interface LedgerDiff {
  /** Slot numbers that gained a real category since the previous snapshot. */
  filledSlots: number[];
  /** How many epochs the in-progress epoch advanced (0 = none). */
  epochShift: number;
}

/** Compare two ledger snapshots. A null `prev` yields an empty diff. */
export function diffLedger(
  prev: LedgerData | null,
  next: LedgerData,
): LedgerDiff {
  if (!prev) return { filledSlots: [], epochShift: 0 };

  const epochShift = next.epochs[0].epoch - prev.epochs[0].epoch;

  const prevCategory = new Map<number, string>();
  for (const row of prev.epochs) {
    for (const cell of row.slots) prevCategory.set(cell.slot, cell.category);
  }

  const filledSlots: number[] = [];
  for (const row of next.epochs) {
    for (const cell of row.slots) {
      if (cell.category === "pending") continue;
      const before = prevCategory.get(cell.slot);
      if (before === undefined || before === "pending") {
        filledSlots.push(cell.slot);
      }
    }
  }
  return { filledSlots, epochShift };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test -- src/lib/epochs/diff.test.ts`
Expected: PASS — 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/epochs/diff.ts src/lib/epochs/diff.test.ts
git commit -m "feat: add ledger snapshot diff helper"
```

---

## Task 7: Live epochs API route

The endpoint the client polls. A thin wrapper over `getLiveEpochs()` with a
short shared cache so concurrent polls do not multiply upstream relay load.

**Files:**
- Create: `src/app/api/epochs/route.ts`

- [ ] **Step 1: Write the route**

Create `src/app/api/epochs/route.ts`:

```ts
import { NextResponse } from "next/server";
import { getLiveEpochs } from "@/lib/epochs/get-live-epochs";

export const runtime = "nodejs";
// Always re-run the handler; freshness is bounded by the relay fetch cache
// (next: { revalidate: 15 }) inside getLiveEpochs.
export const dynamic = "force-dynamic";

export async function GET() {
  const data = await getLiveEpochs();
  return NextResponse.json(data, {
    headers: {
      "cache-control": "public, s-maxage=15, stale-while-revalidate=30",
    },
  });
}
```

- [ ] **Step 2: Verify the route serves data**

Start the dev server in one terminal: `pnpm dev`

In another terminal:

```bash
curl -s http://localhost:3000/api/epochs | head -c 400
```

Expected: a JSON object beginning `{"epochs":[{"epoch":` with four epoch
entries. `relaysOk` should be greater than 0 when the relay APIs are reachable.

- [ ] **Step 3: Verify existing tests still pass**

Run: `pnpm test`
Expected: PASS — the full suite is green.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/epochs/route.ts
git commit -m "feat: add /api/epochs live route"
```

---

## Task 8: EpochLedger component

The client component: renders the 4 epoch rows, polls `/api/epochs` every 30s,
pops new slots in, and runs the shift animation on an epoch boundary.

**Files:**
- Modify: `src/app/globals.css`
- Create: `src/components/sections/epoch-ledger.tsx`
- Test: `src/components/sections/epoch-ledger.test.tsx`

- [ ] **Step 1: Add the ledger CSS to globals.css**

In `src/app/globals.css`, find this block (around line 277):

```css
.is-visible .tile {
  animation: mw-tile-pop 0.52s cubic-bezier(0.34, 1.4, 0.5, 1) backwards;
  animation-delay: var(--delay, 0ms);
}
```

Insert this immediately **after** it:

```css

/* ──────────────────────────────────────────────────────────────
   Epoch ledger — live per-slot composition grid.
   `.epoch-tile` animates on mount; React remounts a tile (via a
   category-keyed key) only when its slot newly fills, so each new
   slot pops once. Rows collapse/expand via a grid-template-rows
   transition so the epoch shift needs no measured pixel heights.
   ────────────────────────────────────────────────────────────── */
.epoch-tile {
  animation: mw-tile-pop 0.52s cubic-bezier(0.34, 1.4, 0.5, 1) backwards;
  animation-delay: var(--delay, 0ms);
}
.epoch-row-wrap {
  display: grid;
  grid-template-rows: 1fr;
  transition: grid-template-rows 0.6s cubic-bezier(0.22, 1, 0.36, 1);
}
.epoch-row-wrap--collapsed {
  grid-template-rows: 0fr;
}
.epoch-row-wrap > * {
  min-height: 0;
  overflow: hidden;
}
```

Then, in the `@media (prefers-reduced-motion: reduce)` block, find:

```css
  .is-visible .reveal-row,
  .is-visible .tile {
    animation: none !important;
  }
```

Replace it with:

```css
  .is-visible .reveal-row,
  .is-visible .tile,
  .epoch-tile {
    animation: none !important;
  }
  .epoch-row-wrap {
    transition: none !important;
  }
```

- [ ] **Step 2: Write the failing test**

Create `src/components/sections/epoch-ledger.test.tsx`:

```tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { EpochLedger } from "./epoch-ledger";
import type { LedgerData } from "@/lib/epochs/get-live-epochs";

function fakeLedger(): LedgerData {
  const epochs = [0, 1, 2, 3].map((e) => {
    const epoch = 449440 - e;
    const inProgress = e === 0;
    const slots = Array.from({ length: 32 }, (_, i) => ({
      slot: epoch * 32 + i,
      indexInEpoch: i,
      category:
        inProgress && i >= 20
          ? ("pending" as const)
          : i % 5 === 0
            ? ("censoring" as const)
            : ("neutral" as const),
      relays:
        i % 5 === 0
          ? ["boost-relay.flashbots.net"]
          : ["relay.ultrasound.money"],
      builder: "0xbuilder",
      valueWei: "52384984254521590",
      blockNumber: 25147000 + i,
      numTx: 120,
    }));
    return { epoch, inProgress, slots };
  });
  return {
    epochs,
    headSlot: 449440 * 32 + 19,
    fetchedAt: Date.now(),
    relaysOk: 8,
    relaysTotal: 8,
  };
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("EpochLedger", () => {
  it("renders four epoch rows with their epoch numbers", () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(() => {})));
    render(<EpochLedger initial={fakeLedger()} />);
    expect(screen.getByText("449,440")).toBeInTheDocument();
    expect(screen.getByText("449,437")).toBeInTheDocument();
  });

  it("labels the in-progress epoch as live with its filled count", () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(() => {})));
    render(<EpochLedger initial={fakeLedger()} />);
    expect(screen.getByText(/live · 20\/32/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `pnpm test -- src/components/sections/epoch-ledger.test.tsx`
Expected: FAIL — cannot find module `./epoch-ledger`.

- [ ] **Step 4: Write the component**

Create `src/components/sections/epoch-ledger.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSVars } from "@/lib/css";
import { classifyRelay } from "@/config/relays";
import { diffLedger } from "@/lib/epochs/diff";
import type {
  EpochRow,
  LedgerData,
  SlotCell,
} from "@/lib/epochs/get-live-epochs";

/** Client poll interval. A slot is 12s; 30s surfaces 2-3 new slots per poll. */
export const POLL_MS = 30_000;
const COLS = 32;

type FilledCategory = "censoring" | "neutral" | "nonboost";

const CAT_META: Record<
  FilledCategory,
  { label: string; bg: string; text: string }
> = {
  censoring: { label: "OFAC Censoring", bg: "bg-ofac", text: "text-warn" },
  neutral: { label: "Neutral", bg: "bg-neutral-relay", text: "text-good" },
  nonboost: {
    label: "Non-MEV-Boost",
    bg: "bg-non-boost",
    text: "text-fg-muted",
  },
};

interface HoverState {
  cell: SlotCell;
  epoch: number;
  x: number;
  y: number;
}

interface EpochLedgerProps {
  initial: LedgerData;
}

/**
 * The live epoch ledger — the latest 4 epochs as rows of 32 real slots. The
 * top row is the in-progress epoch; it fills slot by slot and, on completion,
 * the rows shift down and a fresh row enters at the top. Polls `/api/epochs`.
 */
export function EpochLedger({ initial }: EpochLedgerProps) {
  const [data, setData] = useState<LedgerData>(initial);
  const [hover, setHover] = useState<HoverState | null>(null);
  const [reconnecting, setReconnecting] = useState(false);
  const [exiting, setExiting] = useState<EpochRow | null>(null);
  const [entering, setEntering] = useState<number | null>(null);
  const [exitCollapsed, setExitCollapsed] = useState(false);

  const prevRef = useRef<LedgerData>(initial);
  const staggerNext = useRef(true);

  // Poll the API immediately on mount, then every POLL_MS.
  useEffect(() => {
    let alive = true;

    async function poll() {
      try {
        const res = await fetch("/api/epochs", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const next = (await res.json()) as LedgerData;
        if (!alive) return;
        if (next.relaysOk === 0) {
          setReconnecting(true);
          return;
        }
        setReconnecting(false);

        const changes = diffLedger(prevRef.current, next);
        if (changes.epochShift === 1) {
          const dropped =
            prevRef.current.epochs[prevRef.current.epochs.length - 1];
          setExiting(dropped);
          setExitCollapsed(false);
          setEntering(next.epochs[0].epoch);
          window.setTimeout(() => {
            if (!alive) return;
            setExiting(null);
            setEntering(null);
          }, 650);
        } else if (changes.epochShift !== 0) {
          // A multi-epoch jump (e.g. a stale tab): re-enter with the stagger
          // rather than animate a single shift.
          staggerNext.current = true;
        }

        prevRef.current = next;
        setData(next);
      } catch {
        if (alive) setReconnecting(true);
      }
    }

    poll();
    const id = window.setInterval(poll, POLL_MS);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, []);

  // After the collapsed/expanded first frame paints, flip to the target state
  // so the grid-template-rows transition runs.
  useEffect(() => {
    if (entering === null && exiting === null) return;
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        setEntering(null);
        setExitCollapsed(true);
      });
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [entering, exiting]);

  const stagger = staggerNext.current;
  useEffect(() => {
    staggerNext.current = false;
  });

  const rows = exiting ? [...data.epochs, exiting] : data.epochs;

  return (
    <div
      className="relative border border-border-labrys bg-background p-4"
      onMouseLeave={() => setHover(null)}
    >
      <div className="space-y-1">
        {rows.map((row, rowIdx) => {
          const isExiting = exiting !== null && row === exiting;
          const collapsed = isExiting ? exitCollapsed : entering === row.epoch;
          return (
            <div
              key={row.epoch}
              className={`epoch-row-wrap${collapsed ? " epoch-row-wrap--collapsed" : ""}`}
            >
              <EpochRowView
                row={row}
                rowIdx={isExiting ? data.epochs.length : rowIdx}
                stagger={stagger}
                onHover={setHover}
              />
            </div>
          );
        })}
      </div>

      {reconnecting && (
        <div className="mt-2 font-mono text-[9.5px] uppercase tracking-[0.12em] text-fg-muted">
          ● Reconnecting…
        </div>
      )}

      {hover && <SlotTooltip hover={hover} />}
    </div>
  );
}

interface EpochRowViewProps {
  row: EpochRow;
  rowIdx: number;
  stagger: boolean;
  onHover: (h: HoverState | null) => void;
}

function EpochRowView({ row, rowIdx, stagger, onHover }: EpochRowViewProps) {
  const filled = row.slots.filter((s) => s.category !== "pending").length;
  const nextIdx = row.inProgress
    ? row.slots.findIndex((s) => s.category === "pending")
    : -1;

  return (
    <div className="flex items-center gap-3">
      <div className="w-[82px] shrink-0 text-right">
        <div className="font-mono text-[12px] font-semibold leading-none text-foreground">
          {row.epoch.toLocaleString()}
        </div>
        <div
          className={`mt-1 font-mono text-[8px] uppercase tracking-[0.1em] ${
            row.inProgress ? "text-good" : "text-fg-muted"
          }`}
        >
          {row.inProgress ? `● live · ${filled}/32` : "epoch"}
        </div>
      </div>
      <div
        className="grid flex-1 gap-[2px]"
        style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}
        aria-label={`Epoch ${row.epoch}: ${filled} of 32 slots delivered`}
      >
        {row.slots.map((cell, col) => (
          <SlotTile
            key={`${cell.slot}:${cell.category}`}
            cell={cell}
            epoch={row.epoch}
            isNext={col === nextIdx}
            delay={stagger ? (rowIdx + col) * 15 : 0}
            onHover={onHover}
          />
        ))}
      </div>
    </div>
  );
}

interface SlotTileProps {
  cell: SlotCell;
  epoch: number;
  isNext: boolean;
  delay: number;
  onHover: (h: HoverState | null) => void;
}

function SlotTile({ cell, epoch, isNext, delay, onHover }: SlotTileProps) {
  const pending = cell.category === "pending";
  const meta = pending ? null : CAT_META[cell.category as FilledCategory];

  const className = pending
    ? `epoch-cell flex aspect-square items-center justify-center border ${
        isNext
          ? "border-solid border-fg-muted/50"
          : "border-dashed border-border-labrys"
      }`
    : `epoch-tile flex aspect-square cursor-crosshair items-center justify-center transition-transform duration-100 hover:z-20 hover:scale-[1.55] ${meta!.bg}`;

  return (
    <div
      className={className}
      style={{ "--delay": `${delay}ms` } as CSSVars}
      onMouseEnter={
        pending
          ? undefined
          : (e) => {
              const r = e.currentTarget.getBoundingClientRect();
              onHover({ cell, epoch, x: r.left + r.width / 2, y: r.bottom });
            }
      }
    >
      <span
        className={`hidden font-mono text-[8px] leading-none sm:block ${
          pending ? "text-fg-muted/50" : "text-white mix-blend-difference"
        }`}
      >
        {cell.indexInEpoch}
      </span>
    </div>
  );
}

function SlotTooltip({ hover }: { hover: HoverState }) {
  const { cell, epoch } = hover;
  const meta =
    cell.category === "pending"
      ? null
      : CAT_META[cell.category as FilledCategory];
  const left =
    typeof window !== "undefined"
      ? Math.min(Math.max(hover.x, 110), window.innerWidth - 110)
      : hover.x;
  const relayNames = cell.relays.map((id) => classifyRelay(id).name);

  return (
    <div
      className="pointer-events-none fixed z-[70] -translate-x-1/2 border border-border-labrys bg-panel px-3 py-2 font-mono shadow-[0_10px_28px_rgba(0,0,0,0.22)]"
      style={{ left, top: hover.y + 8 }}
    >
      <div className="text-[9.5px] uppercase tracking-[0.14em] text-fg-muted">
        Slot {cell.slot.toLocaleString()} · Epoch {epoch.toLocaleString()}
      </div>
      <div
        className={`mt-0.5 text-[12px] font-semibold ${
          meta ? meta.text : "text-fg-muted"
        }`}
      >
        {meta ? meta.label : "Pending"}
      </div>
      {relayNames.length > 0 && (
        <div className="mt-0.5 text-[10px] tracking-[0.04em] text-fg-muted">
          via {relayNames.join(", ")}
        </div>
      )}
      {cell.valueWei && (
        <div className="mt-0.5 text-[10px] tracking-[0.04em] text-fg-muted">
          {formatEth(cell.valueWei)} ETH · {cell.numTx ?? 0} txns
        </div>
      )}
    </div>
  );
}

/** Wei (decimal string) → ETH with 4 decimals. */
function formatEth(wei: string): string {
  return (Number(wei) / 1e18).toFixed(4);
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm test -- src/components/sections/epoch-ledger.test.tsx`
Expected: PASS — 2 tests.

- [ ] **Step 6: Commit**

```bash
git add src/app/globals.css src/components/sections/epoch-ledger.tsx src/components/sections/epoch-ledger.test.tsx
git commit -m "feat: add live EpochLedger component"
```

---

## Task 9: Wire the ledger into the homepage

Swap `BlockGrid` for `EpochLedger` in the composition section and delete the old
waffle grid.

**Files:**
- Modify: `src/components/sections/composition.tsx`
- Delete: `src/components/sections/block-grid.tsx`

- [ ] **Step 1: Update the imports and signature**

In `src/components/sections/composition.tsx`, replace:

```tsx
import type { LatestStats } from "@/lib/queries";
import type { CSSVars } from "@/lib/css";
import { Section } from "@/components/section";
import { CountUp } from "@/components/count-up";
import { BlockGrid } from "@/components/sections/block-grid";

interface CompositionProps {
  latest: LatestStats;
}

export function Composition({ latest }: CompositionProps) {
  const { censorshipPct, nonBoostPct, totalBlocks } = latest;
```

with:

```tsx
import type { LatestStats } from "@/lib/queries";
import type { CSSVars } from "@/lib/css";
import { Section } from "@/components/section";
import { CountUp } from "@/components/count-up";
import { EpochLedger } from "@/components/sections/epoch-ledger";
import { getLiveEpochs } from "@/lib/epochs/get-live-epochs";

interface CompositionProps {
  latest: LatestStats;
}

export async function Composition({ latest }: CompositionProps) {
  const { censorshipPct, totalBlocks } = latest;
  const ledger = await getLiveEpochs();
```

- [ ] **Step 2: Swap the grid component**

In the same file, replace:

```tsx
      {/* Tile grid — censoring / neutral / non-MEV-boost, hover for detail */}
      <BlockGrid
        censorshipPct={censorshipPct}
        nonBoostPct={nonBoostPct}
        totalBlocks={totalBlocks}
      />
```

with:

```tsx
      {/* Live epoch ledger — the latest 4 epochs of real per-slot data */}
      <EpochLedger initial={ledger} />
```

- [ ] **Step 3: Update the footnote**

In the same file, replace:

```tsx
        <span className="ml-auto normal-case tracking-normal text-[10px] font-mono text-fg-muted">
          Each tile ≈ 1/128 of the latest day&apos;s blocks. Hover a tile for
          detail.
        </span>
```

with:

```tsx
        <span className="ml-auto normal-case tracking-normal text-[10px] font-mono text-fg-muted">
          Each tile is one real slot · latest 4 epochs, live. Hover a tile for
          detail.
        </span>
```

- [ ] **Step 4: Confirm nothing else imports the old grid, then delete it**

Run: `grep -rn "block-grid\|BlockGrid" src`
Expected: no matches (only `composition.tsx` referenced it, and that line is now gone).

Then delete the file:

```bash
git rm src/components/sections/block-grid.tsx
```

- [ ] **Step 5: Verify the build and lint pass**

Run: `pnpm lint && pnpm build`
Expected: lint clean; build succeeds. The build calls `getLiveEpochs()` while
prerendering the homepage — it will make live relay calls, which is expected.

- [ ] **Step 6: Manual browser check**

Run `pnpm dev`, open `http://localhost:3000`, and confirm:
- The composition section shows a 4-row epoch ledger, roughly half the height
  of the old grid.
- The top row is labelled `● live · N/32`; the remaining rows are completed
  epochs.
- Slot tiles show their 0–31 index; hovering a filled tile shows the slot
  tooltip with the relay name and value.
- No errors in the browser console.
- Leave the tab open ~1 minute: the in-progress row gains 2–3 new tiles per
  poll, each popping in.

- [ ] **Step 7: Commit**

```bash
git add src/components/sections/composition.tsx
git commit -m "feat: replace composition waffle with the live epoch ledger"
```

---

## Task 10: End-to-end test and final verification

**Files:**
- Modify: `e2e/home.spec.ts`

- [ ] **Step 1: Add the e2e test**

Append this test to `e2e/home.spec.ts`:

```ts
test("the composition section renders the live epoch ledger", async ({
  page,
}) => {
  await page.goto("/");
  // The ledger footnote is present regardless of relay liveness.
  await expect(page.getByText(/one real slot/i)).toBeVisible();
  // The in-progress epoch row is labelled live.
  await expect(page.getByText(/live ·/i)).toBeVisible({ timeout: 15000 });
});
```

- [ ] **Step 2: Run the e2e suite**

Run: `pnpm test:e2e`
Expected: PASS — all e2e specs green, including the new ledger test.

- [ ] **Step 3: Run the full unit suite**

Run: `pnpm test`
Expected: PASS — every test green (chain-time, relay-payloads, classify,
get-live-epochs, diff, epoch-ledger, plus the pre-existing suite).

- [ ] **Step 4: Final build + lint**

Run: `pnpm lint && pnpm build`
Expected: lint clean; production build succeeds.

- [ ] **Step 5: Observe a full epoch shift (optional but recommended)**

Run `pnpm dev`, open `http://localhost:3000`, and leave the composition section
in view for ~7 minutes (one epoch). Confirm: when the in-progress epoch
completes, the rows shift down, the oldest row collapses out the bottom, and a
fresh in-progress row expands in at the top — with no layout jump.

- [ ] **Step 6: Commit**

```bash
git add e2e/home.spec.ts
git commit -m "test: add e2e coverage for the live epoch ledger"
```

---

## Self-Review

**Spec coverage** — every section of `2026-05-22-live-epoch-ledger-design.md` maps to a task:
- §4 `chain-time.ts` → Task 1; `relay-payloads.ts` → Task 3; `classify.ts` → Task 4; `get-live-epochs.ts` → Task 5; `relays.ts` `dataApiHost` → Task 2.
- §5 API route → Task 7 (short cache headers, `next: { revalidate: 15 }` on relay fetches in Task 3).
- §6 `epoch-ledger.tsx` → Task 8; `composition.tsx` swap + `block-grid.tsx` deletion → Task 9.
- §6 `diff.ts` (drives the diff-based pops) → Task 6.
- §7 animations: `mw-tile-pop` reuse + key-based remount + the `grid-template-rows` shift + reduced-motion → Task 8 (CSS) and Task 8/9 component logic.
- §8 testing → Tasks 1, 3, 4, 5, 6, 8 (unit), Task 10 (e2e).
- §9 edge cases: relay down → Task 3 (`Promise.allSettled`); all-down `relaysOk: 0` → Task 5 + Task 8 (`reconnecting`); pending slots → Task 5; nonboost lumping → Task 5.

**Placeholder scan** — no TBDs; every code step shows complete code; every command states expected output.

**Type consistency** — `LedgerData` / `EpochRow` / `SlotCell` defined in Task 5 and consumed unchanged in Tasks 6, 8, 9. `PayloadSource` / `DeliveredPayload` / `RelayDeliveriesResult` defined in Task 3, consumed in Task 5. `SlotCategory` from Task 4 used in Task 5. `diffLedger` returns `{ filledSlots, epochShift }` in Task 6 and is consumed with those exact names in Task 8. `dataApiHost` added in Task 2 is read in Task 3.
