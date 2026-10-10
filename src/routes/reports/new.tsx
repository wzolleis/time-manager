import {createFileRoute} from '@tanstack/react-router'
import TimeReportNew from "@features/reports/pages/new.tsx";

export const Route = createFileRoute('/reports/new')({
    component: TimeReportNew,
})
