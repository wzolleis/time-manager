import {createFileRoute} from '@tanstack/react-router'
import {AdminDashboard} from "@features/admin/pages/admin-dashboard.tsx";

export const Route = createFileRoute('/admin/')({
    component: AdminDashboard,
})
