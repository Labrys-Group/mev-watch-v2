import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import {
  MevWatchDaySchema,
  MevWatchSnapshotSchema,
  type MevWatchDay,
  type MevWatchSnapshot,
} from "./mev-watch-data";
import { DEFAULT_START_DATE } from "./mev-watch-generator-constants";

export const SQLITE_DATA_PATH = path.join(
  process.cwd(),
  "src/data/mev-watch.sqlite",
);

export type MevWatchDatabase = InstanceType<typeof DatabaseSync>;

interface InitializeOptions {
  generatedAt?: string;
}

interface MetadataRow {
  key: string;
  value: string;
}

interface DayRow {
  date: string;
  total_chain_blocks: number | null;
}

interface RelayCountRow {
  relay_id: string;
  num_payloads: number;
}

interface BuilderCountRow {
  builder_id: string;
  num_blocks: number;
}

export function createReadOnlyMevWatchDatabase(
  filePath = SQLITE_DATA_PATH,
): MevWatchDatabase {
  return new DatabaseSync(filePath, { readOnly: true });
}

export function createWritableMevWatchDatabase(
  filePath = SQLITE_DATA_PATH,
): MevWatchDatabase {
  return new DatabaseSync(filePath);
}

export function initializeMevWatchDatabase(
  filePath = SQLITE_DATA_PATH,
  opts: InitializeOptions = {},
): MevWatchDatabase {
  const db = createWritableMevWatchDatabase(filePath);
  initializeSchema(db, opts.generatedAt);
  return db;
}

export function initializeSchema(
  db: MevWatchDatabase,
  generatedAt = new Date().toISOString(),
): void {
  db.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS metadata (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    ) STRICT;

    CREATE TABLE IF NOT EXISTS days (
      date TEXT PRIMARY KEY,
      total_chain_blocks INTEGER
    ) STRICT;

    CREATE TABLE IF NOT EXISTS relay_counts (
      date TEXT NOT NULL,
      relay_id TEXT NOT NULL,
      num_payloads INTEGER NOT NULL,
      PRIMARY KEY (date, relay_id),
      FOREIGN KEY (date) REFERENCES days(date) ON DELETE CASCADE
    ) STRICT;

    CREATE TABLE IF NOT EXISTS builder_counts (
      date TEXT NOT NULL,
      builder_id TEXT NOT NULL,
      num_blocks INTEGER NOT NULL,
      PRIMARY KEY (date, builder_id),
      FOREIGN KEY (date) REFERENCES days(date) ON DELETE CASCADE
    ) STRICT;

    CREATE INDEX IF NOT EXISTS relay_counts_date_idx ON relay_counts(date);
    CREATE INDEX IF NOT EXISTS builder_counts_date_idx ON builder_counts(date);
  `);
  migrateDaysTotalChainBlocksNullable(db);

  setMetadataIfMissing(db, "schemaVersion", "1");
  setMetadataIfMissing(db, "generatedAt", generatedAt);
  setMetadataIfMissing(db, "sourceStartDate", DEFAULT_START_DATE);
}

export function readSnapshotFromDatabase(
  db: MevWatchDatabase,
): MevWatchSnapshot {
  const metadata = readMetadata(db);
  const days = readDays(db);
  return MevWatchSnapshotSchema.parse({
    schemaVersion: Number(metadata.get("schemaVersion") ?? "1"),
    generatedAt: metadata.get("generatedAt") ?? new Date(0).toISOString(),
    sourceStartDate:
      metadata.get("sourceStartDate") ?? days[0]?.date ?? DEFAULT_START_DATE,
    sourceEndDate: metadata.get("sourceEndDate") ?? null,
    days,
  });
}

export function readLatestDayFromDatabase(
  db: MevWatchDatabase,
): MevWatchDay | null {
  const row = db
    .prepare("SELECT date, total_chain_blocks FROM days ORDER BY date DESC LIMIT 1")
    .get() as unknown as DayRow | undefined;
  return row ? readDayDetails(db, row) : null;
}

export function readMetadata(db: MevWatchDatabase): Map<string, string> {
  const rows = db
    .prepare("SELECT key, value FROM metadata")
    .all() as unknown as MetadataRow[];
  return new Map(rows.map((row) => [row.key, row.value]));
}

export function readSourceEndDate(db: MevWatchDatabase): string | null {
  const row = db
    .prepare("SELECT value FROM metadata WHERE key = 'sourceEndDate'")
    .get() as unknown as { value: string } | undefined;
  return row?.value ?? null;
}

export function readDatesMissingTotalChainBlocks(db: MevWatchDatabase): string[] {
  const rows = db
    .prepare(
      "SELECT date FROM days WHERE total_chain_blocks IS NULL ORDER BY date ASC",
    )
    .all() as unknown as { date: string }[];
  return rows.map((row) => row.date);
}

export function updateDayTotalChainBlocks(
  db: MevWatchDatabase,
  date: string,
  totalChainBlocks: number,
  generatedAt = new Date().toISOString(),
): void {
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare("UPDATE days SET total_chain_blocks = ? WHERE date = ?").run(
      totalChainBlocks,
      date,
    );
    setMetadata(db, "schemaVersion", "1");
    setMetadata(db, "generatedAt", generatedAt);
    refreshSourceBounds(db);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export function upsertDay(
  db: MevWatchDatabase,
  day: MevWatchDay,
  generatedAt = new Date().toISOString(),
): void {
  const parsed = MevWatchDaySchema.parse(day);
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare(
      `
        INSERT INTO days (date, total_chain_blocks)
        VALUES (?, ?)
        ON CONFLICT(date) DO UPDATE SET total_chain_blocks = excluded.total_chain_blocks
      `,
    ).run(parsed.date, parsed.totalChainBlocks);

    db.prepare("DELETE FROM relay_counts WHERE date = ?").run(parsed.date);
    const insertRelay = db.prepare(
      `
        INSERT INTO relay_counts (date, relay_id, num_payloads)
        VALUES (?, ?, ?)
      `,
    );
    for (const relay of parsed.relays) {
      insertRelay.run(parsed.date, relay.relayId, relay.numPayloads);
    }

    db.prepare("DELETE FROM builder_counts WHERE date = ?").run(parsed.date);
    const insertBuilder = db.prepare(
      `
        INSERT INTO builder_counts (date, builder_id, num_blocks)
        VALUES (?, ?, ?)
      `,
    );
    for (const builder of parsed.builders) {
      insertBuilder.run(parsed.date, builder.builderId, builder.numBlocks);
    }

    setMetadata(db, "schemaVersion", "1");
    setMetadata(db, "generatedAt", generatedAt);
    refreshSourceBounds(db);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

function readDays(db: MevWatchDatabase): MevWatchDay[] {
  const rows = db
    .prepare("SELECT date, total_chain_blocks FROM days ORDER BY date ASC")
    .all() as unknown as DayRow[];
  return rows.map((row) => readDayDetails(db, row));
}

function readDayDetails(db: MevWatchDatabase, row: DayRow): MevWatchDay {
  const relays = db
    .prepare(
      `
        SELECT relay_id, num_payloads
        FROM relay_counts
        WHERE date = ?
        ORDER BY relay_id ASC
      `,
    )
    .all(row.date) as unknown as RelayCountRow[];
  const builders = db
    .prepare(
      `
        SELECT builder_id, num_blocks
        FROM builder_counts
        WHERE date = ?
        ORDER BY builder_id ASC
      `,
    )
    .all(row.date) as unknown as BuilderCountRow[];

  return MevWatchDaySchema.parse({
    date: row.date,
    totalChainBlocks: row.total_chain_blocks,
    relays: relays.map((relay) => ({
      relayId: relay.relay_id,
      numPayloads: relay.num_payloads,
    })),
    builders: builders.map((builder) => ({
      builderId: builder.builder_id,
      numBlocks: builder.num_blocks,
    })),
  });
}

function migrateDaysTotalChainBlocksNullable(db: MevWatchDatabase): void {
  const column = db
    .prepare("PRAGMA table_info(days)")
    .all()
    .find((row) => (row as { name?: string }).name === "total_chain_blocks") as
    | { notnull: number }
    | undefined;
  if (!column?.notnull) return;

  db.exec(`
    PRAGMA foreign_keys = OFF;
    CREATE TABLE days_nullable (
      date TEXT PRIMARY KEY,
      total_chain_blocks INTEGER
    ) STRICT;
    INSERT INTO days_nullable (date, total_chain_blocks)
      SELECT date, total_chain_blocks FROM days;
    DROP TABLE days;
    ALTER TABLE days_nullable RENAME TO days;
    PRAGMA foreign_keys = ON;
  `);
}

function setMetadataIfMissing(
  db: MevWatchDatabase,
  key: string,
  value: string,
): void {
  db.prepare("INSERT OR IGNORE INTO metadata (key, value) VALUES (?, ?)").run(
    key,
    value,
  );
}

function setMetadata(db: MevWatchDatabase, key: string, value: string): void {
  db.prepare(
    `
      INSERT INTO metadata (key, value)
      VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `,
  ).run(key, value);
}

function refreshSourceBounds(db: MevWatchDatabase): void {
  const bounds = db
    .prepare("SELECT MIN(date) AS start, MAX(date) AS end FROM days")
    .get() as unknown as { start: string | null; end: string | null };

  setMetadata(db, "sourceStartDate", bounds.start ?? DEFAULT_START_DATE);
  if (bounds.end) {
    setMetadata(db, "sourceEndDate", bounds.end);
  }
}
