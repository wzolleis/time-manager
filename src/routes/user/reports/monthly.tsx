import {createFileRoute} from "@tanstack/react-router";
import {ReportMonthlyPage} from "@features/reports/components/report-monthly-page";

export const Route = createFileRoute("/user/reports/monthly")({
    component: ReportMonthlyPage,
});
