import {useMutation, useQueryClient} from "@tanstack/react-query";
import {fetchBackupFile, markBackupCopied} from "@/api/backups";
import type {BackupRun} from "@shared/backup";

// Speichert die Datei über den Browser, je nach Einstellung im Download-Ordner oder mit Speichern-Dialog
function saveFile(blob: Blob, fileName: string) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
}

/**
 * Der Administrator kopiert das neueste Backup auf seinen Rechner, verschlüsselt wie auf dem Backup-Speicher.
 * Das Datum der Kopie wird nur gespeichert, wenn die Datei vollständig angekommen ist.
 */
export function useCopyBackup() {
    const qc = useQueryClient();

    const copy = useMutation({
        mutationFn: async (run: BackupRun) => {
            const blob = await fetchBackupFile(run.id);
            // Ein abgebrochener Download endet beim Server wie ein vollständiger, deshalb die Größe vergleichen
            if (run.sizeBytes !== null && blob.size !== run.sizeBytes) {
                throw new Error("Der Download ist unvollständig, bitte erneut versuchen.");
            }
            saveFile(blob, run.fileName ?? "time_manager.sql.gz.age");
            await markBackupCopied(run.id);
        },
        onSettled: () => qc.invalidateQueries({queryKey: ["backups"]}),
    });

    return {
        copy: copy.mutate,
        isCopying: copy.isPending,
        isCopied: copy.isSuccess,
        error: copy.error,
    };
}
