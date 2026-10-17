import {createFileRoute} from "@tanstack/react-router";
import {ReportSickLeavesPage} from "@features/reports/components/report-sick-leaves-page";

export const Route = createFileRoute("/user/reports/sick-leaves")({
    component: ReportSickLeavesPage,
});
