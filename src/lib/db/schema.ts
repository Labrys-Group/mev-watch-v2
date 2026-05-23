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
  /** Total execution-layer blocks proposed that UTC day. 0 = not yet
   *  backfilled (a real day always has ~7,150+). */
  totalChainBlocks: integer("total_chain_blocks").notNull().default(0),
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

/** Rolling window of recent delivered MEV-boost blocks — feeds the epoch ledger. */
export const recentBlocks = sqliteTable("recent_blocks", {
  slot: integer("slot").primaryKey(),
  blockNumber: integer("block_number").notNull(),
  relays: text("relays").notNull(), // JSON array of relayscan relay ids
  builder: text("builder").notNull(),
  valueWei: text("value_wei").notNull(),
  numTx: integer("num_tx").notNull(),
  ingestedAt: integer("ingested_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
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

/** Per builder per day — drives the builder leaderboard. */
export const builderDailyStats = sqliteTable(
  "builder_daily_stats",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    builderKey: text("builder_key").notNull(),
    date: text("date").notNull(),
    blocks: integer("blocks").notNull(),
    sharePct: real("share_pct").notNull(),
  },
  (t) => [
    unique("builder_daily_stats_builder_date_unq").on(t.builderKey, t.date),
  ],
);
