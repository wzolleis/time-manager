import {Link, useParams} from "@tanstack/react-router";
import {localDay} from "@shared/time-rules";
import {isValidYear} from "@shared/week";
import {ReportYearly} from "@features/reports/components/report-yearly";
import {ErrorText} from "@/components/text/error-text";
import {PageHeader} from "@/components/page/page-header";
import {Page} from "@/components/page/page";

/** Das Jahr kommt aus der Adresse (/user/reports/yearly/$year), ohne Angabe das laufende Jahr */
export const ReportYearlyPage = () => {
    const {year} = useParams({strict: false});

    if (year !== undefined && !isValidYear(year)) {
        return (
            <Page>
                <PageHeader title="Jahresbericht" />
                <ErrorText>„{year}“ ist kein gültiges Jahr (JJJJ, ab 1970).</ErrorText>
                <Link to="/user/reports/yearly" className="text-sm underline">
                    Zum laufenden Jahr
                </Link>
            </Page>
        );
    }

    return (
        <Page>
            <ReportYearly year={year ?? localDay(new Date()).slice(0, 4)} />
        </Page>
    );
};
