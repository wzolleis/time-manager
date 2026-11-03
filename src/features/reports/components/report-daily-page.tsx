import {useParams} from "@tanstack/react-router";
import {isValidDay} from "@shared/day-range";
import {localDay} from "@shared/time-rules";
import {ReportDailyEdit} from "@features/reports/components/report-daily-edit";
import {ReportInvalidPeriod} from "@features/reports/components/report-invalid-period";
import {Page} from "@/components/page/page";

/** Der Tag kommt aus der Adresse (/user/reports/daily/$day), ohne Angabe der heutige */
export const ReportDailyPage = () => {
    const {day} = useParams({strict: false});

    if (day !== undefined && !isValidDay(day)) {
        return (
            <ReportInvalidPeriod
                title="Heute"
                message={<>„{day}“ ist kein gültiger Tag (JJJJ-MM-TT).</>}
                to="/user/reports/daily"
                linkLabel="Zum heutigen Tag"
            />
        );
    }

    return (
        <Page>
            <ReportDailyEdit day={day ?? localDay(new Date())} />
        </Page>
    );
};
