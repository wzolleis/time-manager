import {Link, useParams} from "@tanstack/react-router";
import {localDay} from "@shared/time-rules";
import {parseIsoWeek} from "@shared/week";
import {ReportWeekly} from "@features/reports/components/report-weekly";
import {ErrorText} from "@/components/text/error-text";
import {PageHeader} from "@/components/page/page-header";
import {Page} from "@/components/page/page";

/** Die Woche kommt aus der Adresse (/user/reports/weekly/$week, z. B. 2026-W43), ohne Angabe die aktuelle */
export const ReportWeeklyPage = () => {
    const {week} = useParams({strict: false});
    const monday = week === undefined ? null : parseIsoWeek(week);

    if (week !== undefined && monday === null) {
        return (
            <Page>
                <PageHeader title="Wochenbericht" />
                <ErrorText>„{week}“ ist keine gültige Woche (JJJJ-Www, z. B. 2026-W43).</ErrorText>
                <Link to="/user/reports/weekly" className="text-sm underline">
                    Zur aktuellen Woche
                </Link>
            </Page>
        );
    }

    return (
        <Page>
            <ReportWeekly anchor={monday ?? localDay(new Date())} />
        </Page>
    );
};
