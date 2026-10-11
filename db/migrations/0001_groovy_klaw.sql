CREATE TABLE `vacations`
(
    `id`         char(36) NOT NULL,
    `user_id`    char(36) NOT NULL,
    `start_date` date     NOT NULL,
    `end_date`   date     NOT NULL,
    CONSTRAINT `vacations_id` PRIMARY KEY (`id`)
);
--> statement-breakpoint
ALTER TABLE `vacations`
    ADD CONSTRAINT `vacations_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX `idx_vacations_user_start` ON `vacations` (`user_id`, `start_date`);