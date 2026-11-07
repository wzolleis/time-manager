// netlify/functions/lib/backup-file.ts
// Die Datei des Datenbank-Backups: SQL-Dump erzeugen, verpacken (gzip, dann age) und wieder lesen
// (features/use-case/database-backup.md). Ohne relative Imports, weil scripts/backup-restore.ts die Datei direkt mit
// node lädt.
import {gunzipSync, gzipSync} from "node:zlib";
import {Decrypter, Encrypter} from "age-encryption";
import mysql, {type Connection, type ConnectionOptions, type FieldPacket} from "mysql2/promise";

export const DUMP_HEADER = "-- time-manager Backup";
const ROWS_PREFIX = "-- rows ";
const LAST_STATEMENT = "SET FOREIGN_KEY_CHECKS = 1;";
const BATCH_ROWS = 200; // Zeilen pro INSERT, deutlich unter max_allowed_packet

// Von diesen Tabellen nur die Struktur: die Daten sind kurzlebig oder sollen einen Restore überstehen
export const STRUCTURE_ONLY = ["sessions", "passkey_challenges", "backup_runs"];

/** Optionen für die Verbindung des Dumps: Werte als Text, wie sie in der Datenbank stehen */
export const DUMP_CONNECTION_OPTIONS = {
    charset: "utf8mb4",
    dateStrings: true, // keine Umrechnung über Date, die Zeiten verschieben könnte
    supportBigNumbers: true,
    bigNumberStrings: true,
    jsonStrings: true,
} satisfies ConnectionOptions;

/** Zeilen je Tabelle im Dump */
export type RowCounts = Record<string, number>;

type TableInfo = {name: string; type: string; engine: string | null};

/** Ein Wert als SQL-Literal. Andere Typen als die der Optionen oben kommen nicht vor und brechen den Dump ab. */
function sqlValue(value: unknown): string {
    if (value === null || typeof value === "string" || Buffer.isBuffer(value)) return mysql.escape(value);
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
    throw new Error(`Unerwarteter Wert im Dump: ${typeof value}`);
}

// SHOW CREATE TABLE trennt die Spalten mit Zeilenumbrüchen, Texte darin stehen mit \n escaped
const oneLine = (sql: string) => sql.replace(/\n\s*/g, " ");

/**
 * Der Dump der Datenbank der Verbindung, eine Anweisung pro Zeile. Liest in einer Transaktion mit konsistentem
 * Snapshot, damit alle Tabellen denselben Stand haben. Die Verbindung braucht DUMP_CONNECTION_OPTIONS.
 */
export async function createDump(conn: Connection, now: Date): Promise<{sql: string; rows: RowCounts}> {
    await conn.query("SET time_zone = '+00:00'");
    await conn.query("SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ");
    await conn.query("START TRANSACTION WITH CONSISTENT SNAPSHOT, READ ONLY");
    try {
        const [tables] = (await conn.query(
            "SELECT TABLE_NAME AS name, TABLE_TYPE AS type, ENGINE AS engine FROM information_schema.TABLES " +
                "WHERE TABLE_SCHEMA = DATABASE() ORDER BY TABLE_NAME",
        )) as unknown as [TableInfo[]];
        const unsupported = tables.filter((t) => t.type !== "BASE TABLE" || t.engine !== "InnoDB");
        if (unsupported.length > 0) {
            const names = unsupported.map((t) => `${t.name} (${t.engine ?? t.type})`).join(", ");
            throw new Error(`Kein konsistenter Dump möglich, nicht InnoDB: ${names}`);
        }

        const rows: RowCounts = {};
        const body: string[] = [];
        for (const {name} of tables) {
            const id = mysql.escapeId(name);
            const [[create]] = (await conn.query(`SHOW CREATE TABLE ${id}`)) as unknown as [[Record<string, string>]];
            body.push(`DROP TABLE IF EXISTS ${id};`, `${oneLine(create["Create Table"])};`);

            if (STRUCTURE_ONLY.includes(name)) {
                rows[name] = 0;
                continue;
            }
            const [data, fields] = (await conn.query({sql: `SELECT * FROM ${id}`, rowsAsArray: true})) as unknown as [
                unknown[][],
                FieldPacket[],
            ];
            rows[name] = data.length;
            const columns = fields.map((f) => mysql.escapeId(f.name)).join(", ");
            for (let i = 0; i < data.length; i += BATCH_ROWS) {
                const values = data
                    .slice(i, i + BATCH_ROWS)
                    .map((row) => `(${row.map(sqlValue).join(", ")})`)
                    .join(", ");
                body.push(`INSERT INTO ${id} (${columns}) VALUES ${values};`);
            }
        }

        const sql = [
            `${DUMP_HEADER} ${now.toISOString()}`,
            `${ROWS_PREFIX}${JSON.stringify(rows)}`,
            "SET NAMES utf8mb4;",
            "SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';", // auch ohne NO_BACKSLASH_ESCAPES, die Texte sind mit \ escaped
            "SET time_zone = '+00:00';",
            "SET UNIQUE_CHECKS = 0;",
            "SET FOREIGN_KEY_CHECKS = 0;",
            ...body,
            "SET UNIQUE_CHECKS = 1;",
            LAST_STATEMENT,
            "",
        ].join("\n");
        return {sql, rows};
    } finally {
        await conn.query("COMMIT");
    }
}

/** Komprimiert den Dump und verschlüsselt ihn für den öffentlichen age-Schlüssel (age1…) */
export async function packDump(sql: string, recipient: string): Promise<Uint8Array> {
    const encrypter = new Encrypter();
    encrypter.addRecipient(recipient);
    return encrypter.encrypt(gzipSync(sql));
}

/** Entschlüsselt mit dem privaten Schlüssel (AGE-SECRET-KEY-1…) und entpackt. Wirft bei falschem Schlüssel. */
export async function unpackDump(file: Uint8Array, identity: string): Promise<string> {
    const decrypter = new Decrypter();
    decrypter.addIdentity(identity);
    return gunzipSync(await decrypter.decrypt(file, "uint8array")).toString("utf8");
}

/** Der private Schlüssel aus einer Datei von age-keygen, die Kommentarzeilen werden übersprungen */
export function readIdentity(keyFile: string): string {
    const identity = keyFile.split("\n").find((line) => line.startsWith("AGE-SECRET-KEY-"));
    if (!identity) throw new Error("In der Schlüsseldatei steht kein privater age-Schlüssel (AGE-SECRET-KEY-…)");
    return identity.trim();
}

/** Die Anweisungen und Zeilenzahlen eines Dumps. Wirft, wenn die Datei kein vollständiger Dump ist. */
export function parseDump(sql: string): {statements: string[]; rows: RowCounts} {
    const lines = sql.split("\n");
    if (!lines[0]?.startsWith(DUMP_HEADER)) throw new Error("Die Datei ist kein Backup von time-manager");
    const rowsLine = lines.find((line) => line.startsWith(ROWS_PREFIX));
    if (!rowsLine) throw new Error("Im Backup fehlen die Zeilenzahlen");

    const statements = lines.filter((line) => line !== "" && !line.startsWith("--"));
    const broken = statements.findIndex((s) => !s.endsWith(";"));
    if (broken >= 0) throw new Error(`Das Backup ist beschädigt, Anweisung ${broken + 1} endet nicht mit ;`);
    if (statements.at(-1) !== LAST_STATEMENT) throw new Error("Das Backup ist unvollständig");

    return {statements, rows: JSON.parse(rowsLine.slice(ROWS_PREFIX.length)) as RowCounts};
}
