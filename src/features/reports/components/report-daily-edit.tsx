import {useNavigate} from "@tanstack/react-router";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {MetricCard} from "@/components/cards/metric-card";
import {DataTable, type DataTableColumnDef} from "@/components/table/data-table";
import {diffClass} from "@/lib/format";
import {formatDate, formatDifference, formatDuration, formatTime, dayKindLabel} from "@shared/format";
import {addDays} from "@shared/day-range";
import {EntryActions} from "@features/reports/components/time-entry-actions";
import {TimeEntryCreateDialog} from "@features/reports/components/time-entry-create-dialog";
import {StampCard} from "@features/reports/components/stamp-card";
import {type DailyReportRow, useShowDailyReport} from "@features/reports/use-cases/use-show-daily-report";
import {Muted} from "@/components/text/muted";
import {ErrorText} from "@/components/text/error-text";
import {Loading} from "@/components/text/loading";
import {LoadError} from "@/components/text/load-error";

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

/** day ist ein gültiger Tag "JJJJ-MM-TT", geprüft in ReportDailyPage */
export function ReportDailyEdit({day}: {day: string}) {
    const navigate = useNavigate();
    const report = useShowDailyReport(day);
    const {currentUser, today, totals} = report;

    if (!currentUser) {
        return <Muted>Bitte zuerst einen User anlegen und auswählen.</Muted>;
    }

    // Blättern ändert die Adresse, der Zurück-Button des Browsers springt dann zum vorherigen Tag
    const setDay = (target: string) => navigate({to: "/user/reports/daily/$day", params: {day: target}});

    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-2xl font-semibold">Heute</h1>
                <Muted>
                    {currentUser.name} · {formatDate(report.range.start)}
                </Muted>
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
                    <ErrorText>An diesem Tag fehlt das Gehen. Trage es mit „Buchung nachtragen" nach.</ErrorText>
                )}
                <MetricCard
                    title="Arbeitszeit"
                    value={formatDuration(totals.workMs)}
                    hint={totals.running ? "läuft noch" : undefined}
                />
                <MetricCard title="Pausen" value={formatDuration(totals.breakMs)} />
                <MetricCard
                    title="Soll"
                    value={formatDuration(report.target)}
                    hint={dayKindLabel(report.kind, report.holidayName)}
                />
                <MetricCard
                    title="Differenz"
                    value={report.diff === null ? "–" : formatDifference(report.diff)}
                    valueClassName={report.diff === null ? undefined : diffClass(report.diff)}
                />
            </div>

            {report.isPending && <Loading />}
            {report.error && <LoadError error={report.error} onRetry={report.retry} />}
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
