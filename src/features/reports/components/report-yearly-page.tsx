import {Link, useParams} from "@tanstack/react-router";
import {localDay} from "@shared/time-rules";
import {isValidYear} from "@shared/week";
import {ReportYearly} from "@features/reports/components/report-yearly";
import {ErrorText} from "@/components/text/error-text";

/** Das Jahr kommt aus der Adresse (/user/reports/yearly/$year), ohne Angabe das laufende Jahr */
export const ReportYearlyPage = () => {
    const {year} = useParams({strict: false});

    if (year !== undefined && !isValidYear(year)) {
        return (
            <div className="space-y-2 p-4">
                <h1 className="text-2xl font-semibold">Jahresbericht</h1>
                <ErrorText>„{year}“ ist kein gültiges Jahr (JJJJ, ab 1970).</ErrorText>
                <Link to="/user/reports/yearly" className="text-sm underline">
                    Zum laufenden Jahr
                </Link>
            </div>
        );
    }

    return (
        <div className="p-4">
            <ReportYearly year={year ?? localDay(new Date()).slice(0, 4)} />
        </div>
    );
};
