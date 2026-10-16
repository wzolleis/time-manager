import {useMemo, useState} from "react";
import {useQuery} from "@tanstack/react-query";
import {Button} from "@/components/ui/button.tsx";
import {fetchTimeEntries} from "@/api/time-entries.ts";
import {fetchVacations} from "@/api/vacations.ts";
import {useHolidays} from "@features/holidays/use-holidays.ts";
import {diffClass, formatDayMonth, formatDayShort, formatDifference, formatDuration,} from "@/lib/format.ts";
import {useNow} from "@/lib/use-now.ts";
import {useCurrentUser} from "@/lib/user-context.ts";
import {addDays, localDayRange} from "@shared/day-range.ts";
import {dayKind, type DayKind, targetMs} from "@shared/target-hours.ts";
import {holidayOn} from "@shared/holiday-rules.ts";
import {dayTotals} from "@shared/time-report.ts";
import {localDay} from "@shared/time-rules.ts";
import {isoWeek, weekDays} from "@shared/week.ts";
import {DataTable, type DataTableColumnDef} from "@/components/table/data-table.tsx";
import {Summary} from "@features/reports/components/report-daily.tsx";
import {dayKindLabel} from "@features/reports/day-kind-label.ts";

type DayRow = {
    day: string; // "JJJJ-MM-TT", sortiert richtig
    label: string;
    isToday: boolean;
    count: number;
    running: boolean;
    targetMs: number;
    kind: DayKind;
    holidayName?: string;
    workMs: number;
    breakMs: number;
    diffMs: number | null; // null: Zukunft oder freier Tag ohne Arbeit
    missingGehen: boolean
};

const dash = "–";

// Außerhalb der Komponente, damit die Spalten stabil bleiben
const columns: DataTableColumnDef<DayRow>[] = [
    {
        accessorKey: "day",
        header: "Tag",
        cell: ({row}) => (
            <span className={row.original.isToday ? "font-semibold" : undefined}>
                {row.original.label}
                {row.original.isToday && " · heute"}
                {(row.original.kind === "vacation" || row.original.kind === "holiday") && (
                    <span className="ml-2 text-muted-foreground">
                        {dayKindLabel(row.original.kind, row.original.holidayName)}
                    </span>
                )}
                {row.original.missingGehen && (
                    <span className="ml-2 text-destructive">Gehen fehlt</span>
                )}
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
            return diff === null ? dash : (
                <span className={diffClass(diff)}>{formatDifference(diff)}</span>
            );
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
    const {currentUser} = useCurrentUser();
    const now = useNow();
    const userId = currentUser?.id;

    const today = localDay(new Date(now));
    const [anchor, setAnchor] = useState(() => localDay(new Date())); // irgendein Tag der Woche

    // Gleicher Query-Key wie Stempel-Karte und Tagesbericht: keine zusätzliche Anfrage
    const entries = useQuery({
        queryKey: ["time-entries", userId],
        queryFn: () => fetchTimeEntries(userId!),
        enabled: !!userId,
    });
    const holidays = useHolidays(userId);
    // Gleicher Query-Key wie die Urlaubsseite
    const vacations = useQuery({
        queryKey: ["vacations", userId],
        queryFn: () => fetchVacations(userId!),
        enabled: !!userId,
    });

    const days = useMemo(() => weekDays(anchor), [anchor]);
    const {year, week} = isoWeek(anchor);

    const report = useMemo(() => {
        // Alle Buchungen gehen in die Summen ein, damit Nachtschichten am Tageswechsel stimmen
        const all = (entries.data ?? []).map((e) => ({
            id: e.id,
            type: e.type,
            bookedAt: new Date(e.bookedAt),
        }));
        const nowDate = new Date(now);
        const vacationList = vacations.data ?? [];
        const holidayList = holidays.data ?? [];

        const rows: DayRow[] = days.map((day) => {
            const range = localDayRange(day);
            const count = all.filter((e) => e.bookedAt >= range.start && e.bookedAt < range.end).length;
            const totals = dayTotals(all, range, nowDate);
            const target = targetMs(day, vacationList, holidayList);
            const elapsed = day <= today; // Tage nach heute zählen nicht zur Differenz
            const noDifference = !elapsed || (target === 0 && totals.workMs === 0);

            return {
                day,
                label: formatDayShort(range.start),
                isToday: day === today,
                count,
                running: totals.running,
                targetMs: target,
                kind: dayKind(day, vacationList, holidayList),
                holidayName: holidayOn(day, holidayList)?.name,
                workMs: totals.workMs,
                breakMs: totals.breakMs,
                diffMs: noDifference ? null : totals.workMs - target,
                missingGehen: totals.missingGehen,
            };
        });

        const workMs = rows.reduce((sum, r) => sum + r.workMs, 0);
        const breakMs = rows.reduce((sum, r) => sum + r.breakMs, 0);
        const targetWeekMs = rows.reduce((sum, r) => sum + r.targetMs, 0); // ohne Urlaubs- und Feiertage
        // Soll nur für die Tage bis heute, damit die Differenz mitten in der Woche aussagekräftig ist
        const targetToDateMs = rows.filter((r) => r.day <= today).reduce((sum, r) => sum + r.targetMs, 0);

        return {rows, workMs, breakMs, targetWeekMs, targetToDateMs, diffMs: workMs - targetToDateMs};
    }, [entries.data, vacations.data, holidays.data, days, today, now]);

    if (!currentUser) {
        return (
            <p className="text-sm text-muted-foreground">
                Bitte zuerst einen User anlegen und auswählen.
            </p>
        );
    }

    const thisWeek = weekDays(today)[0] === days[0];
    const futureWeek = days[0] > today;
    const partial = report.targetToDateMs !== report.targetWeekMs;
    // Jeder Urlaubs- und Feiertag an einem Arbeitstag senkt das Wochensoll um ein Tagessoll
    const vacationDays = report.rows.filter((r) => r.kind === "vacation").length;
    const holidayDays = report.rows.filter((r) => r.kind === "holiday").length;
    const targetHint = [
        vacationDays > 0 && (vacationDays === 1 ? "1 Urlaubstag" : `${vacationDays} Urlaubstage`),
        holidayDays > 0 && (holidayDays === 1 ? "1 Feiertag" : `${holidayDays} Feiertage`),
        partial && !futureWeek && `bis heute: ${formatDuration(report.targetToDateMs)}`,
    ].filter(Boolean).join(" · ");

    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-2xl font-semibold">Wochenbericht</h1>
                <p className="text-sm text-muted-foreground">
                    {currentUser.name} · KW {week}/{year} ·{" "}
                    {formatDayMonth(localDayRange(days[0]).start)} – {formatDayMonth(localDayRange(days[6]).start)}
                </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" aria-label="Vorherige Woche"
                        onClick={() => setAnchor(addDays(anchor, -7))}>
                    ←
                </Button>
                <Button variant="outline" size="sm" aria-label="Nächste Woche"
                        onClick={() => setAnchor(addDays(anchor, 7))}>
                    →
                </Button>
                <Button variant="ghost" size="sm" disabled={thisWeek} onClick={() => setAnchor(today)}>
                    Diese Woche
                </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Summary
                    title="Arbeitszeit"
                    value={formatDuration(report.workMs)}
                    hint={report.rows.some((r) => r.running) ? "läuft noch" : undefined}
                />
                <Summary title="Pausen" value={formatDuration(report.breakMs)}/>
                <Summary
                    title="Soll"
                    value={formatDuration(report.targetWeekMs)}
                    hint={targetHint || undefined}
                />
                <Summary
                    title="Differenz"
                    value={futureWeek ? "–" : formatDifference(report.diffMs)}
                    valueClassName={futureWeek ? undefined : diffClass(report.diffMs)}
                    hint={partial && !futureWeek ? "gegen das Soll bis heute" : undefined}
                />
            </div>

            {entries.isPending && <p className="text-sm text-muted-foreground">Lade…</p>}
            {entries.isError && (
                <p role="alert" className="text-sm text-destructive">
                    {entries.error.message}
                </p>
            )}
            {vacations.isError && (
                <p role="alert" className="text-sm text-destructive">
                    Urlaube konnten nicht geladen werden: {vacations.error.message}
                </p>
            )}
            {holidays.isError && (
                <p role="alert" className="text-sm text-destructive">
                    Feiertage konnten nicht geladen werden: {holidays.error.message}
                </p>
            )}
            {entries.isSuccess && <DataTable columns={columns} data={report.rows}/>}
        </div>
    );
}