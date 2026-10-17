import {useState} from "react";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Summary} from "@/components/summary";
import {DataTable, type DataTableColumnDef} from "@/components/table/data-table";
import {diffClass, formatDate, formatDifference, formatDuration, formatTime} from "@/lib/format";
import {addDays} from "@shared/day-range";
import {localDay} from "@shared/time-rules";
import {EntryActions} from "@features/time-stamp/components/time-entry-actions";
import {TimeEntryCreateDialog} from "@features/time-stamp/components/time-entry-create-dialog";
import {StampCard} from "@features/time-stamp/components/stamp-card";
import {ReportError} from "@features/reports/components/report-error";
import {type DailyReportRow, useShowDailyReport} from "@features/reports/use-cases/use-show-daily-report";
import {dayKindLabel} from "@features/reports/utils/day-kind-label";

// Buchungen an einem Krankheitstag bleiben sichtbar, aber ausgegraut
const muted = (row: DailyReportRow, text: string) =>
    row.ignored ? <span className="text-muted-foreground">{text}</span> : text;

// Außerhalb der Komponente, damit die Spalten stabil bleiben
const columns: DataTableColumnDef<DailyReportRow>[] = [
    {
        accessorKey: "bookedAt",
        header: "Uhrzeit",
        cell: ({getValue, row}) => muted(row.original, `${formatTime(getValue<Date>())} Uhr`),
    },
    {
        accessorKey: "type",
        header: "Buchung",
        cell: ({getValue, row}) => {
            const label = getValue<DailyReportRow["type"]>() === "kommen" ? "Kommen" : "Gehen";
            return muted(row.original, row.original.ignored ? `${label} · zählt nicht (krank)` : label);
        },
    },
    {
        accessorKey: "projectName",
        header: "Projekt",
        cell: ({getValue, row}) => muted(row.original, getValue<string | null>() ?? "–"),
    },
    {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({row}) => <EntryActions entry={row.original} />,
    },
];

export function ReportDailyEdit() {
    const [day, setDay] = useState(() => localDay(new Date()));
    const report = useShowDailyReport(day);
    const {currentUser, today, totals} = report;

    if (!currentUser) {
        return <p className="text-sm text-muted-foreground">Bitte zuerst einen User anlegen und auswählen.</p>;
    }

    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-2xl font-semibold">Heute</h1>
                <p className="text-sm text-muted-foreground">
                    {currentUser.name} · {formatDate(report.range.start)}
                </p>
            </div>

            {/* Gestempelt wird immer jetzt, deshalb nur am heutigen Tag */}
            {day === today && <StampCard />}

            <div className="flex flex-wrap items-center gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    aria-label="Vorheriger Tag"
                    onClick={() => setDay(addDays(day, -1))}
                >
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
                <TimeEntryCreateDialog defaultDay={day} defaultType={report.next} label="Buchung nachtragen" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {totals.missingGehen && (
                    <p role="alert" className="text-sm text-destructive">
                        An diesem Tag fehlt das Gehen. Trage es mit „Buchung nachtragen" nach.
                    </p>
                )}
                <Summary
                    title="Arbeitszeit"
                    value={formatDuration(totals.workMs)}
                    hint={totals.running ? "läuft noch" : undefined}
                />
                <Summary title="Pausen" value={formatDuration(totals.breakMs)} />
                <Summary
                    title="Soll"
                    value={formatDuration(report.target)}
                    hint={dayKindLabel(report.kind, report.holidayName)}
                />
                <Summary
                    title="Differenz"
                    value={report.diff === null ? "–" : formatDifference(report.diff)}
                    valueClassName={report.diff === null ? undefined : diffClass(report.diff)}
                />
            </div>

            {report.isPending && <p className="text-sm text-muted-foreground">Lade…</p>}
            {report.error && <ReportError error={report.error} onRetry={report.retry} />}
            {!report.isPending && !report.error && (
                <DataTable
                    columns={columns}
                    data={report.rows}
                    emptyText={day === today ? "Heute noch keine Buchungen." : "An diesem Tag keine Buchungen."}
                />
            )}
        </div>
    );
}
