import {Link, useParams} from "@tanstack/react-router";
import {isValidDay} from "@shared/day-range";
import {localDay} from "@shared/time-rules";
import {ReportDailyEdit} from "@features/reports/components/report-daily-edit";
import {ErrorText} from "@/components/text/error-text";
import {PageHeader} from "@/components/page/page-header";
import {Page} from "@/components/page/page";

/** Der Tag kommt aus der Adresse (/user/reports/daily/$day), ohne Angabe der heutige */
export const ReportDailyPage = () => {
    const {day} = useParams({strict: false});

    if (day !== undefined && !isValidDay(day)) {
        return (
            <Page>
                <PageHeader title="Heute" />
                <ErrorText>„{day}“ ist kein gültiger Tag (JJJJ-MM-TT).</ErrorText>
                <Link to="/user/reports/daily" className="text-sm underline">
                    Zum heutigen Tag
                </Link>
            </Page>
        );
    }

    return (
        <Page>
            <ReportDailyEdit day={day ?? localDay(new Date())} />
        </Page>
    );
};
