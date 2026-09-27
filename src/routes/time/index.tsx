import {createFileRoute} from '@tanstack/react-router'
import {Home} from "@features/time/pages/home.tsx";

export const Route = createFileRoute('/time/')({
    component: Home,
})
