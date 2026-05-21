CREATE TABLE `daily_stats` (
	`date` text PRIMARY KEY NOT NULL,
	`censorship_pct` real NOT NULL,
	`neutral_pct` real NOT NULL,
	`non_boost_pct` real NOT NULL,
	`total_blocks` integer NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `recent_blocks` (
	`slot` integer PRIMARY KEY NOT NULL,
	`block_number` integer NOT NULL,
	`relay_key` text,
	`category` text NOT NULL,
	`ts` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `refresh_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ran_at` integer NOT NULL,
	`status` text NOT NULL,
	`source` text NOT NULL,
	`message` text
);
--> statement-breakpoint
CREATE TABLE `relay_daily_stats` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`relay_key` text NOT NULL,
	`date` text NOT NULL,
	`blocks` integer NOT NULL,
	`share_pct` real NOT NULL,
	`censorship_rate` real NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `relay_daily_stats_relay_date_unq` ON `relay_daily_stats` (`relay_key`,`date`);