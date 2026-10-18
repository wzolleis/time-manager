// scripts/seed-local.ts
// Legt in einer leeren lokalen Datenbank den ersten Administrator an, mit E-Mail und Passwort aus
// scripts/.env.local (API_USER, API_PASSWORD), damit Anmeldung und API-Walkthrough sofort gehen.
// Nur gegen die lokale Datenbank, auch mit APP_ENV=production.
// Aufruf: npm run db:seed   (Testdatenbank: DB_NAME=time_manager_test npm run db:seed)
import {dbTarget, isLocalHost} from "./lib/env.ts";
import {randomUUID} from "node:crypto";
import {existsSync, readFileSync} from "node:fs";
import bcrypt from "bcryptjs";
import {parse} from "dotenv";
import mysql from "mysql2/promise";
import {ADMIN_ROLE_ID, USER_ROLE_ID} from "../shared/role.ts";

const COST = 12; // wie in netlify/functions/lib/password.ts
const CREDENTIALS = "scripts/.env.local";

if (!isLocalHost(process.env.DB_HOST)) {
    console.error(`Abbruch: ${dbTarget} ist keine lokale Datenbank, der Seed schreibt nur nach 127.0.0.1/localhost`);
    process.exit(1);
}

const fromFile = existsSync(CREDENTIALS) ? parse(readFileSync(CREDENTIALS)) : {};
const email = (process.env.API_USER ?? fromFile.API_USER ?? "").trim().toLowerCase();
const password = process.env.API_PASSWORD ?? fromFile.API_PASSWORD ?? "";
if (!email || !password) {
    console.error(`API_USER und API_PASSWORD fehlen: in ${CREDENTIALS} eintragen (Zeilen KEY=VALUE)`);
    process.exit(2);
}

const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

try {
    const [found] = await conn.execute<mysql.RowDataPacket[]>("SELECT id FROM users WHERE email = ?", [email]);
    if (found.length > 0) {
        console.log(`${email} gibt es schon, nichts geändert`);
    } else {
        const id = randomUUID();
        const hash = await bcrypt.hash(password, COST);
        await conn.beginTransaction();
        await conn.execute("INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)", [
            id,
            "Administrator",
            email,
            hash,
        ]);
        await conn.execute("INSERT INTO user_roles (user_id, role_id) VALUES (?, ?), (?, ?)", [
            id,
            USER_ROLE_ID,
            id,
            ADMIN_ROLE_ID,
        ]);
        await conn.commit();
        console.log(`${email} angelegt, mit den Rollen User und Administrator`);
    }
} catch (err) {
    await conn.rollback().catch(() => {});
    console.error("Seed fehlgeschlagen:", err);
    process.exitCode = 1;
} finally {
    await conn.end();
}
