CREATE TABLE `api_tokens` (
	`id` char(36) NOT NULL,
	`user_id` char(36) NOT NULL,
	`name` varchar(100) NOT NULL,
	`token_hash` char(64) NOT NULL,
	`created_at` datetime(0) NOT NULL,
	`last_used_at` datetime(0),
	`expires_at` datetime(0),
	CONSTRAINT `api_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `api_tokens_token_hash_unique` UNIQUE(`token_hash`)
);
--> statement-breakpoint
ALTER TABLE `api_tokens` ADD CONSTRAINT `api_tokens_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_api_tokens_user` ON `api_tokens` (`user_id`);