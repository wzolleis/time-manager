import {createFileRoute} from '@tanstack/react-router'
import {IndexPage} from "@features/user/reports/pages/index-page.tsx";

export const Route = createFileRoute('/user/reports/')({
    component: IndexPage,
})
