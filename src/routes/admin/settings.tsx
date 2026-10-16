import {createFileRoute} from '@tanstack/react-router'
import {SettingsDashboard} from "@features/settings/pages/settings-dashboard.tsx";

export const Route = createFileRoute('/admin/settings')({
    component: SettingsDashboard,
})

