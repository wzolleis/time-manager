import { createFileRoute } from '@tanstack/react-router'
import {Dashboard} from "@features/dashboard/pages/dashboard";

export const Route = createFileRoute('/dashboard')({
    component: Dashboard,
})


