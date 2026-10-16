CREATE TABLE `sms_patterns` (
	`id` text PRIMARY KEY NOT NULL,
	`sender_id` text NOT NULL,
	`kind` text NOT NULL,
	`regex` text NOT NULL,
	`amount_group` integer,
	`fee_group` integer,
	`payee_group` integer,
	`example` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`sender_id`) REFERENCES `sms_senders`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `sms_patterns_sender_idx` ON `sms_patterns` (`sender_id`);--> statement-breakpoint
CREATE TABLE `sms_senders` (
	`id` text PRIMARY KEY NOT NULL,
	`address` text NOT NULL,
	`label` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`read_until` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sms_senders_address_unique` ON `sms_senders` (`address`);--> statement-breakpoint
CREATE TABLE `sms_unmatched` (
	`id` text PRIMARY KEY NOT NULL,
	`sender_id` text NOT NULL,
	`body` text NOT NULL,
	`received_at` integer NOT NULL,
	FOREIGN KEY (`sender_id`) REFERENCES `sms_senders`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `entries` ADD `source` text;--> statement-breakpoint
ALTER TABLE `entries` ADD `ref` text;--> statement-breakpoint
ALTER TABLE `entries` ADD `payee` text;--> statement-breakpoint
CREATE UNIQUE INDEX `entries_ref_idx` ON `entries` (`ref`);