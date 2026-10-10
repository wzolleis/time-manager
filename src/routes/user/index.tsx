import {createFileRoute} from '@tanstack/react-router'
import {UserDashboard} from "@user/user-dashboard.tsx";

export const Route = createFileRoute('/user/')({
    component: UserDashboard,
})
