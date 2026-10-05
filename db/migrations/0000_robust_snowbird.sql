CREATE TABLE `allowance_pool` (
	`id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))) NOT NULL,
	`month_key` text NOT NULL,
	`monthly_budget_cap` real NOT NULL,
	`total_earned` real DEFAULT 0 NOT NULL,
	`total_spent` real DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `allowance_pool_month_key_unique` ON `allowance_pool` (`month_key`);--> statement-breakpoint
CREATE TABLE `task` (
	`id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))) NOT NULL,
	`title` text NOT NULL,
	`monetary_value` real NOT NULL,
	`effort_rating` integer NOT NULL,
	`completion_status` text DEFAULT 'pending' NOT NULL,
	`source` text DEFAULT 'manual' NOT NULL,
	`task_pack_id` text,
	`completed_at` text,
	`timestamp` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `user_profile` (
	`id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))) NOT NULL,
	`display_name` text DEFAULT 'Me' NOT NULL,
	`monthly_allowance_cap` real DEFAULT 150 NOT NULL,
	`daily_task_cap` real,
	`currency_code` text DEFAULT 'USD' NOT NULL,
	`voice_input_enabled` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `wishlist_item` (
	`id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))) NOT NULL,
	`product_url` text NOT NULL,
	`title` text,
	`image_url` text,
	`price` real,
	`priority_flag` integer DEFAULT false NOT NULL,
	`scrape_status` text DEFAULT 'pending' NOT NULL,
	`added_at` text DEFAULT (datetime('now')) NOT NULL
);
