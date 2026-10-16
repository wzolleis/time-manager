// scripts/migrate.ts
import "dotenv/config";
import {drizzle} from "drizzle-orm/mysql2";
import {migrate} from "drizzle-orm/mysql2/migrator";
import mysql from "mysql2/promise";

const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

try {
    await migrate(drizzle(conn), {migrationsFolder: "db/migrations"});
    console.log("Migrationen angewendet");
} catch (err) {
    console.error("Migration fehlgeschlagen:", err);
    process.exitCode = 1;
} finally {
    await conn.end();
}
