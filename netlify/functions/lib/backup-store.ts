// netlify/functions/lib/backup-store.ts
// Ein Lauf des Datenbank-Backups und die gespeicherten Läufe (features/use-case/database-backup.md)
import {randomUUID} from "node:crypto";
import {desc, eq, isNotNull, and, max} from "drizzle-orm";
import mysql, {type Connection} from "mysql2/promise";
import {backupRuns} from "../../../db/schema";
import type {BackupOverview, BackupRun, BackupSource} from "@shared/backup";
import {db} from "./db";
import {createDump, DUMP_CONNECTION_OPTIONS, packDump} from "./backup-file";
import {type FtpConfig, rotateBackups, uploadBackup, withFtp} from "./backup-ftp";
import {backupFileName} from "./backup-rotation";

// Netlify-Secrets nur im Context Production, BACKUP_FTP_PORT ist optional (21)
const REQUIRED_ENV = ["BACKUP_FTP_HOST", "BACKUP_FTP_USER", "BACKUP_FTP_PASSWORD", "BACKUP_AGE_RECIPIENT"] as const;
const LOCK_NAME = "time_manager_backup";
const RUNS_SHOWN = 30;

export class BackupNotConfiguredError extends Error {}
export class BackupRunningError extends Error {}

export const isBackupConfigured = () => REQUIRED_ENV.every((name) => process.env[name]);

function backupConfig(): {ftp: FtpConfig; recipient: string} {
    const missing = REQUIRED_ENV.filter((name) => !process.env[name]);
    if (missing.length > 0) {
        throw new BackupNotConfiguredError(`Das Backup ist nicht eingerichtet, es fehlt: ${missing.join(", ")}`);
    }
    return {
        ftp: {
            host: process.env.BACKUP_FTP_HOST!,
            port: Number(process.env.BACKUP_FTP_PORT ?? 21),
            user: process.env.BACKUP_FTP_USER!,
            password: process.env.BACKUP_FTP_PASSWORD!,
        },
        recipient: process.env.BACKUP_AGE_RECIPIENT!,
    };
}

export const backupFtpConfig = () => backupConfig().ftp;

// ohne Millisekunden, wie die Spalten sie speichern
const now = () => new Date(Math.floor(Date.now() / 1000) * 1000);

// Die Meldung für die Administration, ohne Stack und begrenzt auf die Spalte
const errorText = (err: unknown) => (err instanceof Error ? err.message : String(err)).slice(0, 1000);

/**
 * Erstellt ein Backup und liefert den beendeten Lauf, auch wenn er fehlgeschlagen ist. Wirft nur, wenn das Backup
 * nicht eingerichtet ist oder schon eines läuft.
 */
export async function runBackup(source: BackupSource, startedBy: string | null): Promise<BackupRun> {
    const config = backupConfig();
    // Eine eigene Verbindung: der Pool hat nur eine, und die Sperre und der Snapshot gehören zu dieser Verbindung
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT ?? 3306),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        connectTimeout: 10_000,
        ...DUMP_CONNECTION_OPTIONS,
    });
    try {
        // Die Sperre endet spätestens mit der Verbindung, auch wenn die Function abbricht
        const [[{locked}]] = (await conn.query("SELECT GET_LOCK(?, 0) AS locked", [LOCK_NAME])) as unknown as [
            [{locked: number | null}],
        ];
        if (locked !== 1) throw new BackupRunningError("Es läuft gerade ein Backup, bitte kurz warten.");

        // Wer die Sperre hat, ist der einzige Lauf. Ein Lauf, der noch "running" ist, wurde also abgebrochen.
        await db
            .update(backupRuns)
            .set({status: "failed", finishedAt: now(), error: "Abgebrochen, vermutlich wegen des Zeitlimits"})
            .where(eq(backupRuns.status, "running"));

        const run: BackupRun = {
            id: randomUUID(),
            source,
            startedBy,
            status: "running",
            startedAt: now(),
            finishedAt: null,
            fileName: null,
            sizeBytes: null,
            error: null,
            copiedAt: null,
        };
        await db.insert(backupRuns).values(run);
        return await finishRun(conn, run, config);
    } finally {
        await conn.end().catch(() => undefined);
    }
}

type RunResult = Pick<BackupRun, "status" | "fileName" | "sizeBytes" | "error">;

async function finishRun(
    conn: Connection,
    run: BackupRun,
    config: {ftp: FtpConfig; recipient: string},
): Promise<BackupRun> {
    let result: RunResult;
    try {
        const {sql} = await createDump(conn, run.startedAt);
        const file = await packDump(sql, config.recipient);
        const fileName = backupFileName(run.startedAt);
        result = await withFtp(config.ftp, async (client): Promise<RunResult> => {
            await uploadBackup(client, fileName, file);
            const uploaded = {fileName, sizeBytes: file.byteLength};
            try {
                await rotateBackups(client); // erst nach dem erfolgreichen Upload
                return {...uploaded, status: "succeeded", error: null};
            } catch (err) {
                return {
                    ...uploaded,
                    status: "failed",
                    error: `Hochgeladen, aber Aufräumen fehlgeschlagen: ${errorText(err)}`,
                };
            }
        });
    } catch (err) {
        console.error("Backup fehlgeschlagen", err);
        result = {status: "failed", fileName: null, sizeBytes: null, error: errorText(err)};
    }

    const finished: BackupRun = {...run, ...result, finishedAt: now()};
    await db
        .update(backupRuns)
        .set({...result, finishedAt: finished.finishedAt})
        .where(eq(backupRuns.id, run.id));
    return finished;
}

/** Die letzten Läufe und das Datum der letzten Kopie */
export async function backupOverview(): Promise<BackupOverview> {
    const runs = await db.select().from(backupRuns).orderBy(desc(backupRuns.startedAt)).limit(RUNS_SHOWN);
    const [{lastCopiedAt}] = await db.select({lastCopiedAt: max(backupRuns.copiedAt)}).from(backupRuns);
    return {runs, lastCopiedAt, configured: isBackupConfigured()};
}

/** Der Dateiname eines Laufs, dessen Datei hochgeladen wurde, sonst null */
export async function backupFileOf(id: string): Promise<{fileName: string; sizeBytes: number | null} | null> {
    const [row] = await db
        .select({fileName: backupRuns.fileName, sizeBytes: backupRuns.sizeBytes})
        .from(backupRuns)
        .where(and(eq(backupRuns.id, id), isNotNull(backupRuns.fileName)));
    return row?.fileName ? {fileName: row.fileName, sizeBytes: row.sizeBytes} : null;
}

/** Merkt sich, dass die Datei des Laufs heruntergeladen wurde. false, wenn es den Lauf mit Datei nicht gibt. */
export async function markBackupCopied(id: string): Promise<boolean> {
    const [result] = await db
        .update(backupRuns)
        .set({copiedAt: now()})
        .where(and(eq(backupRuns.id, id), isNotNull(backupRuns.fileName)));
    return result.affectedRows > 0;
}
