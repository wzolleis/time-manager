import {createFileRoute} from "@tanstack/react-router";
import {ReportDailyPage} from "@features/user/reports/pages/report-daily-page.tsx";

export const Route = createFileRoute("/user/reports/daily")({
    component: ReportDailyPage,
});
