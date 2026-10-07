import {createFileRoute} from '@tanstack/react-router'
import TimeReportNew from "@features/time-report/pages/new.tsx";

export const Route = createFileRoute('/time-report/new')({
    component: TimeReportNew,
})
