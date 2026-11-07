import type {BackupRun} from "./backup";

const HOUR_MS = 60 * 60 * 1000;
export const BACKUP_MAX_AGE_MS = 26 * HOUR_MS; // nächtlicher Lauf plus Spielraum
export const COPY_MAX_AGE_MS = 7 * 24 * HOUR_MS;

/** Ein Zeitpunkt aus der API (JSON) oder aus der Datenbank */
type Instant = Date | string;

const time = (d: Instant) => new Date(d).getTime();

type RunLike = Pick<BackupRun, "status" | "fileName" | "error"> & {startedAt: Instant};

/** Das neueste Backup, dessen Datei auf dem Backup-Speicher liegt, sonst null. runs: der neueste zuerst. */
export function newestCopyable<R extends RunLike>(runs: R[]): R | null {
    return runs.find((r) => r.status === "succeeded" && r.fileName !== null) ?? null;
}

/**
 * Die Warnungen für die Administration, leer wenn alles in Ordnung ist. runs: der neueste zuerst.
 * Ein laufendes Backup zählt weder als Erfolg noch als Fehler.
 */
export function backupWarnings(runs: RunLike[], lastCopiedAt: Instant | null, now: Date): string[] {
    const warnings: string[] = [];

    const lastFinished = runs.find((r) => r.status !== "running");
    if (lastFinished?.status === "failed") {
        warnings.push(`Das letzte Backup ist fehlgeschlagen: ${lastFinished.error ?? "unbekannter Fehler"}`);
    }

    const lastSuccess = runs.find((r) => r.status === "succeeded");
    if (!lastSuccess) warnings.push("Es gibt noch kein erfolgreiches Backup.");
    else if (now.getTime() - time(lastSuccess.startedAt) > BACKUP_MAX_AGE_MS) {
        warnings.push("Seit mehr als 26 Stunden gab es kein erfolgreiches Backup.");
    }

    if (!lastCopiedAt) warnings.push("Es wurde noch kein Backup auf einen Rechner kopiert.");
    else if (now.getTime() - time(lastCopiedAt) > COPY_MAX_AGE_MS) {
        warnings.push("Die letzte Kopie auf einen Rechner ist mehr als 7 Tage her.");
    }

    return warnings;
}
