import {createFileRoute} from '@tanstack/react-router'
import {TimeReports} from "@features/time/pages/reports.tsx";

export const Route = createFileRoute('/time-report/reports')({
    component: TimeReports,
})

