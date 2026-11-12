-- Die Einstellung heißt wie in features/changes/user-setting-action-bar.md „Action Bar“, die Oberfläche zeigt den
-- Namen so an wie „Soll“ und „Urlaubstage“. Die ID steht in shared/user-setting.ts.
UPDATE `user_settings` SET `name` = 'Action Bar' WHERE `id` = 'e2e48edb-c612-466e-a886-03c72466e4f3';
