-- Agent-Tokens aller User sehen und widerrufen darf nur ein Administrator (Skill authorization).
-- /api/api-tokens hat keinen Eintrag und gilt damit für die Rolle "User".
INSERT INTO `endpoint_roles` (`path`, `method`, `role_id`)
SELECT '/api/admin/api-tokens', 'GET', `id`
FROM `roles`
WHERE `name` = 'Administrator';
--> statement-breakpoint
INSERT INTO `endpoint_roles` (`path`, `method`, `role_id`)
SELECT '/api/admin/api-tokens/:id', 'DELETE', `id`
FROM `roles`
WHERE `name` = 'Administrator';
