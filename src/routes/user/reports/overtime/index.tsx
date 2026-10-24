import {createFileRoute} from "@tanstack/react-router";
import {ReportOvertimePage} from "@features/reports/components/report-overtime-page";

export const Route = createFileRoute("/user/reports/overtime/")({
    component: ReportOvertimePage,
});
