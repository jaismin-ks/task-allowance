PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_wishlist_item` (
	`id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))) NOT NULL,
	`product_url` text,
	`title` text,
	`image_url` text,
	`price` real,
	`currency` text,
	`priority_flag` integer DEFAULT false NOT NULL,
	`scrape_status` text DEFAULT 'pending' NOT NULL,
	`purchased_at` text,
	`added_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_wishlist_item`("id", "product_url", "title", "image_url", "price", "currency", "priority_flag", "scrape_status", "purchased_at", "added_at") SELECT "id", "product_url", "title", "image_url", "price", "currency", "priority_flag", "scrape_status", NULL, "added_at" FROM `wishlist_item`;--> statement-breakpoint
DROP TABLE `wishlist_item`;--> statement-breakpoint
ALTER TABLE `__new_wishlist_item` RENAME TO `wishlist_item`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_single_priority` ON `wishlist_item` (`priority_flag`) WHERE priority_flag = 1;