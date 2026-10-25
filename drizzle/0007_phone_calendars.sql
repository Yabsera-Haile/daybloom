CREATE TABLE `calendar_removals` (
	`external_id` text PRIMARY KEY NOT NULL,
	`removed_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
ALTER TABLE `events` ADD `calendar_id` text;--> statement-breakpoint
ALTER TABLE `events` ADD `invite` text;--> statement-breakpoint
ALTER TABLE `events` ADD `read_only` integer DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX `events_external_idx` ON `events` (`external_id`);--> statement-breakpoint
CREATE TRIGGER `events_dropped_from_phone` AFTER DELETE ON `events`
WHEN old.source = 'device' AND old.external_id IS NOT NULL AND instr(old.external_id, '@') = 0
BEGIN
	INSERT OR IGNORE INTO `calendar_removals` (`external_id`) VALUES (old.external_id);
END;
