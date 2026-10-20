import {Link, useParams} from "@tanstack/react-router";
import {localDay} from "@shared/time-rules";
import {isValidYear} from "@shared/week";
import {ReportYearly} from "@features/reports/components/report-yearly";

/** Das Jahr kommt aus der Adresse (/user/reports/yearly/$year), ohne Angabe das laufende Jahr */
export const ReportYearlyPage = () => {
    const {year} = useParams({strict: false});

    if (year !== undefined && !isValidYear(year)) {
        return (
            <div className="space-y-2 p-4">
                <h1 className="text-2xl font-semibold">Jahresbericht</h1>
                <p role="alert" className="text-sm text-destructive">
                    „{year}“ ist kein gültiges Jahr (JJJJ, ab 1970).
                </p>
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
