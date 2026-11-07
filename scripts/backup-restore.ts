// scripts/backup-restore.ts
// Spielt ein Backup ein (features/use-case/database-backup.md, „Restore per Skript“). Ohne APP_ENV=production nur in
// die lokale Datenbank time_manager_restore, die Produktion wird dabei nicht berührt.
// Aufruf: npm run backup:restore -- <datei> <schlüsseldatei>
//         npm run backup:restore:prod -- <datei> <schlüsseldatei>   (Produktion, nur im Notfall)
import {dbTarget, isLocalHost, isProduction} from "./lib/env.ts";
import {mkdirSync, readFileSync, writeFileSync} from "node:fs";
import {createInterface} from "node:readline/promises";
import {identityToRecipient} from "age-encryption";
import mysql from "mysql2/promise";
import {
    createDump,
    DUMP_CONNECTION_OPTIONS,
    packDump,
    parseDump,
    readIdentity,
    unpackDump,
} from "../netlify/functions/lib/backup-file.ts";

const RESTORE_DB = "time_manager_restore";
const SAFETY_DIR = "backups"; // gitignored, für die Sicherung vor einem Restore in die Produktion
const JOURNAL = "db/migrations/meta/_journal.json";

function stop(message: string, code = 1): never {
    console.error(`Abbruch: ${message}`);
    process.exit(code);
}

const [file, keyFile] = process.argv.slice(2);
if (!file || !keyFile) stop("Aufruf: npm run backup:restore -- <datei> <schlüsseldatei>", 2);

// Erst lesen und prüfen, dann ändern: ein falscher Schlüssel oder eine beschädigte Datei ändert nichts
let dump: ReturnType<typeof parseDump>;
let identity: string;
try {
    identity = readIdentity(readFileSync(keyFile, "utf8"));
    dump = parseDump(await unpackDump(readFileSync(file), identity));
} catch (err) {
    stop(`${file} lässt sich nicht lesen: ${err instanceof Error ? err.message : String(err)}`);
}

const connectionTo = (database: string) =>
    mysql.createConnection({
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT ?? 3306),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database,
        ...DUMP_CONNECTION_OPTIONS,
    });

// Lokal: time_manager_restore anlegen und DB_USER die Rechte geben, das Init-Skript des Containers kennt sie nicht
async function prepareLocalDatabase(): Promise<string> {
    if (!isLocalHost(process.env.DB_HOST)) stop(`${dbTarget} ist keine lokale Datenbank`);
    const root = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT ?? 3306),
        user: "root",
        password: process.env.DB_ROOT_PASSWORD,
    });
    try {
        await root.query(`CREATE DATABASE IF NOT EXISTS ${mysql.escapeId(RESTORE_DB)}`);
        await root.query(`GRANT ALL ON ${mysql.escapeId(RESTORE_DB)}.* TO ?@'%'`, [process.env.DB_USER]);
    } finally {
        await root.end();
    }
    return RESTORE_DB;
}

// Produktion: Ziel bestätigen lassen und den aktuellen Stand verschlüsselt sichern
async function prepareProduction(): Promise<string> {
    const database = process.env.DB_NAME!;
    console.log(`Das Backup überschreibt die Produktion ${dbTarget} vollständig.`);
    console.log("Alles, was nach dem Backup geschrieben wurde, geht verloren, und alle User melden sich neu an.");
    const prompt = createInterface({input: process.stdin, output: process.stdout});
    const answer = await prompt.question(`Zum Bestätigen den Namen der Datenbank eintippen (${database}): `);
    prompt.close();
    if (answer.trim() !== database) stop("Name stimmt nicht, die Datenbank ist unverändert");

    const conn = await connectionTo(database);
    try {
        const now = new Date();
        const {sql} = await createDump(conn, now);
        mkdirSync(SAFETY_DIR, {recursive: true});
        const safety = `${SAFETY_DIR}/vor-restore_${now.toISOString().replace(/[:.]/g, "-")}.sql.gz.age`;
        writeFileSync(safety, await packDump(sql, await identityToRecipient(identity)));
        console.log(`Aktueller Stand gesichert: ${safety}`);
    } catch (err) {
        stop(`Sicherung vor dem Restore fehlgeschlagen, die Datenbank ist unverändert: ${String(err)}`);
    } finally {
        await conn.end();
    }
    return database;
}

const database = isProduction ? await prepareProduction() : await prepareLocalDatabase();
console.log(`Spiele ${file} nach ${database} ein, ${dump.statements.length} Anweisungen …`);

const conn = await connectionTo(database);
try {
    for (const [i, statement] of dump.statements.entries()) {
        try {
            await conn.query(statement);
        } catch (err) {
            // Nicht die Anweisung ausgeben, sie enthält Daten
            stop(
                `Anweisung ${i + 1} fehlgeschlagen: ${err instanceof Error ? err.message : String(err)}. ` +
                    "Die Datenbank ist unvollständig, das Skript bitte erneut ausführen.",
            );
        }
    }

    // Zeilen je Tabelle mit dem Dump vergleichen
    let differences = 0;
    for (const [table, expected] of Object.entries(dump.rows)) {
        const [[{count}]] = (await conn.query(`SELECT COUNT(*) AS count FROM ${mysql.escapeId(table)}`)) as unknown as [
            [{count: number}],
        ];
        const ok = Number(count) === expected;
        if (!ok) differences++;
        console.log(`${ok ? "  " : "! "}${table.padEnd(28)} ${String(count).padStart(7)} Zeilen`);
    }
    if (differences > 0) stop(`${differences} Tabellen haben andere Zeilenzahlen als das Backup`);

    // Ein älteres Backup braucht die neueren Migrationen
    const migrations = (JSON.parse(readFileSync(JOURNAL, "utf8")) as {entries: unknown[]}).entries.length;
    if ((dump.rows.__drizzle_migrations ?? 0) < migrations) {
        const command = isProduction ? "npm run db:migrate:prod" : `DB_NAME=${RESTORE_DB} npm run db:migrate`;
        console.log(`Das Backup ist älter als die letzte Migration, als Nächstes: ${command}`);
    }
    console.log("Fertig.");
} finally {
    await conn.end();
}
