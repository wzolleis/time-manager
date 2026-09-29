// netlify/functions/lib/db.ts
import {drizzle} from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "../../../db/schema";

// Modul-Scope: Bei "warmen" Aufrufen wird der Pool wiederverwendet
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectionLimit: 1, // Shared Hosting erlaubt oft nur wenige Verbindungen
});

export const db = drizzle(pool, {schema, mode: "default"});