CREATE TABLE `sessions`
(
    `id_hash`    char(64)    NOT NULL,
    `user_id`    char(36)    NOT NULL,
    `expires_at` datetime(0) NOT NULL,
    CONSTRAINT `sessions_id_hash` PRIMARY KEY (`id_hash`)
);
--> statement-breakpoint
ALTER TABLE `sessions`
    ADD CONSTRAINT `sessions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX `idx_sessions_user` ON `sessions` (`user_id`);
--> statement-breakpoint
CREATE INDEX `idx_sessions_expires` ON `sessions` (`expires_at`);