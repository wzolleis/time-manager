-- Das Datenbank-Backup darf nur ein Administrator sehen, starten und herunterladen
-- (features/use-case/database-backup.md, Skill authorization).
INSERT INTO `endpoint_roles` (`path`, `method`, `role_id`)
SELECT '/api/backups', 'GET', `id`
FROM `roles`
WHERE `name` = 'Administrator';
--> statement-breakpoint
INSERT INTO `endpoint_roles` (`path`, `method`, `role_id`)
SELECT '/api/backups', 'POST', `id`
FROM `roles`
WHERE `name` = 'Administrator';
--> statement-breakpoint
INSERT INTO `endpoint_roles` (`path`, `method`, `role_id`)
SELECT '/api/backups/:id/file', 'GET', `id`
FROM `roles`
WHERE `name` = 'Administrator';
--> statement-breakpoint
INSERT INTO `endpoint_roles` (`path`, `method`, `role_id`)
SELECT '/api/backups/:id/copied', 'POST', `id`
FROM `roles`
WHERE `name` = 'Administrator';
