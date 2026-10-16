import type {Config} from "@netlify/functions";
import mysql from "mysql2/promise";
import {withSession} from "./lib/session";

let cold = true;
const round = (ms: number) => Math.round(ms * 10) / 10;

export default withSession(async () => {
    const wasCold = cold;
    cold = false;

    try {
        const t0 = performance.now();
        const conn = await mysql.createConnection({
            host: process.env.DB_HOST,
            port: Number(process.env.DB_PORT ?? 3306),
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            connectTimeout: 20_000,
        });
        const connectMs = round(performance.now() - t0);

        const selectMs: number[] = [];
        for (let i = 0; i < 5; i++) {
            const s = performance.now();
            await conn.query("SELECT 1");
            selectMs.push(round(performance.now() - s));
        }
        await conn.end();

        const sorted = [...selectMs].sort((a, b) => a - b);
        return Response.json({
            region: process.env.AWS_REGION ?? null, // Region der Function, falls von Netlify gesetzt
            coldStart: wasCold,
            connectMs,
            selectMs,
            medianSelectMs: sorted[Math.floor(sorted.length / 2)],
        });
    } catch (err) {
        // Nur Code und Meldung, keine Zugangsdaten
        const e = err as {code?: string; message?: string};
        return Response.json({error: e.code ?? "unbekannt", message: e.message}, {status: 500});
    }
});

export const config: Config = {path: "/api/db-ping"};
