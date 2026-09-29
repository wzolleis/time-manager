CREATE TABLE `users`
(
    `id`         char(36)      NOT NULL,
    `name`       varchar(100)  NOT NULL,
    `email`      varchar(191)  NOT NULL,
    `avatar_url` varchar(2048) NOT NULL DEFAULT '',
    CONSTRAINT `users_id` PRIMARY KEY (`id`),
    CONSTRAINT `users_email_unique` UNIQUE (`email`)
);
