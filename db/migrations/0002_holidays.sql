CREATE TABLE `holidays`
(
    `id`      char(36)     NOT NULL,
    `user_id` char(36),
    `date`    date         NOT NULL,
    `name`    varchar(100) NOT NULL,
    CONSTRAINT `holidays_id` PRIMARY KEY (`id`)
);
--> statement-breakpoint
ALTER TABLE `holidays`
    ADD CONSTRAINT `holidays_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX `idx_holidays_date` ON `holidays` (`date`);
--> statement-breakpoint
CREATE INDEX `idx_holidays_user_date` ON `holidays` (`user_id`, `date`);