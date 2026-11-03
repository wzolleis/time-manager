import {useParams} from "@tanstack/react-router";
import {localDay} from "@shared/time-rules";
import {isValidYear, yearOf} from "@shared/week";
import {ReportYearly} from "@features/reports/components/report-yearly";
import {ReportInvalidPeriod} from "@features/reports/components/report-invalid-period";
import {Page} from "@/components/page/page";

/** Das Jahr kommt aus der Adresse (/user/reports/yearly/$year), ohne Angabe das laufende Jahr */
export const ReportYearlyPage = () => {
    const {year} = useParams({strict: false});

    if (year !== undefined && !isValidYear(year)) {
        return (
            <ReportInvalidPeriod
                title="Jahresbericht"
                message={<>„{year}“ ist kein gültiges Jahr (JJJJ, ab 1970).</>}
                to="/user/reports/yearly"
                linkLabel="Zum laufenden Jahr"
            />
        );
    }

    return (
        <Page>
            <ReportYearly year={year ?? yearOf(localDay(new Date()))} />
        </Page>
    );
};
