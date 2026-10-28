import {Link, useNavigate} from "@tanstack/react-router";
import {MetricCard} from "@/components/cards/metric-card";
import {DataTable, type DataTableColumnDef} from "@/components/table/data-table";
import {diffClass} from "@/lib/format";
import {formatDayMonth, formatDifference, formatDuration, formatMonth} from "@shared/format";
import {localDayRange} from "@shared/day-range";
import type {MonthWeekTotals} from "@shared/time-report";
import {addMonths, isoWeekId} from "@shared/week";
import {useShowMonthlyReport} from "@features/reports/use-cases/use-show-monthly-report";
import {Muted} from "@/components/text/muted";
import {Loading} from "@/components/text/loading";
import {LoadError} from "@/components/text/load-error";
import {PageHeader} from "@/components/page/page-header";
import {PeriodNav} from "@/components/buttons/period-nav";

const dash = "–";

const dayLabel = (day: string) => formatDayMonth(localDayRange(day).start);

// Außerhalb der Komponente, damit die Spalten stabil bleiben
const columns: DataTableColumnDef<MonthWeekTotals>[] = [
    {
        id: "week",
        header: "Woche",
        enableSorting: false,
        cell: ({row}) => {
            const {year, week, days} = row.original;
            return (
                <Link to="/user/reports/weekly/$week" params={{week: isoWeekId(days[0])}} className="underline">
                    KW {week}/{year} ({dayLabel(days[0])}–{dayLabel(days[days.length - 1])})
                </Link>
            );
        },
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

/** month ist ein gültiger Monat "JJJJ-MM", geprüft in ReportMonthlyPage */
export function ReportMonthly({month}: {month: string}) {
    const navigate = useNavigate();
    const report = useShowMonthlyReport(month);
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

            <div className="grid gap-4 sm:grid-cols-3">
                <MetricCard
                    title="Soll"
                    value={formatDuration(totals.targetMonthMs)}
                    hint={partial && !futureMonth ? `bis heute: ${formatDuration(totals.targetToDateMs)}` : undefined}
                />
                <MetricCard
                    title="Arbeitszeit"
                    value={formatDuration(totals.workMs)}
                    hint={totals.running ? "läuft noch" : undefined}
                />
                <MetricCard
                    title="Differenz"
                    value={futureMonth ? dash : formatDifference(totals.diffMs)}
                    valueClassName={futureMonth ? undefined : diffClass(totals.diffMs)}
                    hint={partial && !futureMonth ? "gegen das Soll bis heute" : undefined}
                />
            </div>

            {report.isPending && <Loading />}
            {report.error && <LoadError error={report.error} onRetry={report.retry} />}
            {!report.isPending && !report.error && <DataTable columns={columns} data={totals.weeks} />}
        </>
    );
}
