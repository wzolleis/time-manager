CREATE TABLE `passkey_challenges` (
	`challenge` varchar(64) NOT NULL,
	`purpose` enum('registration','authentication') NOT NULL,
	`user_id` char(36),
	`expires_at` datetime(0) NOT NULL,
	CONSTRAINT `passkey_challenges_challenge` PRIMARY KEY(`challenge`)
);
--> statement-breakpoint
CREATE TABLE `passkeys` (
	`id` char(36) NOT NULL,
	`user_id` char(36) NOT NULL,
	`name` varchar(100) NOT NULL,
	`credential_id` varchar(700) NOT NULL,
	`public_key` text NOT NULL,
	`counter` int unsigned NOT NULL,
	`transports` varchar(255),
	`backed_up` boolean NOT NULL,
	`created_at` datetime(0) NOT NULL,
	`last_used_at` datetime(0),
	CONSTRAINT `passkeys_id` PRIMARY KEY(`id`),
	CONSTRAINT `passkeys_credential_id_unique` UNIQUE(`credential_id`)
);
--> statement-breakpoint
ALTER TABLE `passkey_challenges` ADD CONSTRAINT `passkey_challenges_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `passkeys` ADD CONSTRAINT `passkeys_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_passkey_challenges_expires` ON `passkey_challenges` (`expires_at`);--> statement-breakpoint
CREATE INDEX `idx_passkeys_user` ON `passkeys` (`user_id`);