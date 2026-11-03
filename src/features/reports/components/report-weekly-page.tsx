import {useParams} from "@tanstack/react-router";
import {localDay} from "@shared/time-rules";
import {parseIsoWeek} from "@shared/week";
import {ReportWeekly} from "@features/reports/components/report-weekly";
import {ReportInvalidPeriod} from "@features/reports/components/report-invalid-period";
import {Page} from "@/components/page/page";

/** Die Woche kommt aus der Adresse (/user/reports/weekly/$week, z. B. 2026-W43), ohne Angabe die aktuelle */
export const ReportWeeklyPage = () => {
    const {week} = useParams({strict: false});
    const monday = week === undefined ? null : parseIsoWeek(week);

    if (week !== undefined && monday === null) {
        return (
            <ReportInvalidPeriod
                title="Wochenbericht"
                message={<>„{week}“ ist keine gültige Woche (JJJJ-Www, z. B. 2026-W43).</>}
                to="/user/reports/weekly"
                linkLabel="Zur aktuellen Woche"
            />
        );
    }

    return (
        <Page>
            <ReportWeekly anchor={monday ?? localDay(new Date())} />
        </Page>
    );
};
