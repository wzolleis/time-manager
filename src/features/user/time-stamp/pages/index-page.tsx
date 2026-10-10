import {StampCard} from "@user/time-stamp/components/stamp-card.tsx";
import {ReportDailyEdit} from "@user/reports/components/report-daily-edit.tsx";

export const IndexPage = () => {
    return (
        <div className="space-y-4 p-4">
            <h1 className="text-2xl font-semibold">Zeiterfassung</h1>
            <StampCard/>
            <ReportDailyEdit/>
        </div>
    );
}
