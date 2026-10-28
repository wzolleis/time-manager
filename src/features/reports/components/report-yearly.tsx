import {Link, useNavigate} from "@tanstack/react-router";
import {MetricCard} from "@/components/cards/metric-card";
import {DataTable, type DataTableColumnDef} from "@/components/table/data-table";
import {diffClass} from "@/lib/format";
import {formatDifference, formatDuration, formatMonthName} from "@shared/format";
import type {YearMonthTotals} from "@shared/time-report";
import {useShowYearlyReport} from "@features/reports/use-cases/use-show-yearly-report";
import {Muted} from "@/components/text/muted";
import {Loading} from "@/components/text/loading";
import {LoadError} from "@/components/text/load-error";
import {PageHeader} from "@/components/page/page-header";
import {PeriodNav} from "@/components/buttons/period-nav";

const dash = "–";

// Außerhalb der Komponente, damit die Spalten stabil bleiben
const columns: DataTableColumnDef<YearMonthTotals>[] = [
    {
        id: "month",
        header: "Monat",
        enableSorting: false,
        cell: ({row}) => (
            <Link to="/user/reports/monthly/$month" params={{month: row.original.month}} className="underline">
                {formatMonthName(row.original.month)}
            </Link>
        ),
    },
    {
        accessorKey: "targetMs",
        header: "Soll",
        enableSorting: false,
        cell: ({row}) => (row.original.targetMs > 0 ? formatDuration(row.original.targetMs) : dash),
    },
    {
        accessorKey: "workMs",
        header: "Arbeitszeit",
        enableSorting: false,
        cell: ({row}) => (row.original.workMs > 0 ? formatDuration(row.original.workMs) : dash),
    },
    {
        accessorKey: "diffMs",
        header: "Differenz",
        enableSorting: false,
        cell: ({row}) => {
            const diff = row.original.diffMs;
            return diff === null ? dash : <span className={diffClass(diff)}>{formatDifference(diff)}</span>;
        },
    },
];

/** year ist ein gültiges Jahr "JJJJ", geprüft in ReportYearlyPage */
export function ReportYearly({year}: {year: string}) {
    const navigate = useNavigate();
    const report = useShowYearlyReport(year);
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
                    <Link to="/user/reports/yearly/$year" params={{year: firstYear}} className="underline">
                        Jahresbericht {firstYear}
                    </Link>
                </Muted>
            ) : (
                <>
                    <div className="grid gap-4 sm:grid-cols-3">
                        <MetricCard
                            title="Soll"
                            value={formatDuration(totals.targetYearMs)}
                            hint={
                                partial && !futureYear
                                    ? `bis heute: ${formatDuration(totals.targetToDateMs)}`
                                    : undefined
                            }
                        />
                        <MetricCard
                            title="Arbeitszeit"
                            value={formatDuration(totals.workMs)}
                            hint={totals.running ? "läuft noch" : undefined}
                        />
                        <MetricCard
                            title="Differenz"
                            value={futureYear ? dash : formatDifference(totals.diffMs)}
                            valueClassName={futureYear ? undefined : diffClass(totals.diffMs)}
                            hint={partial && !futureYear ? "gegen das Soll bis heute" : undefined}
                        />
                    </div>

                    {report.isPending && <Loading />}
                    {report.error && <LoadError error={report.error} onRetry={report.retry} />}
                    {!report.isPending && !report.error && <DataTable columns={columns} data={totals.months} />}
                </>
            )}
        </>
    );
}
