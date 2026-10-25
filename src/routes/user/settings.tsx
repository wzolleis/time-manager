import {createFileRoute} from "@tanstack/react-router";
import {UserSettingsPage} from "@features/user-settings/components/user-settings-page";

export const Route = createFileRoute("/user/settings")({
    component: UserSettingsPage,
});
