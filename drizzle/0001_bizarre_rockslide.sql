CREATE TABLE `builder_daily_stats` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`builder_key` text NOT NULL,
	`date` text NOT NULL,
	`blocks` integer NOT NULL,
	`share_pct` real NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `builder_daily_stats_builder_date_unq` ON `builder_daily_stats` (`builder_key`,`date`);