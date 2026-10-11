CREATE TABLE `projects`
(
    `id`   char(36)     NOT NULL,
    `name` varchar(100) NOT NULL,
    CONSTRAINT `projects_id` PRIMARY KEY (`id`),
    CONSTRAINT `projects_name_unique` UNIQUE (`name`)
);
--> statement-breakpoint
CREATE TABLE `time_entries`
(
    `id`        char(36)                NOT NULL,
    `user_id`   char(36)                NOT NULL,
    `type`      enum ('kommen','gehen') NOT NULL,
    `booked_at` datetime(0)             NOT NULL,
    CONSTRAINT `time_entries_id` PRIMARY KEY (`id`)
);
--> statement-breakpoint
CREATE TABLE `time_entry_projects`
(
    `time_entry_id` char(36) NOT NULL,
    `project_id`    char(36) NOT NULL,
    CONSTRAINT `time_entry_projects_time_entry_id` PRIMARY KEY (`time_entry_id`)
);
--> statement-breakpoint
CREATE TABLE `users`
(
    `id`         char(36)     NOT NULL,
    `name`       varchar(100) NOT NULL,
    `email`      varchar(191) NOT NULL,
    `avatar_url` varchar(2048) DEFAULT '',
    CONSTRAINT `users_id` PRIMARY KEY (`id`),
    CONSTRAINT `users_email_unique` UNIQUE (`email`)
);
--> statement-breakpoint
ALTER TABLE `time_entries`
    ADD CONSTRAINT `time_entries_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `time_entry_projects`
    ADD CONSTRAINT `time_entry_projects_time_entry_id_time_entries_id_fk` FOREIGN KEY (`time_entry_id`) REFERENCES `time_entries` (`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `time_entry_projects`
    ADD CONSTRAINT `time_entry_projects_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX `idx_time_entries_user_booked` ON `time_entries` (`user_id`, `booked_at`);
--> statement-breakpoint
CREATE INDEX `idx_time_entry_projects_project` ON `time_entry_projects` (`project_id`);