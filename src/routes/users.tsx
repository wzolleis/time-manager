import {createFileRoute} from '@tanstack/react-router'
import {Users} from "@features/users/pages/users.tsx";

export const Route = createFileRoute('/users')({
    component: Users,
})

