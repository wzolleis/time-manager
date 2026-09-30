import {createFileRoute} from '@tanstack/react-router'
import {UsersPage} from "@features/users/pages/users-page.tsx";

export const Route = createFileRoute('/users')({
    component: UsersPage,
})

