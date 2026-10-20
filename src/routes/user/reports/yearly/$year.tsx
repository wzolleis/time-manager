import {createFileRoute} from "@tanstack/react-router";
import {ReportYearlyPage} from "@features/reports/components/report-yearly-page";

export const Route = createFileRoute("/user/reports/yearly/$year")({
    component: ReportYearlyPage,
});
