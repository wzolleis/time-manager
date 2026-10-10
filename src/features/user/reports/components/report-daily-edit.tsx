import {useMemo, useState} from "react";
import {useQuery} from "@tanstack/react-query";
import {Button} from "@/components/ui/button.tsx";
import {Input} from "@/components/ui/input.tsx";
import {fetchProjects} from "@/api/projects.ts";
import {fetchTimeEntries} from "@/api/time-entries.ts";
import {formatDate, formatDuration, formatTime} from "@/lib/format.ts";
import {useNow} from "@/lib/use-now.ts";
import {useCurrentUser} from "@/lib/user-context.ts";
import {addDays, localDayRange} from "@shared/day-range.ts";
import {dayTotals} from "@shared/time-report.ts";
import {localDay} from "@shared/time-rules.ts";
import {DataTable, type DataTableColumnDef} from "@/components/table/data-table.tsx";
import {EntryActions, type EntryRow} from "@user/time-stamp/components/time-entry-actions.tsx";
import {Summary} from "@user/reports/components/report-daily.tsx";

// Außerhalb der Komponente, damit die Spalten stabil bleiben
const columns: DataTableColumnDef<EntryRow>[] = [
    {
        accessorKey: "bookedAt",
        header: "Uhrzeit",
        cell: ({getValue}) => `${formatTime(getValue<Date>())} Uhr`,
    },
    {
        accessorKey: "type",
        header: "Buchung",
        cell: ({getValue}) => (getValue<EntryRow["type"]>() === "kommen" ? "Kommen" : "Gehen"),
    },
    {
        accessorKey: "projectName",
        header: "Projekt",
        cell: ({getValue}) => getValue<string | null>() ?? "–",
    },
    {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({row}) => <EntryActions entry={row.original}/>,
    },
];

export function ReportDailyEdit() {
    const {currentUser} = useCurrentUser();
    const now = useNow();
    const userId = currentUser?.id;

    const today = localDay(new Date(now));
    const [day, setDay] = useState(() => localDay(new Date()));

    // Gleicher Query-Key wie Stempel-Karte und Tagesbericht: keine zusätzliche Anfrage
    const entries = useQuery({
        queryKey: ["time-entries", userId],
        queryFn: () => fetchTimeEntries(userId!),
        enabled: !!userId,
    });
    const projects = useQuery({queryKey: ["projects"], queryFn: fetchProjects});

    const range = useMemo(() => localDayRange(day), [day]);

    const report = useMemo(() => {
        const dtos = entries.data ?? [];
        const names = new Map((projects.data ?? []).map((p) => [p.id, p.name]));

        const rows: EntryRow[] = dtos
            .map((e) => ({
                id: e.id,
                type: e.type,
                bookedAt: new Date(e.bookedAt),
                projectId: e.projectId,
                projectName: e.projectId ? (names.get(e.projectId) ?? null) : null,
            }))
            .filter((r) => r.bookedAt >= range.start && r.bookedAt < range.end);

        // Für die Summen zählen alle Buchungen, damit Nachtschichten stimmen
        const all = dtos.map((e) => ({id: e.id, type: e.type, bookedAt: new Date(e.bookedAt)}));
        return {rows, totals: dayTotals(all, range, new Date(now))};
    }, [entries.data, projects.data, range, now]);

    if (!currentUser) {
        return (
            <p className="text-sm text-muted-foreground">
                Bitte zuerst einen User anlegen und auswählen.
            </p>
        );
    }

    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-2xl font-semibold">Tagesbericht bearbeiten</h1>
                <p className="text-sm text-muted-foreground">
                    {currentUser.name} · {formatDate(range.start)}
                </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" aria-label="Vorheriger Tag"
                        onClick={() => setDay(addDays(day, -1))}>
                    ←
                </Button>
                <Input
                    type="date"
                    className="w-40"
                    value={day}
                    onChange={(e) => e.target.value && setDay(e.target.value)}
                    aria-label="Tag wählen"
                />
                <Button variant="outline" size="sm" aria-label="Nächster Tag" onClick={() => setDay(addDays(day, 1))}>
                    →
                </Button>
                <Button variant="ghost" size="sm" disabled={day === today} onClick={() => setDay(today)}>
                    Heute
                </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
                <Summary
                    title="Arbeitszeit"
                    value={formatDuration(report.totals.workMs)}
                    hint={report.totals.running ? "läuft noch" : undefined}
                />
                <Summary title="Pausen" value={formatDuration(report.totals.breakMs)}/>
                <Summary title="Buchungen" value={String(report.rows.length)}/>
            </div>

            {entries.isPending && <p className="text-sm text-muted-foreground">Lade…</p>}
            {entries.isError && (
                <p role="alert" className="text-sm text-destructive">
                    {entries.error.message}
                </p>
            )}
            {entries.isSuccess && (
                <DataTable
                    columns={columns}
                    data={report.rows}
                    emptyText={day === today ? "Heute noch keine Buchungen." : "An diesem Tag keine Buchungen."}
                />
            )}
        </div>
    );
}