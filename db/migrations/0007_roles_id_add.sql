ALTER TABLE `endpoint_roles`
    ADD `role_id` char(36);
--> statement-breakpoint
ALTER TABLE `roles`
    ADD `id` char(36);
--> statement-breakpoint
ALTER TABLE `user_roles`
    ADD `role_id` char(36);
--> statement-breakpoint
-- Feste IDs für die festen Rollen (siehe shared/role.ts), alle anderen bekommen eine neue UUID
UPDATE `roles`
SET `id` = CASE `name`
               WHEN 'Administrator' THEN 'c8d47966-f04b-4e73-a752-b48266371049'
               WHEN 'User' THEN '65c4543a-6a98-44c6-b953-6329d1688bd0'
               ELSE UUID() END;
--> statement-breakpoint
UPDATE `user_roles` ur JOIN `roles` r ON r.`name` = ur.`role`
SET ur.`role_id` = r.`id`;
--> statement-breakpoint
UPDATE `endpoint_roles` er JOIN `roles` r ON r.`name` = er.`role`
SET er.`role_id` = r.`id`;
