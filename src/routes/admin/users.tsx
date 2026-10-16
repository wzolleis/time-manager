import {createFileRoute} from '@tanstack/react-router'
import {Users} from "@features/users/pages/users";

export const Route = createFileRoute('/admin/users')({
    component: Users,
})

