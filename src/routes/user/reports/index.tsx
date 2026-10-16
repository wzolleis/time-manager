import {createFileRoute} from '@tanstack/react-router'
import {IndexPage} from "@features/reports/pages/index-page.tsx";

export const Route = createFileRoute('/user/reports/')({
    component: IndexPage,
})
