// scripts/grant-admin.ts
// Gibt einem User die Rolle Administrator, z. B. für den ersten Administrator.
// Aufruf: node scripts/grant-admin.ts <email>
import "dotenv/config";
import mysql from "mysql2/promise";
import {ADMIN_ROLE_ID} from "../shared/role.ts";

const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
    console.error("Aufruf: node scripts/grant-admin.ts <email>");
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
    // INSERT IGNORE: ist die Rolle schon zugeordnet, bleibt alles wie es ist
    const [result] = await conn.execute<mysql.ResultSetHeader>(
        "INSERT IGNORE INTO user_roles (user_id, role_id) SELECT id, ? FROM users WHERE email = ?",
        [ADMIN_ROLE_ID, email],
    );
    const [found] = await conn.execute<mysql.RowDataPacket[]>("SELECT 1 FROM users WHERE email = ?", [email]);
    if (found.length === 0) {
        console.error(`Kein User mit der E-Mail ${email}`);
        process.exitCode = 1;
    } else if (result.affectedRows === 0) {
        console.log(`${email} ist bereits Administrator`);
    } else {
        console.log(`${email} ist jetzt Administrator`);
    }
} finally {
    await conn.end();
}
