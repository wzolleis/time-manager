import {createFileRoute} from '@tanstack/react-router'
import {IndexPage} from "@features/time-report/pages/index-page.tsx";

export const Route = createFileRoute('/time-report/')({
    component: IndexPage,
})
