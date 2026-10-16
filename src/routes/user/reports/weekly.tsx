import {createFileRoute} from '@tanstack/react-router'
import {ReportWeeklyPage} from "@features/reports/pages/report-weekly-page.tsx";

export const Route = createFileRoute('/user/reports/weekly')({
    component: ReportWeeklyPage,
})