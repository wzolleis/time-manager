import "dotenv/config";
import mysql from "mysql2/promise";

const c = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});
const [t] = await c.query("SHOW TABLES");
console.log((t as any[]).map((r) => Object.values(r)[0]).join(", "));
try {
    const [r] = await c.query("SELECT role, COUNT(*) n FROM user_roles GROUP BY role");
    console.log(r);
} catch (e) {
    console.log("user_roles:", (e as Error).message);
}
await c.end();
