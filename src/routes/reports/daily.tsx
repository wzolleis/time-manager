import {createFileRoute} from "@tanstack/react-router";
import {ReportDailyPage} from "@features/reports/pages/report-daily-page.tsx";

export const Route = createFileRoute("/reports/daily")({
    component: ReportDailyPage,
});
