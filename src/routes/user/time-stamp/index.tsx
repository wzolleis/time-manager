import {createFileRoute} from '@tanstack/react-router'
import {IndexPage} from "@features/user/time-stamp/pages/index-page.tsx";

export const Route = createFileRoute('/user/time-stamp/')({
    component: IndexPage,
})


