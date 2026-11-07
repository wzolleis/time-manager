import {ApiError, request} from "./http";
import type {BackupOverview, BackupRun} from "@shared/backup";

/** Die letzten Läufe des Datenbank-Backups, nur für Administratoren */
export const fetchBackups = () => request<BackupOverview>("/api/backups");

/** Startet ein Backup und wartet, bis es fertig ist. Auch ein fehlgeschlagener Lauf kommt als Ergebnis zurück. */
export const createBackup = () => request<BackupRun>("/api/backups", {method: "POST"});

/** Die verschlüsselte Datei eines Backups */
export async function fetchBackupFile(id: string): Promise<Blob> {
    const res = await fetch(`/api/backups/${id}/file`);
    if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {error?: string};
        throw new ApiError(res.status, body.error ?? `Fehler (HTTP ${res.status})`);
    }
    return res.blob();
}

export const markBackupCopied = (id: string) => request<void>(`/api/backups/${id}/copied`, {method: "POST"});
