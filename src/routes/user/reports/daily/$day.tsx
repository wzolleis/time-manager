import {createFileRoute} from "@tanstack/react-router";
import {ReportDailyPage} from "@features/reports/components/report-daily-page";

export const Route = createFileRoute("/user/reports/daily/$day")({
    component: ReportDailyPage,
});
