CREATE TABLE `budget_plans` (
	`period` text NOT NULL,
	`starts_on` text PRIMARY KEY NOT NULL,
	`amount_cents` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
ALTER TABLE `bills` ADD `due_day` integer;--> statement-breakpoint
ALTER TABLE `budget_categories` ADD `archived_at` integer;