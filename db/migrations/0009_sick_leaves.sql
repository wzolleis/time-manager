CREATE TABLE `sick_leaves` (
	`id` char(36) NOT NULL,
	`user_id` char(36) NOT NULL,
	`start_date` date NOT NULL,
	`end_date` date NOT NULL,
	`note` varchar(500),
	CONSTRAINT `sick_leaves_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `sick_leaves` ADD CONSTRAINT `sick_leaves_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_sick_leaves_user_start` ON `sick_leaves` (`user_id`,`start_date`);