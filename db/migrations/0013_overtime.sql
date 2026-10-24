CREATE TABLE `overtime` (
	`user_id` char(36) NOT NULL,
	`offset` int NOT NULL,
	`created` datetime(0) NOT NULL,
	CONSTRAINT `overtime_user_id` PRIMARY KEY(`user_id`)
);
--> statement-breakpoint
ALTER TABLE `overtime` ADD CONSTRAINT `overtime_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;