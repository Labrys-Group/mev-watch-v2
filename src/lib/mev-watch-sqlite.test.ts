import { DatabaseSync } from "node:sqlite";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  bootstrapMevWatchDatabase,
  createReadOnlyMevWatchDatabase,
  initializeMevWatchDatabase,
  readSnapshotFromDatabase,
  resolveMevWatchSqlitePath,
  upsertDay,
} from "./mev-watch-sqlite";

async function withTempDb<T>(run: (dbPath: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(path.join(tmpdir(), "mev-watch-sqlite-"));
  try {
    return await run(path.join(dir, "mev-watch.sqlite"));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

describe("SQLite MEV Watch artifact", () => {
  it("allows the SQLite artifact path to be overridden by environment", () => {
    expect(
      resolveMevWatchSqlitePath({
        MEV_WATCH_SQLITE_PATH: "data/test-mev-watch.sqlite",
      }),
    ).toBe(path.join(process.cwd(), "data/test-mev-watch.sqlite"));
  });

  it("bootstraps a missing local artifact with the empty schema", async () => {
    await withTempDb(async (dbPath) => {
      bootstrapMevWatchDatabase(dbPath, "2026-05-26T01:00:00.000Z");

      const db = createReadOnlyMevWatchDatabase(dbPath);
      try {
        expect(readSnapshotFromDatabase(db)).toEqual({
          schemaVersion: 1,
          generatedAt: "2026-05-26T01:00:00.000Z",
          sourceStartDate: "2022-09-15",
          sourceEndDate: null,
          days: [],
        });
      } finally {
        db.close();
      }
    });
  });

  it("stores raw daily rows and reads the snapshot back in date order", async () => {
    await withTempDb(async (dbPath) => {
      const db = initializeMevWatchDatabase(dbPath, {
        generatedAt: "2026-05-26T01:00:00.000Z",
      });
      try {
        upsertDay(
          db,
          {
            date: "2023-12-18",
            totalChainBlocks: 10_000,
            relays: [{ relayId: "relay.ultrasound.money", numPayloads: 300 }],
            builders: [{ builderId: "builder-a", numBlocks: 9_000 }],
          },
          "2026-05-26T01:00:00.000Z",
        );
        upsertDay(
          db,
          {
            date: "2023-12-17",
            totalChainBlocks: 10_000,
            relays: [
              {
                relayId: "bloxroute.max-profit.blxrbdn.com",
                numPayloads: 100,
              },
            ],
            builders: [{ builderId: "builder-b", numBlocks: 8_000 }],
          },
          "2026-05-26T01:00:00.000Z",
        );
      } finally {
        db.close();
      }

      const readDb = createReadOnlyMevWatchDatabase(dbPath);
      try {
        expect(readSnapshotFromDatabase(readDb)).toEqual({
          schemaVersion: 1,
          generatedAt: "2026-05-26T01:00:00.000Z",
          sourceStartDate: "2023-12-17",
          sourceEndDate: "2023-12-18",
          days: [
            {
              date: "2023-12-17",
              totalChainBlocks: 10_000,
              relays: [
                {
                  relayId: "bloxroute.max-profit.blxrbdn.com",
                  numPayloads: 100,
                },
              ],
              builders: [{ builderId: "builder-b", numBlocks: 8_000 }],
            },
            {
              date: "2023-12-18",
              totalChainBlocks: 10_000,
              relays: [{ relayId: "relay.ultrasound.money", numPayloads: 300 }],
              builders: [{ builderId: "builder-a", numBlocks: 9_000 }],
            },
          ],
        });
      } finally {
        readDb.close();
      }
    });
  });

  it("opens runtime databases read-only", async () => {
    await withTempDb(async (dbPath) => {
      const db = initializeMevWatchDatabase(dbPath);
      db.close();

      const readDb = createReadOnlyMevWatchDatabase(dbPath);
      try {
        expect(() => {
          readDb.exec("INSERT INTO days (date, total_chain_blocks) VALUES ('2026-05-25', 0)");
        }).toThrow();
      } finally {
        readDb.close();
      }
    });
  });

  it("preserves days with unavailable block counts", async () => {
    await withTempDb(async (dbPath) => {
      const db = initializeMevWatchDatabase(dbPath, {
        generatedAt: "2026-05-26T01:00:00.000Z",
      });
      try {
        upsertDay(
          db,
          {
            date: "2023-12-19",
            totalChainBlocks: null,
            relays: [{ relayId: "relay.ultrasound.money", numPayloads: 300 }],
            builders: [{ builderId: "builder-a", numBlocks: 9_000 }],
          },
          "2026-05-26T01:00:00.000Z",
        );
      } finally {
        db.close();
      }

      const readDb = createReadOnlyMevWatchDatabase(dbPath);
      try {
        expect(readSnapshotFromDatabase(readDb).days).toEqual([
          {
            date: "2023-12-19",
            totalChainBlocks: null,
            relays: [{ relayId: "relay.ultrasound.money", numPayloads: 300 }],
            builders: [{ builderId: "builder-a", numBlocks: 9_000 }],
          },
        ]);
      } finally {
        readDb.close();
      }
    });
  });

  it("migrates existing NOT NULL artifact schemas to nullable block counts", async () => {
    await withTempDb(async (dbPath) => {
      const legacyDb = new DatabaseSync(dbPath);
      legacyDb.exec(`
        CREATE TABLE metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL) STRICT;
        CREATE TABLE days (
          date TEXT PRIMARY KEY,
          total_chain_blocks INTEGER NOT NULL
        ) STRICT;
        CREATE TABLE relay_counts (
          date TEXT NOT NULL,
          relay_id TEXT NOT NULL,
          num_payloads INTEGER NOT NULL,
          PRIMARY KEY (date, relay_id),
          FOREIGN KEY (date) REFERENCES days(date) ON DELETE CASCADE
        ) STRICT;
        CREATE TABLE builder_counts (
          date TEXT NOT NULL,
          builder_id TEXT NOT NULL,
          num_blocks INTEGER NOT NULL,
          PRIMARY KEY (date, builder_id),
          FOREIGN KEY (date) REFERENCES days(date) ON DELETE CASCADE
        ) STRICT;
        INSERT INTO metadata (key, value) VALUES
          ('schemaVersion', '1'),
          ('generatedAt', '2026-05-26T01:00:00.000Z'),
          ('sourceStartDate', '2023-12-18'),
          ('sourceEndDate', '2023-12-18');
        INSERT INTO days (date, total_chain_blocks) VALUES ('2023-12-18', 10000);
      `);
      legacyDb.close();

      const db = initializeMevWatchDatabase(dbPath);
      try {
        upsertDay(db, {
          date: "2023-12-19",
          totalChainBlocks: null,
          relays: [],
          builders: [],
        });
      } finally {
        db.close();
      }

      const readDb = createReadOnlyMevWatchDatabase(dbPath);
      try {
        expect(readSnapshotFromDatabase(readDb).days.map((day) => day.date)).toEqual([
          "2023-12-18",
          "2023-12-19",
        ]);
        expect(readSnapshotFromDatabase(readDb).days.at(-1)?.totalChainBlocks).toBeNull();
      } finally {
        readDb.close();
      }
    });
  });
});
