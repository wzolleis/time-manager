import {createFileRoute} from '@tanstack/react-router'
import {IndexPage} from "@features/time-stamp/pages/index-page";

export const Route = createFileRoute('/user/time-stamp/')({
    component: IndexPage,
})


