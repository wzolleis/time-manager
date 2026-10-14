import {createFileRoute} from '@tanstack/react-router'
import {ReportVacationsPage} from "@user/reports/pages/report-vacations-page.tsx";

export const Route = createFileRoute('/user/reports/vacations')({
    component: ReportVacationsPage,
})

