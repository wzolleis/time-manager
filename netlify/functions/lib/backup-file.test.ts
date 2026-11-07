import {describe, expect, it} from "vitest";
import type {Connection} from "mysql2/promise";
import {generateIdentity, identityToRecipient} from "age-encryption";
import {createDump, packDump, parseDump, readIdentity, unpackDump} from "./backup-file";

type Table = {name: string; engine?: string; columns: string[]; rows: unknown[][]};

// Eine Verbindung, die nur die Abfragen des Dumps kennt
function fakeConnection(tables: Table[]): Connection {
    const query = async (arg: string | {sql: string}) => {
        const sql = typeof arg === "string" ? arg : arg.sql;
        if (sql.startsWith("SELECT TABLE_NAME")) {
            return [tables.map((t) => ({name: t.name, type: "BASE TABLE", engine: t.engine ?? "InnoDB"}))];
        }
        const name = /`(\w+)`/.exec(sql)?.[1];
        const table = tables.find((t) => t.name === name);
        if (sql.startsWith("SHOW CREATE TABLE")) {
            return [[{"Create Table": `CREATE TABLE \`${name}\` (\n  \`id\` int NOT NULL\n) ENGINE=InnoDB`}]];
        }
        if (sql.startsWith("SELECT * FROM") && table) return [table.rows, table.columns.map((c) => ({name: c}))];
        return [[]];
    };
    return {query} as unknown as Connection;
}

const NOW = new Date("2026-11-08T02:00:00Z");

const users: Table = {
    name: "users",
    columns: ["id", "name", "note", "created_at", "data"],
    rows: [
        ["1", "Jörg Müßig", "Preis: 5 €\nzweite Zeile", "2026-03-29 02:30:00", null],
        ["2", "O'Brien \\ Co", null, "2026-10-25 02:30:00", Buffer.from([0, 255])],
    ],
};
const sessions: Table = {name: "sessions", columns: ["id_hash"], rows: [["geheim"]]};

describe("createDump", () => {
    it("schreibt jede Anweisung in eine Zeile und escaped die Werte", async () => {
        const {sql, rows} = await createDump(fakeConnection([users]), NOW);
        const insert = sql.split("\n").find((line) => line.startsWith("INSERT"));

        expect(insert).toBe(
            "INSERT INTO `users` (`id`, `name`, `note`, `created_at`, `data`) VALUES " +
                "('1', 'Jörg Müßig', 'Preis: 5 €\\nzweite Zeile', '2026-03-29 02:30:00', NULL), " +
                "('2', 'O\\'Brien \\\\ Co', NULL, '2026-10-25 02:30:00', X'00ff');",
        );
        expect(sql).toContain("CREATE TABLE `users` ( `id` int NOT NULL ) ENGINE=InnoDB;");
        expect(rows).toEqual({users: 2});
    });

    it("nimmt von sessions nur die Struktur", async () => {
        const {sql, rows} = await createDump(fakeConnection([sessions]), NOW);
        expect(sql).toContain("CREATE TABLE `sessions`");
        expect(sql).not.toContain("geheim");
        expect(rows).toEqual({sessions: 0});
    });

    it("bricht ab, wenn eine Tabelle nicht InnoDB ist", async () => {
        const conn = fakeConnection([{...users, engine: "MyISAM"}]);
        await expect(createDump(conn, NOW)).rejects.toThrow("nicht InnoDB: users (MyISAM)");
    });
});

describe("parseDump", () => {
    it("liest Anweisungen und Zeilenzahlen eines Dumps", async () => {
        const {sql} = await createDump(fakeConnection([users, sessions]), NOW);
        const {statements, rows} = parseDump(sql);
        expect(rows).toEqual({users: 2, sessions: 0});
        expect(statements[0]).toBe("SET NAMES utf8mb4;");
        expect(statements.filter((s) => s.startsWith("INSERT"))).toHaveLength(1);
    });

    it("lehnt einen abgeschnittenen Dump ab", async () => {
        const {sql} = await createDump(fakeConnection([users]), NOW);
        const truncated = sql.slice(0, sql.indexOf("INSERT") + 40);
        expect(() => parseDump(truncated)).toThrow("beschädigt");
        expect(() => parseDump(sql.replace("SET FOREIGN_KEY_CHECKS = 1;\n", ""))).toThrow("unvollständig");
    });

    it("lehnt fremde Dateien ab", () => {
        expect(() => parseDump("CREATE TABLE x (id int);\n")).toThrow("kein Backup");
    });
});

describe("packDump und unpackDump", () => {
    it("liefert mit dem richtigen Schlüssel den Dump zurück, mit einem anderen nicht", async () => {
        const identity = await generateIdentity();
        const file = await packDump("-- time-manager Backup\nSELECT 'ä';\n", await identityToRecipient(identity));

        expect(await unpackDump(file, identity)).toBe("-- time-manager Backup\nSELECT 'ä';\n");
        await expect(unpackDump(file, await generateIdentity())).rejects.toThrow();
    });
});

describe("readIdentity", () => {
    it("liest den Schlüssel aus einer Datei von age-keygen", () => {
        const keyFile = "# created: 2026-11-08\n# public key: age1abc\nAGE-SECRET-KEY-1XYZ\n";
        expect(readIdentity(keyFile)).toBe("AGE-SECRET-KEY-1XYZ");
        expect(() => readIdentity("# public key: age1abc\n")).toThrow("kein privater age-Schlüssel");
    });
});
