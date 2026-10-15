import {useMemo} from "react";
import {useQuery} from "@tanstack/react-query";
import {DataTable, type DataTableColumnDef} from "@/components/table/data-table.tsx";
import {Card, CardDescription, CardHeader, CardTitle} from "@/components/ui/card.tsx";
import {fetchProjects} from "@/api/projects.ts";
import {fetchTimeEntries} from "@/api/time-entries.ts";
import {fetchVacations} from "@/api/vacations.ts";
import {useHolidays} from "@/features/holidays/use-holidays.ts";
import {diffClass, formatDate, formatDifference, formatDuration, formatTime} from "@/lib/format.ts";
import {useNow} from "@/lib/use-now.ts";
import {useCurrentUser} from "@/lib/user-context.ts";
import {localDayRange} from "@shared/day-range.ts";
import {dayTotals} from "@shared/time-report.ts";
import {localDay} from "@shared/time-rules.ts";
import {cn} from "@/lib/utils.ts";
import {dayKind, targetMs} from "@shared/target-hours.ts";
import {dayKindLabel} from "@user/reports/day-kind-label.ts";
import {holidayOn} from "@shared/holiday-rules.ts";

type Row = {
    id: string;
    type: "kommen" | "gehen";
    bookedAt: Date;
    projectName: string | null;
};

// Außerhalb der Komponente, damit die Spalten stabil bleiben
const columns: DataTableColumnDef<Row>[] = [
    {
        accessorKey: "bookedAt",
        header: "Uhrzeit",
        cell: ({getValue}) => `${formatTime(getValue<Date>())} Uhr`,
    },
    {
        accessorKey: "type",
        header: "Buchung",
        cell: ({getValue}) => (getValue<Row["type"]>() === "kommen" ? "Kommen" : "Gehen"),
    },
    {
        accessorKey: "projectName",
        header: "Projekt",
        cell: ({getValue}) => getValue<string | null>() ?? "–",
    },
];

export function Summary({
                            title,
                            value,
                            hint,
                            valueClassName,
                        }: {
    title: string;
    value: string;
    hint?: string;
    valueClassName?: string;
}) {
    return (
        <Card>
            <CardHeader>
                <CardDescription>{title}</CardDescription>
                <CardTitle className={cn("text-2xl", valueClassName)}>{value}</CardTitle>
                {hint && <CardDescription>{hint}</CardDescription>}
            </CardHeader>
        </Card>
    );
}

export function ReportDaily() {
    const {currentUser} = useCurrentUser();
    const now = useNow();
    const userId = currentUser?.id;

    // Gleicher Query-Key wie die Stempel-Karte: keine zusätzliche Anfrage
    const entries = useQuery({
        queryKey: ["time-entries", userId],
        queryFn: () => fetchTimeEntries(userId!),
        enabled: !!userId,
    });
    const projects = useQuery({queryKey: ["projects"], queryFn: fetchProjects});
    const holidays = useHolidays(userId);
    // Gleicher Query-Key wie die Urlaubsseite
    const vacations = useQuery({
        queryKey: ["vacations", userId],
        queryFn: () => fetchVacations(userId!),
        enabled: !!userId,
    });

    const today = localDay(new Date(now));

    const report = useMemo(() => {
        const dtos = entries.data ?? [];
        const range = localDayRange(today);
        const names = new Map((projects.data ?? []).map((p) => [p.id, p.name]));

        const rows: Row[] = dtos
            .map((e) => ({
                id: e.id,
                type: e.type,
                bookedAt: new Date(e.bookedAt),
                projectName: e.projectId ? (names.get(e.projectId) ?? null) : null,
            }))
            .filter((r) => r.bookedAt >= range.start && r.bookedAt < range.end);

        // Für die Summen zählen alle Buchungen, damit Nachtschichten stimmen
        const all = dtos.map((e) => ({id: e.id, type: e.type, bookedAt: new Date(e.bookedAt)}));
        return {rows, totals: dayTotals(all, range, new Date(now))};
    }, [entries.data, projects.data, today, now]);

    if (!currentUser) {
        return (
            <p className="text-sm text-muted-foreground">
                Bitte zuerst einen User anlegen und auswählen.
            </p>
        );
    }

    const vacationList = vacations.data ?? [];
    const holidayList = holidays.data ?? [];
    const target = targetMs(today, vacationList, holidayList);
    const targetHint = dayKindLabel(dayKind(today, vacationList, holidayList), holidayOn(today, holidayList)?.name);
    const diff = report.totals.workMs - target;

    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-2xl font-semibold">Tagesbericht</h1>
                <p className="text-sm text-muted-foreground">
                    {currentUser.name} · {formatDate(now)}
                </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Summary
                    title="Arbeitszeit"
                    value={formatDuration(report.totals.workMs)}
                    hint={report.totals.running ? "läuft noch" : undefined}
                />
                <Summary title="Pausen" value={formatDuration(report.totals.breakMs)}/>
                <Summary
                    title="Soll"
                    value={formatDuration(target)}
                    hint={targetHint}
                />
                <Summary
                    title="Differenz"
                    value={formatDifference(diff)}
                    valueClassName={diffClass(diff)}
                    hint={report.totals.running ? "läuft noch" : undefined}
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
            {entries.isSuccess && (
                <DataTable columns={columns} data={report.rows} emptyText="Heute noch keine Buchungen."/>
            )}
        </div>
    );
}