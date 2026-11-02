ALTER TABLE `user_settings` MODIFY COLUMN `type` enum('number','string','boolean') NOT NULL;--> statement-breakpoint
ALTER TABLE `user_settings` MODIFY COLUMN `valid_from_unit` enum('day','year','immediately') NOT NULL;--> statement-breakpoint
-- Die Einstellungen sind fest vorgegeben, ihre IDs stehen in shared/user-setting.ts
INSERT INTO `user_settings` (`id`, `name`, `description`, `type`, `unit`, `default_value`, `valid_from_unit`)
VALUES ('e2e48edb-c612-466e-a886-03c72466e4f3', 'show_action_bar', 'Zeige die Action-Bar an', 'boolean', NULL, 'true', 'immediately');
