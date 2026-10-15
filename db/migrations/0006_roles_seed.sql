-- Feste Rollen (nicht löschen oder umbenennen, siehe Skill authorization)
INSERT INTO `roles` (`name`)
VALUES ('Administrator'),
       ('User');
--> statement-breakpoint
-- Bestehende User bekommen die Rolle "User", wie jeder neu angelegte. Den ersten Administrator
-- trägt scripts/grant-admin.ts ein.
INSERT INTO `user_roles` (`user_id`, `role`)
SELECT `id`, 'User'
FROM `users`;
--> statement-breakpoint
-- Endpoints, die nur ein Administrator aufrufen darf. Ohne Eintrag gilt die Rolle "User".
INSERT INTO `endpoint_roles` (`path`, `method`, `role`)
VALUES ('/api/auth/reset-password', 'POST', 'Administrator'),
       ('/api/users', 'GET', 'Administrator'),
       ('/api/users', 'POST', 'Administrator'),
       ('/api/users/:id', 'GET', 'Administrator'),
       ('/api/users/:id', 'PATCH', 'Administrator'),
       ('/api/users/:id', 'DELETE', 'Administrator'),
       ('/api/users/:id/roles', 'GET', 'Administrator'),
       ('/api/users/:id/roles', 'PUT', 'Administrator'),
       ('/api/roles', 'GET', 'Administrator'),
       ('/api/db-ping', 'GET', 'Administrator');
