-- Custom SQL migration file, put your code below! --
UPDATE `users`
SET `avatar_url` = NULL
WHERE `avatar_url` = '';