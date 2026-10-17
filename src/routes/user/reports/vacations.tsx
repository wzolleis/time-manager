import {createFileRoute} from "@tanstack/react-router";
import {ReportVacationsPage} from "@features/reports/components/report-vacations-page";

export const Route = createFileRoute("/user/reports/vacations")({
    component: ReportVacationsPage,
});
