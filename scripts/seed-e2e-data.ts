import { mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  initializeMevWatchDatabase,
  upsertDay,
} from "../src/lib/mev-watch-sqlite";
import type { MevWatchDay } from "../src/lib/mev-watch-data";

export const E2E_SQLITE_PATH = path.join(
  process.cwd(),
  "data/e2e-mev-watch.sqlite",
);

const GENERATED_AT = "2026-05-26T03:30:00.000Z";

const DAYS: MevWatchDay[] = [
  {
    date: "2026-05-23",
    totalChainBlocks: 7200,
    relays: [
      { relayId: "relay.ultrasound.money", numPayloads: 2600 },
      { relayId: "boost-relay.flashbots.net", numPayloads: 900 },
      { relayId: "bloxroute.regulated.blxrbdn.com", numPayloads: 400 },
    ],
    builders: [
      { builderId: "builder-a", numBlocks: 2800 },
      { builderId: "builder-b", numBlocks: 900 },
    ],
  },
  {
    date: "2026-05-24",
    totalChainBlocks: 7200,
    relays: [
      { relayId: "relay.ultrasound.money", numPayloads: 2700 },
      { relayId: "boost-relay.flashbots.net", numPayloads: 700 },
      { relayId: "bloxroute.regulated.blxrbdn.com", numPayloads: 300 },
    ],
    builders: [
      { builderId: "builder-a", numBlocks: 2900 },
      { builderId: "builder-c", numBlocks: 800 },
    ],
  },
  {
    date: "2026-05-25",
    totalChainBlocks: 7200,
    relays: [
      { relayId: "relay.ultrasound.money", numPayloads: 3000 },
      { relayId: "boost-relay.flashbots.net", numPayloads: 500 },
      { relayId: "bloxroute.regulated.blxrbdn.com", numPayloads: 250 },
    ],
    builders: [
      { builderId: "builder-a", numBlocks: 3000 },
      { builderId: "builder-b", numBlocks: 750 },
    ],
  },
];

export function seedE2eData(filePath = E2E_SQLITE_PATH): void {
  rmSync(filePath, { force: true });
  mkdirSync(path.dirname(filePath), { recursive: true });
  const db = initializeMevWatchDatabase(filePath, { generatedAt: GENERATED_AT });
  try {
    for (const day of DAYS) {
      upsertDay(db, day, GENERATED_AT);
    }
  } finally {
    db.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  seedE2eData();
}
