import {DataTable, type DataTableColumnDef} from "@/components/table/data-table";
import {Loading} from "@/components/text/loading";
import {LoadError} from "@/components/text/load-error";
import {formatDateTime} from "@shared/format";
import type {BackupRun, BackupSource, BackupStatus} from "@shared/backup";

const SOURCE_LABELS: Record<BackupSource, string> = {schedule: "Nachts", manual: "Von Hand"};
const STATUS_LABELS: Record<BackupStatus, string> = {
    running: "Läuft",
    succeeded: "Erfolgreich",
    failed: "Fehlgeschlagen",
};

const formatSize = (bytes: number) => `${Math.max(1, Math.round(bytes / 1024)).toLocaleString("de-DE")} KB`;

// Außerhalb der Komponente, damit die Spalten stabil bleiben
const columns: DataTableColumnDef<BackupRun>[] = [
    {accessorKey: "startedAt", header: "Gestartet", cell: ({row}) => formatDateTime(row.original.startedAt)},
    {
        accessorKey: "source",
        header: "Auslöser",
        enableSorting: false,
        cell: ({row}) => SOURCE_LABELS[row.original.source],
    },
    {
        accessorKey: "status",
        header: "Ergebnis",
        enableSorting: false,
        cell: ({row}) => {
            const {status, error} = row.original;
            return (
                <span className={status === "failed" ? "text-destructive" : undefined}>
                    {STATUS_LABELS[status]}
                    {error && `: ${error}`}
                </span>
            );
        },
    },
    {
        accessorKey: "sizeBytes",
        header: "Größe",
        enableSorting: false,
        meta: {onSmallScreens: "hide"},
        cell: ({row}) => (row.original.sizeBytes === null ? "–" : formatSize(row.original.sizeBytes)),
    },
    {
        accessorKey: "copiedAt",
        header: "Kopiert",
        enableSorting: false,
        meta: {onSmallScreens: "hide"},
        cell: ({row}) => (row.original.copiedAt ? formatDateTime(row.original.copiedAt) : "–"),
    },
];

type Props = {
    backups: {runs?: BackupRun[]; isPending: boolean; error: Error | null; retry: () => unknown};
};

/** Die letzten Läufe des Backups, der neueste zuerst */
export function BackupRunList({backups}: Props) {
    return (
        <>
            {backups.isPending && <Loading />}
            {backups.error && <LoadError error={backups.error} onRetry={backups.retry} />}
            {backups.runs && <DataTable columns={columns} data={backups.runs} emptyText="Es gibt noch kein Backup." />}
        </>
    );
}
