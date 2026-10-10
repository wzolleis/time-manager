import {createFileRoute} from '@tanstack/react-router'
import {SettingsDashboard} from "@features/admin/settings/pages/settings-dashboard.tsx";

export const Route = createFileRoute('/admin/settings')({
    component: SettingsDashboard,
})

