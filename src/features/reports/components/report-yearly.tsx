import {useNavigate} from "@tanstack/react-router";
import {TextLink} from "@/components/text/text-link";
import type {Year} from "@shared/date-schemas";
import {DataTable, type DataTableColumnDef} from "@/components/table/data-table";
import {useTimeFormat} from "@/lib/use-time-format";
import {formatMonthName, type TimeFormat} from "@shared/format";
import type {YearMonthTotals} from "@shared/time-report";
import {useShowYearlyReport} from "@features/reports/use-cases/use-show-yearly-report";
import {Muted} from "@/components/text/muted";
import {Loading} from "@/components/text/loading";
import {LoadError} from "@/components/text/load-error";
import {PageHeader} from "@/components/page/page-header";
import {PeriodNav} from "@/components/buttons/period-nav";
import {periodColumns} from "@features/reports/components/report-columns";
import {PeriodMetrics} from "@features/reports/components/report-metrics";

const columnsOf = (format: TimeFormat): DataTableColumnDef<YearMonthTotals>[] => {
    const sums = periodColumns<YearMonthTotals>(format);
    return [
        {
            id: "month",
            header: "Monat",
            enableSorting: false,
            cell: ({row}) => (
                <TextLink to="/user/reports/monthly/$month" params={{month: row.original.month}}>
                    {formatMonthName(row.original.month)}
                </TextLink>
            ),
        },
        sums.target,
        sums.work,
        sums.diff,
    ];
};

// Außerhalb der Komponente, damit die Spalten stabil bleiben
const columns = {minutes: columnsOf("minutes"), industrial: columnsOf("industrial")};

/** year ist ein gültiges Jahr "JJJJ", geprüft in ReportYearlyPage */
export function ReportYearly({year}: {year: Year}) {
    const navigate = useNavigate();
    const report = useShowYearlyReport(year);
    const timeFormat = useTimeFormat();
    const {currentUser, totals, futureYear, partial, firstYear} = report;

    if (!currentUser) {
        return <Muted>Bitte zuerst einen User anlegen und auswählen.</Muted>;
    }

    const goTo = (target: string) => navigate({to: "/user/reports/yearly/$year", params: {year: target}});
    const beforeStart = !report.isPending && year < firstYear;

    return (
        <>
            <PageHeader
                title="Jahresbericht"
                description={
                    <>
                        {currentUser.name} · {year}
                    </>
                }
            />

            <PeriodNav
                unit="year"
                onPrevious={() => goTo(String(Number(year) - 1))}
                onNext={() => goTo(String(Number(year) + 1))}
                onCurrent={() => goTo(report.currentYear)}
                previousDisabled={year <= firstYear}
                currentDisabled={year === report.currentYear}
            />

            {beforeStart ? (
                <Muted>
                    Die Zeiterfassung beginnt {firstYear}.{" "}
                    <TextLink to="/user/reports/yearly/$year" params={{year: firstYear}}>
                        Jahresbericht {firstYear}
                    </TextLink>
                </Muted>
            ) : (
                <>
                    <PeriodMetrics
                        targetMs={totals.targetYearMs}
                        totals={totals}
                        future={futureYear}
                        partial={partial}
                    />

                    {report.isPending && <Loading />}
                    {report.error && <LoadError error={report.error} onRetry={report.retry} />}
                    {!report.isPending && !report.error && (
                        <DataTable columns={columns[timeFormat]} data={totals.months} />
                    )}
                </>
            )}
        </>
    );
}
