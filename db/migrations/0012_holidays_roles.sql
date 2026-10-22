-- Globale Feiertage anlegen, ändern und löschen darf nur ein Administrator (Skill authorization).
-- Eigene Feiertage liegen unter /api/users/:userId/holidays, haben keinen Eintrag und gelten damit für die
-- Rolle "User"; dort prüft ensureAccess, wessen Daten es sind.
INSERT INTO `endpoint_roles` (`path`, `method`, `role_id`)
SELECT '/api/holidays', 'POST', `id`
FROM `roles`
WHERE `name` = 'Administrator';
--> statement-breakpoint
INSERT INTO `endpoint_roles` (`path`, `method`, `role_id`)
SELECT '/api/holidays/:id', 'PATCH', `id`
FROM `roles`
WHERE `name` = 'Administrator';
--> statement-breakpoint
INSERT INTO `endpoint_roles` (`path`, `method`, `role_id`)
SELECT '/api/holidays/:id', 'DELETE', `id`
FROM `roles`
WHERE `name` = 'Administrator';
