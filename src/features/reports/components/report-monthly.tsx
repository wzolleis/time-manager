import {useNavigate} from "@tanstack/react-router";
import {TextLink} from "@/components/text/text-link";
import type {Day, Month} from "@shared/date-schemas";
import {DataTable, type DataTableColumnDef} from "@/components/table/data-table";
import {useTimeFormat} from "@/lib/use-time-format";
import {formatDayMonth, formatMonth, type TimeFormat} from "@shared/format";
import {localDayRange} from "@shared/day-range";
import type {MonthWeekTotals} from "@shared/time-report";
import {addMonths, isoWeekId} from "@shared/week";
import {useShowMonthlyReport} from "@features/reports/use-cases/use-show-monthly-report";
import {Muted} from "@/components/text/muted";
import {Loading} from "@/components/text/loading";
import {LoadError} from "@/components/text/load-error";
import {PageHeader} from "@/components/page/page-header";
import {PeriodNav} from "@/components/buttons/period-nav";
import {periodColumns} from "@features/reports/components/report-columns";
import {PeriodMetrics} from "@features/reports/components/report-metrics";

const dayLabel = (day: Day) => formatDayMonth(localDayRange(day).start);

const columnsOf = (format: TimeFormat): DataTableColumnDef<MonthWeekTotals>[] => {
    const sums = periodColumns<MonthWeekTotals>(format);
    return [
        {
            id: "week",
            header: "Woche",
            enableSorting: false,
            cell: ({row}) => {
                const {year, week, days} = row.original;
                return (
                    <TextLink to="/user/reports/weekly/$week" params={{week: isoWeekId(days[0])}}>
                        KW {week}/{year} ({dayLabel(days[0])}–{dayLabel(days[days.length - 1])})
                    </TextLink>
                );
            },
        },
        sums.target,
        sums.work,
        sums.diff,
    ];
};

// Außerhalb der Komponente, damit die Spalten stabil bleiben
const columns = {minutes: columnsOf("minutes"), industrial: columnsOf("industrial")};

/** month ist ein gültiger Monat "JJJJ-MM", geprüft in ReportMonthlyPage */
export function ReportMonthly({month}: {month: Month}) {
    const navigate = useNavigate();
    const report = useShowMonthlyReport(month);
    const timeFormat = useTimeFormat();
    const {currentUser, totals, futureMonth, partial} = report;

    if (!currentUser) {
        return <Muted>Bitte zuerst einen User anlegen und auswählen.</Muted>;
    }

    // Blättern ändert die Adresse, der Zurück-Button des Browsers springt dann zum vorherigen Monat
    const setMonth = (target: string) => navigate({to: "/user/reports/monthly/$month", params: {month: target}});

    return (
        <>
            <PageHeader
                title="Monatsbericht"
                description={
                    <>
                        {currentUser.name} · {formatMonth(month)}
                    </>
                }
            />

            <PeriodNav
                unit="month"
                onPrevious={() => setMonth(addMonths(month, -1))}
                onNext={() => setMonth(addMonths(month, 1))}
                onCurrent={() => setMonth(report.currentMonth)}
                currentDisabled={month === report.currentMonth}
            />

            <PeriodMetrics targetMs={totals.targetMonthMs} totals={totals} future={futureMonth} partial={partial} />

            {report.isPending && <Loading />}
            {report.error && <LoadError error={report.error} onRetry={report.retry} />}
            {!report.isPending && !report.error && <DataTable columns={columns[timeFormat]} data={totals.weeks} />}
        </>
    );
}
