import {createFileRoute} from "@tanstack/react-router";
import {ReportWeeklyPage} from "@features/reports/components/report-weekly-page";

export const Route = createFileRoute("/user/reports/weekly/$week")({
    component: ReportWeeklyPage,
});
