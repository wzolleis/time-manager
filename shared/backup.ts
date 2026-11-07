import {z} from "zod";
import {createSelectSchema} from "drizzle-zod";
import {backupRuns} from "../db/schema";

// Läufe des Datenbank-Backups (features/use-case/database-backup.md)
export const BackupRunSchema = createSelectSchema(backupRuns);

export type BackupRun = z.infer<typeof BackupRunSchema>;
export type BackupSource = BackupRun["source"];
export type BackupStatus = BackupRun["status"];

/** Antwort von GET /api/backups */
export type BackupOverview = {
    runs: BackupRun[]; // die letzten Läufe, der neueste zuerst
    lastCopiedAt: Date | null; // letzte Kopie über den Button, über alle Läufe
    configured: boolean; // false: in dieser Umgebung fehlen die Zugangsdaten zum Backup-Speicher
};
