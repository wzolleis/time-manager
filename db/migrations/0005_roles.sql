CREATE TABLE `endpoint_roles`
(
    `path`   varchar(191)                               NOT NULL,
    `method` enum ('GET','POST','PUT','PATCH','DELETE') NOT NULL,
    `role`   varchar(50)                                NOT NULL,
    CONSTRAINT `endpoint_roles_path_method_pk` PRIMARY KEY (`path`, `method`)
);
--> statement-breakpoint
CREATE TABLE `roles`
(
    `name` varchar(50) NOT NULL,
    CONSTRAINT `roles_name` PRIMARY KEY (`name`)
);
--> statement-breakpoint
CREATE TABLE `user_roles`
(
    `user_id` char(36)    NOT NULL,
    `role`    varchar(50) NOT NULL,
    CONSTRAINT `user_roles_user_id_role_pk` PRIMARY KEY (`user_id`, `role`)
);
--> statement-breakpoint
ALTER TABLE `endpoint_roles`
    ADD CONSTRAINT `endpoint_roles_role_roles_name_fk` FOREIGN KEY (`role`) REFERENCES `roles` (`name`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `user_roles`
    ADD CONSTRAINT `user_roles_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `user_roles`
    ADD CONSTRAINT `user_roles_role_roles_name_fk` FOREIGN KEY (`role`) REFERENCES `roles` (`name`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX `idx_user_roles_role` ON `user_roles` (`role`);