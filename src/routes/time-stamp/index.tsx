import {createFileRoute} from '@tanstack/react-router'
import {IndexPage} from "@features/time-stamp/pages/index-page.tsx";

export const Route = createFileRoute('/time-stamp/')({
    component: IndexPage,
})


