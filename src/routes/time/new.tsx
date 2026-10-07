import {createFileRoute} from '@tanstack/react-router'
import TimeNew from "@features/time/pages/new.tsx";

export const Route = createFileRoute('/time/new')({
    component: TimeNew,
})
