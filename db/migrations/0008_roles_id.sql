-- Rollen werden ab jetzt über die id referenziert, nicht mehr über den Namen (Daten: siehe 0007)
ALTER TABLE `endpoint_roles`
    DROP FOREIGN KEY `endpoint_roles_role_roles_name_fk`;
--> statement-breakpoint
ALTER TABLE `user_roles`
    DROP FOREIGN KEY `user_roles_role_roles_name_fk`;
--> statement-breakpoint
DROP INDEX `idx_user_roles_role` ON `user_roles`;
--> statement-breakpoint
ALTER TABLE `roles`
    MODIFY COLUMN `id` char(36) NOT NULL;
--> statement-breakpoint
-- Primärschlüssel in einem Schritt tauschen
ALTER TABLE `roles`
    DROP PRIMARY KEY,
    ADD PRIMARY KEY (`id`);
--> statement-breakpoint
ALTER TABLE `roles`
    ADD CONSTRAINT `roles_name_unique` UNIQUE (`name`);
--> statement-breakpoint
ALTER TABLE `user_roles`
    MODIFY COLUMN `role_id` char(36) NOT NULL;
--> statement-breakpoint
-- In einem Schritt, denn der Fremdschlüssel auf user_id braucht einen Index mit user_id vorn
ALTER TABLE `user_roles`
    DROP PRIMARY KEY,
    ADD PRIMARY KEY (`user_id`, `role_id`);
--> statement-breakpoint
ALTER TABLE `user_roles`
    DROP COLUMN `role`;
--> statement-breakpoint
ALTER TABLE `endpoint_roles`
    MODIFY COLUMN `role_id` char(36) NOT NULL;
--> statement-breakpoint
ALTER TABLE `endpoint_roles`
    DROP COLUMN `role`;
--> statement-breakpoint
CREATE INDEX `idx_user_roles_role` ON `user_roles` (`role_id`);
--> statement-breakpoint
ALTER TABLE `endpoint_roles`
    ADD CONSTRAINT `endpoint_roles_role_id_roles_id_fk` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `user_roles`
    ADD CONSTRAINT `user_roles_role_id_roles_id_fk` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE no action ON UPDATE no action;
