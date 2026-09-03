CREATE TABLE `interactions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`event_type` text NOT NULL,
	`place_id` text,
	`place_name` text,
	`category` text,
	`search_query` text,
	`metadata` text,
	`occurred_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_interactions_user_time` ON `interactions` (`user_id`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `idx_interactions_user_category` ON `interactions` (`user_id`,`category`);--> statement-breakpoint
CREATE TABLE `users` (
	`user_id` text PRIMARY KEY NOT NULL,
	`platform_email` text NOT NULL,
	`google_sub` text,
	`google_email` text,
	`display_name` text,
	`avatar_url` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_users_google_sub` ON `users` (`google_sub`);