import {createFileRoute} from '@tanstack/react-router'
import {ReportVacationsPage} from "@features/reports/pages/report-vacations-page";

export const Route = createFileRoute('/user/reports/vacations')({
    component: ReportVacationsPage,
})

