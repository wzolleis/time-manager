import {createFileRoute} from '@tanstack/react-router'
import {ReportWeeklyPage} from "@user/reports/pages/report-weekly-page.tsx";

export const Route = createFileRoute('/user/reports/weekly')({
    component: ReportWeeklyPage,
})