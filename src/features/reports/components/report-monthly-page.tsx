import {Link, useParams} from "@tanstack/react-router";
import {localDay} from "@shared/time-rules";
import {isValidMonth, monthOf} from "@shared/week";
import {ReportMonthly} from "@features/reports/components/report-monthly";
import {ErrorText} from "@/components/text/error-text";
import {PageHeader} from "@/components/page/page-header";
import {Page} from "@/components/page/page";

/** Der Monat kommt aus der Adresse (/user/reports/monthly/$month), ohne Angabe der aktuelle */
export const ReportMonthlyPage = () => {
    const {month} = useParams({strict: false});

    if (month !== undefined && !isValidMonth(month)) {
        return (
            <Page>
                <PageHeader title="Monatsbericht" />
                <ErrorText>„{month}“ ist kein gültiger Monat (JJJJ-MM).</ErrorText>
                <Link to="/user/reports/monthly" className="text-sm underline">
                    Zum aktuellen Monat
                </Link>
            </Page>
        );
    }

    return (
        <Page>
            <ReportMonthly month={month ?? monthOf(localDay(new Date()))} />
        </Page>
    );
};
