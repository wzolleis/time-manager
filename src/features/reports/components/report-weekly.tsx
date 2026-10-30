import {Link, useNavigate} from "@tanstack/react-router";
import {MetricCard} from "@/components/cards/metric-card";
import {DataTable, type DataTableColumnDef} from "@/components/table/data-table";
import {diffClass} from "@/lib/format";
import {useTimeFormat} from "@/lib/use-time-format";
import {
    formatDayMonth,
    formatDayShort,
    formatDifference,
    formatDuration,
    dayKindLabel,
    type TimeFormat,
} from "@shared/format";
import {addDays, localDayRange} from "@shared/day-range";
import type {WeekDayTotals} from "@shared/time-report";
import {isoWeekId} from "@shared/week";
import {useShowWeeklyReport} from "@features/reports/use-cases/use-show-weekly-report";
import {Muted} from "@/components/text/muted";
import {Loading} from "@/components/text/loading";
import {LoadError} from "@/components/text/load-error";
import {PageHeader} from "@/components/page/page-header";
import {PeriodNav} from "@/components/buttons/period-nav";

type DayRow = WeekDayTotals & {isToday: boolean};

const dash = "–";

const columnsOf = (format: TimeFormat): DataTableColumnDef<DayRow>[] => [
    {
        accessorKey: "day",
        header: "Tag",
        cell: ({row}) => (
            <span className={row.original.isToday ? "font-semibold" : undefined}>
                <Link to="/user/reports/daily/$day" params={{day: row.original.day}} className="underline">
                    {formatDayShort(localDayRange(row.original.day).start)}
                </Link>
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
        cell: ({row}) => (row.original.targetMs > 0 ? formatDuration(row.original.targetMs, format) : dash),
    },
    {
        accessorKey: "workMs",
        header: "Arbeitszeit",
        enableSorting: false,
        cell: ({row}) => (row.original.workMs > 0 ? formatDuration(row.original.workMs, format) : dash),
    },
    {
        accessorKey: "breakMs",
        header: "Pausen",
        enableSorting: false,
        cell: ({row}) => (row.original.breakMs > 0 ? formatDuration(row.original.breakMs, format) : dash),
    },
    {
        accessorKey: "diffMs",
        header: "Differenz",
        enableSorting: false,
        cell: ({row}) => {
            const diff = row.original.diffMs;
            return diff === null ? dash : <span className={diffClass(diff)}>{formatDifference(diff, format)}</span>;
        },
    },
    {
        accessorKey: "count",
        header: "Buchungen",
        enableSorting: false,
        cell: ({row}) => (row.original.count > 0 ? row.original.count : dash),
    },
];

// Außerhalb der Komponente, damit die Spalten stabil bleiben
const columns = {minutes: columnsOf("minutes"), industrial: columnsOf("industrial")};

/** anchor ist irgendein Tag der Woche "JJJJ-MM-TT", aus der Adresse in ReportWeeklyPage */
export function ReportWeekly({anchor}: {anchor: string}) {
    const navigate = useNavigate();
    const report = useShowWeeklyReport(anchor);
    const timeFormat = useTimeFormat();
    const {currentUser, today, totals, futureWeek, partial} = report;

    if (!currentUser) {
        return <Muted>Bitte zuerst einen User anlegen und auswählen.</Muted>;
    }

    // Blättern ändert die Adresse, der Zurück-Button des Browsers springt dann zur vorherigen Woche
    const setAnchor = (day: string) => navigate({to: "/user/reports/weekly/$week", params: {week: isoWeekId(day)}});

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
        partial && !futureWeek && `bis heute: ${formatDuration(totals.targetToDateMs, timeFormat)}`,
    ]
        .filter(Boolean)
        .join(" · ");

    return (
        <>
            <PageHeader
                title="Wochenbericht"
                description={
                    <>
                        {currentUser.name} · KW {report.week}/{report.year} ·{" "}
                        {formatDayMonth(localDayRange(first).start)} – {formatDayMonth(localDayRange(last).start)}
                    </>
                }
            />

            <PeriodNav
                unit="week"
                onPrevious={() => setAnchor(addDays(anchor, -7))}
                onNext={() => setAnchor(addDays(anchor, 7))}
                onCurrent={() => setAnchor(today)}
                currentDisabled={report.thisWeek}
            />

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <MetricCard
                    title="Arbeitszeit"
                    value={formatDuration(totals.workMs, timeFormat)}
                    hint={rows.some((r) => r.running) ? "läuft noch" : undefined}
                />
                <MetricCard title="Pausen" value={formatDuration(totals.breakMs, timeFormat)} />
                <MetricCard
                    title="Soll"
                    value={formatDuration(totals.targetWeekMs, timeFormat)}
                    hint={targetHint || undefined}
                />
                <MetricCard
                    title="Differenz"
                    value={futureWeek ? dash : formatDifference(totals.diffMs, timeFormat)}
                    valueClassName={futureWeek ? undefined : diffClass(totals.diffMs)}
                    hint={partial && !futureWeek ? "gegen das Soll bis heute" : undefined}
                />
            </div>

            {report.isPending && <Loading />}
            {report.error && <LoadError error={report.error} onRetry={report.retry} />}
            {!report.isPending && !report.error && <DataTable columns={columns[timeFormat]} data={rows} />}
        </>
    );
}
