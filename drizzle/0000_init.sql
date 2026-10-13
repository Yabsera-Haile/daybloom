CREATE TABLE `bills` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`note` text,
	`amount_cents` integer NOT NULL,
	`currency` text NOT NULL,
	`due_date` text NOT NULL,
	`repeat_months` integer,
	`payment` text DEFAULT 'auto' NOT NULL,
	`last_paid_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE TABLE `budget_categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`icon` text NOT NULL,
	`color_key` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`color_key` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`archived_at` integer
);
--> statement-breakpoint
CREATE TABLE `entries` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`currency` text NOT NULL,
	`description` text NOT NULL,
	`budget_category_id` text,
	`occurred_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`budget_category_id`) REFERENCES `budget_categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `entries_occurred_idx` ON `entries` (`occurred_at`);--> statement-breakpoint
CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`notes` text,
	`location` text,
	`category_id` text,
	`urgent` integer DEFAULT false NOT NULL,
	`all_day` integer DEFAULT false NOT NULL,
	`start_at` integer NOT NULL,
	`end_at` integer NOT NULL,
	`time_zone` text NOT NULL,
	`rrule` text,
	`series_id` text,
	`original_start_at` integer,
	`source` text DEFAULT 'local' NOT NULL,
	`external_id` text,
	`external_etag` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `events_start_idx` ON `events` (`start_at`);--> statement-breakpoint
CREATE INDEX `events_series_idx` ON `events` (`series_id`);--> statement-breakpoint
CREATE TABLE `goals` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`note` text,
	`icon` text,
	`kind` text DEFAULT 'savings' NOT NULL,
	`target_cents` integer NOT NULL,
	`saved_cents` integer DEFAULT 0 NOT NULL,
	`month` text,
	`due_date` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`reached_at` integer,
	`archived_at` integer
);
--> statement-breakpoint
CREATE TABLE `habit_checks` (
	`habit_id` text NOT NULL,
	`period` text NOT NULL,
	`checked_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	PRIMARY KEY(`habit_id`, `period`),
	FOREIGN KEY (`habit_id`) REFERENCES `habits`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `habits` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`note` text,
	`icon` text,
	`frequency` text DEFAULT 'daily' NOT NULL,
	`routine_id` text,
	`reminder_time` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`archived_at` integer,
	FOREIGN KEY (`routine_id`) REFERENCES `routines`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `hour_notes` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`hour` integer NOT NULL,
	`text` text NOT NULL,
	`done` integer DEFAULT false NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE INDEX `hour_notes_date_idx` ON `hour_notes` (`date`);--> statement-breakpoint
CREATE TABLE `month_budgets` (
	`month` text PRIMARY KEY NOT NULL,
	`amount_cents` integer
);
--> statement-breakpoint
CREATE TABLE `reminders` (
	`id` text PRIMARY KEY NOT NULL,
	`target_type` text NOT NULL,
	`target_id` text NOT NULL,
	`offset_minutes` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `reminders_target_idx` ON `reminders` (`target_type`,`target_id`);--> statement-breakpoint
CREATE TABLE `routines` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`icon` text,
	`time` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`archived_at` integer
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`notes` text,
	`urgent` integer DEFAULT false NOT NULL,
	`category_id` text,
	`list_label` text,
	`scope` text DEFAULT 'day' NOT NULL,
	`date` text NOT NULL,
	`due_time` text,
	`done` integer DEFAULT false NOT NULL,
	`done_at` integer,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `tasks_date_idx` ON `tasks` (`date`);--> statement-breakpoint
CREATE TABLE `week_intentions` (
	`week_start` text PRIMARY KEY NOT NULL,
	`text` text NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
