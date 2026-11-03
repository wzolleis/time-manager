import {useParams} from "@tanstack/react-router";
import {localDay} from "@shared/time-rules";
import {isValidMonth, monthOf} from "@shared/week";
import {ReportMonthly} from "@features/reports/components/report-monthly";
import {ReportInvalidPeriod} from "@features/reports/components/report-invalid-period";
import {Page} from "@/components/page/page";

/** Der Monat kommt aus der Adresse (/user/reports/monthly/$month), ohne Angabe der aktuelle */
export const ReportMonthlyPage = () => {
    const {month} = useParams({strict: false});

    if (month !== undefined && !isValidMonth(month)) {
        return (
            <ReportInvalidPeriod
                title="Monatsbericht"
                message={<>„{month}“ ist kein gültiger Monat (JJJJ-MM).</>}
                to="/user/reports/monthly"
                linkLabel="Zum aktuellen Monat"
            />
        );
    }

    return (
        <Page>
            <ReportMonthly month={month ?? monthOf(localDay(new Date()))} />
        </Page>
    );
};
