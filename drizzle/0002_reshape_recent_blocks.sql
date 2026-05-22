DROP TABLE `recent_blocks`;
--> statement-breakpoint
CREATE TABLE `recent_blocks` (
	`slot` integer PRIMARY KEY NOT NULL,
	`block_number` integer NOT NULL,
	`relays` text NOT NULL,
	`builder` text NOT NULL,
	`value_wei` text NOT NULL,
	`num_tx` integer NOT NULL,
	`ingested_at` integer NOT NULL
);
