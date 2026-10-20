import {useState} from "react";
import {Button} from "@/components/ui/button";
import {Summary} from "@/components/summary";
import {DataTable, type DataTableColumnDef} from "@/components/table/data-table";
import {diffClass} from "@/lib/format";
import {formatDayMonth, formatDayShort, formatDifference, formatDuration, dayKindLabel} from "@shared/format";
import {addDays, localDayRange} from "@shared/day-range";
import type {WeekDayTotals} from "@shared/time-report";
import {localDay} from "@shared/time-rules";
import {ReportError} from "@features/reports/components/report-error";
import {useShowWeeklyReport} from "@features/reports/use-cases/use-show-weekly-report";

type DayRow = WeekDayTotals & {isToday: boolean};

const dash = "–";

// Außerhalb der Komponente, damit die Spalten stabil bleiben
const columns: DataTableColumnDef<DayRow>[] = [
    {
        accessorKey: "day",
        header: "Tag",
        cell: ({row}) => (
            <span className={row.original.isToday ? "font-semibold" : undefined}>
                {formatDayShort(localDayRange(row.original.day).start)}
                {row.original.isToday && " · heute"}
                {(row.original.kind === "vacation" ||
                    row.original.kind === "holiday" ||
                    row.original.kind === "sick") && (
                    <span className="ml-2 text-muted-foreground">
                        {dayKindLabel(row.original.kind, row.original.holidayName)}
                    </span>
                )}
                {row.original.missingGehen && <span className="ml-2 text-destructive">Gehen fehlt</span>}
            </span>
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
        accessorKey: "breakMs",
        header: "Pausen",
        enableSorting: false,
        cell: ({row}) => (row.original.breakMs > 0 ? formatDuration(row.original.breakMs) : dash),
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
    {
        accessorKey: "count",
        header: "Buchungen",
        enableSorting: false,
        cell: ({row}) => (row.original.count > 0 ? row.original.count : dash),
    },
];

export function ReportWeekly() {
    const [anchor, setAnchor] = useState(() => localDay(new Date())); // irgendein Tag der Woche
    const report = useShowWeeklyReport(anchor);
    const {currentUser, today, totals, futureWeek, partial} = report;

    if (!currentUser) {
        return <p className="text-sm text-muted-foreground">Bitte zuerst einen User anlegen und auswählen.</p>;
    }

    const rows: DayRow[] = totals.days.map((d) => ({...d, isToday: d.day === today}));
    const first = totals.days[0].day;
    const last = totals.days[totals.days.length - 1].day;
    // Jeder Urlaubs-, Feier- und Krankheitstag an einem Arbeitstag senkt das Wochensoll um ein Tagessoll
    const vacationDays = rows.filter((r) => r.kind === "vacation").length;
    const holidayDays = rows.filter((r) => r.kind === "holiday").length;
    const sickDays = rows.filter((r) => r.kind === "sick").length;
    const targetHint = [
        vacationDays > 0 && (vacationDays === 1 ? "1 Urlaubstag" : `${vacationDays} Urlaubstage`),
        holidayDays > 0 && (holidayDays === 1 ? "1 Feiertag" : `${holidayDays} Feiertage`),
        sickDays > 0 && (sickDays === 1 ? "1 Krankheitstag" : `${sickDays} Krankheitstage`),
        partial && !futureWeek && `bis heute: ${formatDuration(totals.targetToDateMs)}`,
    ]
        .filter(Boolean)
        .join(" · ");

    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-2xl font-semibold">Wochenbericht</h1>
                <p className="text-sm text-muted-foreground">
                    {currentUser.name} · KW {report.week}/{report.year} · {formatDayMonth(localDayRange(first).start)} –{" "}
                    {formatDayMonth(localDayRange(last).start)}
                </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    aria-label="Vorherige Woche"
                    onClick={() => setAnchor(addDays(anchor, -7))}
                >
                    ←
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    aria-label="Nächste Woche"
                    onClick={() => setAnchor(addDays(anchor, 7))}
                >
                    →
                </Button>
                <Button variant="ghost" size="sm" disabled={report.thisWeek} onClick={() => setAnchor(today)}>
                    Diese Woche
                </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Summary
                    title="Arbeitszeit"
                    value={formatDuration(totals.workMs)}
                    hint={rows.some((r) => r.running) ? "läuft noch" : undefined}
                />
                <Summary title="Pausen" value={formatDuration(totals.breakMs)} />
                <Summary title="Soll" value={formatDuration(totals.targetWeekMs)} hint={targetHint || undefined} />
                <Summary
                    title="Differenz"
                    value={futureWeek ? dash : formatDifference(totals.diffMs)}
                    valueClassName={futureWeek ? undefined : diffClass(totals.diffMs)}
                    hint={partial && !futureWeek ? "gegen das Soll bis heute" : undefined}
                />
            </div>

            {report.isPending && <p className="text-sm text-muted-foreground">Lade…</p>}
            {report.error && <ReportError error={report.error} onRetry={report.retry} />}
            {!report.isPending && !report.error && <DataTable columns={columns} data={rows} />}
        </div>
    );
}
