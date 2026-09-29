import {createFileRoute} from '@tanstack/react-router'
import {UsersHome} from "@features/users/UsersHome.tsx";

export const Route = createFileRoute('/users')({
    component: UsersHome,
})

