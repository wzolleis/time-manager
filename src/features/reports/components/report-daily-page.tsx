import {Link, useParams} from "@tanstack/react-router";
import {isValidDay} from "@shared/day-range";
import {localDay} from "@shared/time-rules";
import {ReportDailyEdit} from "@features/reports/components/report-daily-edit";
import {ErrorText} from "@/components/text/error-text";

/** Der Tag kommt aus der Adresse (/user/reports/daily/$day), ohne Angabe der heutige */
export const ReportDailyPage = () => {
    const {day} = useParams({strict: false});

    if (day !== undefined && !isValidDay(day)) {
        return (
            <div className="space-y-2 p-4">
                <h1 className="text-2xl font-semibold">Heute</h1>
                <ErrorText>„{day}“ ist kein gültiger Tag (JJJJ-MM-TT).</ErrorText>
                <Link to="/user/reports/daily" className="text-sm underline">
                    Zum heutigen Tag
                </Link>
            </div>
        );
    }

    return (
        <div className="p-4">
            <ReportDailyEdit day={day ?? localDay(new Date())} />
        </div>
    );
};
