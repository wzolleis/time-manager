import {useState} from "react";
import {Button} from "@/components/ui/button";
import {Summary} from "@/components/summary";
import {DataTable, type DataTableColumnDef} from "@/components/table/data-table";
import {diffClass, formatDayMonth, formatDifference, formatDuration, formatMonth} from "@/lib/format";
import {localDayRange} from "@shared/day-range";
import type {MonthWeekTotals} from "@shared/time-report";
import {localDay} from "@shared/time-rules";
import {addMonths, monthOf} from "@shared/week";
import {ReportError} from "@features/reports/components/report-error";
import {useShowMonthlyReport} from "@features/reports/use-cases/use-show-monthly-report";

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
            return `KW ${week}/${year} (${dayLabel(days[0])}–${dayLabel(days[days.length - 1])})`;
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

export function ReportMonthly() {
    const [month, setMonth] = useState(() => monthOf(localDay(new Date())));
    const report = useShowMonthlyReport(month);
    const {currentUser, totals, futureMonth, partial} = report;

    if (!currentUser) {
        return <p className="text-sm text-muted-foreground">Bitte zuerst einen User anlegen und auswählen.</p>;
    }

    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-2xl font-semibold">Monatsbericht</h1>
                <p className="text-sm text-muted-foreground">
                    {currentUser.name} · {formatMonth(month)}
                </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    aria-label="Vorheriger Monat"
                    onClick={() => setMonth(addMonths(month, -1))}
                >
                    ←
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    aria-label="Nächster Monat"
                    onClick={() => setMonth(addMonths(month, 1))}
                >
                    →
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    disabled={month === report.currentMonth}
                    onClick={() => setMonth(report.currentMonth)}
                >
                    Dieser Monat
                </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
                <Summary
                    title="Soll"
                    value={formatDuration(totals.targetMonthMs)}
                    hint={partial && !futureMonth ? `bis heute: ${formatDuration(totals.targetToDateMs)}` : undefined}
                />
                <Summary
                    title="Arbeitszeit"
                    value={formatDuration(totals.workMs)}
                    hint={totals.running ? "läuft noch" : undefined}
                />
                <Summary
                    title="Differenz"
                    value={futureMonth ? dash : formatDifference(totals.diffMs)}
                    valueClassName={futureMonth ? undefined : diffClass(totals.diffMs)}
                    hint={partial && !futureMonth ? "gegen das Soll bis heute" : undefined}
                />
            </div>

            {report.isPending && <p className="text-sm text-muted-foreground">Lade…</p>}
            {report.error && <ReportError error={report.error} onRetry={report.retry} />}
            {!report.isPending && !report.error && <DataTable columns={columns} data={totals.weeks} />}
        </div>
    );
}
