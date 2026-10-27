import {Link, useParams} from "@tanstack/react-router";
import {localDay} from "@shared/time-rules";
import {isValidMonth, monthOf} from "@shared/week";
import {ReportMonthly} from "@features/reports/components/report-monthly";
import {ErrorText} from "@/components/text/error-text";

/** Der Monat kommt aus der Adresse (/user/reports/monthly/$month), ohne Angabe der aktuelle */
export const ReportMonthlyPage = () => {
    const {month} = useParams({strict: false});

    if (month !== undefined && !isValidMonth(month)) {
        return (
            <div className="space-y-2 p-4">
                <h1 className="text-2xl font-semibold">Monatsbericht</h1>
                <ErrorText>„{month}“ ist kein gültiger Monat (JJJJ-MM).</ErrorText>
                <Link to="/user/reports/monthly" className="text-sm underline">
                    Zum aktuellen Monat
                </Link>
            </div>
        );
    }

    return (
        <div className="p-4">
            <ReportMonthly month={month ?? monthOf(localDay(new Date()))} />
        </div>
    );
};
