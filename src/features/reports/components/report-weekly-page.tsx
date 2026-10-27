import {Link, useParams} from "@tanstack/react-router";
import {localDay} from "@shared/time-rules";
import {parseIsoWeek} from "@shared/week";
import {ReportWeekly} from "@features/reports/components/report-weekly";
import {ErrorText} from "@/components/text/error-text";

/** Die Woche kommt aus der Adresse (/user/reports/weekly/$week, z. B. 2026-W43), ohne Angabe die aktuelle */
export const ReportWeeklyPage = () => {
    const {week} = useParams({strict: false});
    const monday = week === undefined ? null : parseIsoWeek(week);

    if (week !== undefined && monday === null) {
        return (
            <div className="space-y-2 p-4">
                <h1 className="text-2xl font-semibold">Wochenbericht</h1>
                <ErrorText>„{week}“ ist keine gültige Woche (JJJJ-Www, z. B. 2026-W43).</ErrorText>
                <Link to="/user/reports/weekly" className="text-sm underline">
                    Zur aktuellen Woche
                </Link>
            </div>
        );
    }

    return (
        <div className="p-4">
            <ReportWeekly anchor={monday ?? localDay(new Date())} />
        </div>
    );
};
