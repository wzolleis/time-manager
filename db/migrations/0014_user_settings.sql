CREATE TABLE `user_setting_values` (
	`id` char(36) NOT NULL,
	`user_id` char(36) NOT NULL,
	`setting_id` char(36) NOT NULL,
	`value` varchar(100) NOT NULL,
	`valid_from` date NOT NULL,
	CONSTRAINT `user_setting_values_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_user_setting_values` UNIQUE(`user_id`,`setting_id`,`valid_from`)
);
--> statement-breakpoint
CREATE TABLE `user_settings` (
	`id` char(36) NOT NULL,
	`name` varchar(50) NOT NULL,
	`description` varchar(500) NOT NULL,
	`type` enum('number','string') NOT NULL,
	`unit` enum('hour','day'),
	`default_value` varchar(100) NOT NULL,
	`valid_from_unit` enum('day','year') NOT NULL,
	CONSTRAINT `user_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_settings_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
ALTER TABLE `user_setting_values` ADD CONSTRAINT `user_setting_values_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_setting_values` ADD CONSTRAINT `user_setting_values_setting_id_user_settings_id_fk` FOREIGN KEY (`setting_id`) REFERENCES `user_settings`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- Die Einstellungen sind fest vorgegeben, ihre IDs stehen in shared/user-setting.ts
INSERT INTO `user_settings` (`id`, `name`, `description`, `type`, `unit`, `default_value`, `valid_from_unit`)
VALUES ('fcf78946-28c3-4152-9abb-35af0c50cb8f', 'Soll', 'Die Anzahl der Stunden, die pro Tag gearbeitet wird. Das heißt auch Soll.', 'number', 'hour', '8', 'day');
--> statement-breakpoint
INSERT INTO `user_settings` (`id`, `name`, `description`, `type`, `unit`, `default_value`, `valid_from_unit`)
VALUES ('6fdfc98d-8096-4e64-92be-638b938929ed', 'Urlaubstage', 'Die Anzahl der Urlaubstage pro Jahr', 'number', 'day', '30', 'year');
