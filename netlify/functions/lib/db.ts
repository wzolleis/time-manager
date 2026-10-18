import {drizzle} from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "../../../db/schema";
import {timed} from "./timing";
import {afterRequest} from "./after-request";

// Unter netlify dev nur die lokale Datenbank: ohne .env.local fiele netlify dev auf die
// Netlify-Projekteinstellungen zurück, und das ist die Produktion (features/boundaries/local-environment.md)
const LOCAL_HOSTS = ["127.0.0.1", "localhost"];
if (process.env.NETLIFY_DEV === "true" && !LOCAL_HOSTS.includes(process.env.DB_HOST ?? "")) {
    throw new Error(
        `netlify dev verwendet nur die lokale Datenbank, DB_HOST ist "${process.env.DB_HOST}". ` +
            "Fehlt .env.local? Siehe features/boundaries/local-environment.md",
    );
}

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
            const sql = typeof first === "string" ? first : ((first as {sql?: string} | undefined)?.sql ?? "");
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

// netlify dev startet für jede Anfrage einen eigenen Worker und beendet ihn nicht. Eine offene Verbindung
// hielte ihn und sich selbst am Leben, bis die Datenbank "Too many connections" meldet. Deshalb dort den
// Pool nach der Anfrage schließen, der Worker bekommt ohnehin keine zweite. In der Produktion nutzt eine
// warme Instanz den Pool weiter.
if (process.env.NETLIFY_DEV === "true") afterRequest(() => pool.end());

export const db = drizzle(pool, {schema, mode: "default"});
