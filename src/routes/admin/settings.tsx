import {createFileRoute} from "@tanstack/react-router";
import {SettingsDashboard} from "@features/settings/components/settings-dashboard-page";

export const Route = createFileRoute("/admin/settings")({
    component: SettingsDashboard,
});
