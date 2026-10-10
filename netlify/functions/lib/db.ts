import {drizzle} from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "../../../db/schema";
import {timed} from "./timing";

export const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectionLimit: 1, // Shared Hosting erlaubt oft nur wenige Verbindungen
    connectTimeout: 10_000,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10_000,
});

type Method = "query" | "execute";
type Instrumentable = Record<Method, (...args: unknown[]) => Promise<unknown>>;

const instrumented = new WeakSet<object>(); // Pool-Verbindungen werden wiederverwendet

function instrument(target: object) {
    if (instrumented.has(target)) return;
    instrumented.add(target);

    const t = target as unknown as Instrumentable;
    for (const method of ["query", "execute"] as const) {
        const original = t[method].bind(target);
        t[method] = (...args: unknown[]) => {
            const first = args[0];
            const sql =
                typeof first === "string" ? first : ((first as { sql?: string } | undefined)?.sql ?? "");
            const label = sql.replace(/\s+/g, " ").slice(0, 60);
            return timed(`sql.${method}: ${label}`, () => original(...args));
        };
    }
}

instrument(pool);

const getConnection = pool.getConnection.bind(pool);
pool.getConnection = async () => {
    const conn = await timed("db.getConnection", () => getConnection());
    instrument(conn); // für Abfragen innerhalb von Transaktionen
    return conn;
};

export const db = drizzle(pool, {schema, mode: "default"});