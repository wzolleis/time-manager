import { createFileRoute } from '@tanstack/react-router'
import {TimeManagementHome} from "@features/time-management/pages/time-management-home.tsx";

export const Route = createFileRoute('/time-management/')({
    component: TimeManagementHome,
})
