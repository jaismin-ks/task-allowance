CREATE TABLE `task_series` (
	`id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))) NOT NULL,
	`title` text NOT NULL,
	`monetary_value` real NOT NULL,
	`effort_rating` integer NOT NULL,
	`source` text DEFAULT 'manual' NOT NULL,
	`frequency` text NOT NULL,
	`weekdays` text,
	`month_day` integer,
	`start_date` text NOT NULL,
	`last_generated_date` text,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
ALTER TABLE `task` ADD `series_id` text;--> statement-breakpoint
ALTER TABLE `task` ADD `due_date` text;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_task_series_due` ON `task` (`series_id`,`due_date`) WHERE series_id IS NOT NULL;