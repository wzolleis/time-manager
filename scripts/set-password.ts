// scripts/set-password.ts
// Setzt das Passwort eines Users direkt in der Datenbank, z. B. für den ersten Administrator.
// Aufruf: node scripts/set-password.ts <email>   (das Passwort wird verdeckt abgefragt)
import "dotenv/config";
import bcrypt from "bcryptjs";
import mysql from "mysql2/promise";
import {stdin, stdout} from "node:process";

const COST = 12; // wie in netlify/functions/lib/password.ts
const MIN_LENGTH = 8;
const MAX_BYTES = 72;

const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
    console.error("Aufruf: node scripts/set-password.ts <email>");
    process.exit(2);
}

// Liest eine Zeile, ohne die Eingabe im Terminal anzuzeigen
function askHidden(prompt: string): Promise<string> {
    return new Promise((resolve) => {
        stdout.write(prompt);
        let input = "";
        stdin.setRawMode?.(true);
        stdin.resume();
        stdin.setEncoding("utf8");
        // Beim Einfügen kommen mehrere Zeichen auf einmal, deshalb Zeichen für Zeichen auswerten
        const onData = (chunk: string) => {
            for (const ch of chunk) {
                if (ch === "\r" || ch === "\n") {
                    stdin.setRawMode?.(false);
                    stdin.pause();
                    stdin.off("data", onData);
                    stdout.write("\n");
                    resolve(input);
                    return;
                }
                if (ch === "\u0003") process.exit(130); // Strg+C
                if (ch === "\u007f") input = input.slice(0, -1);
                else input += ch;
            }
        };
        stdin.on("data", onData);
    });
}

const password = await askHidden("Neues Passwort: ");
if (password.length < MIN_LENGTH || new TextEncoder().encode(password).length > MAX_BYTES) {
    console.error(`Das Passwort muss mindestens ${MIN_LENGTH} Zeichen und höchstens ${MAX_BYTES} Bytes haben`);
    process.exit(1);
}
if ((await askHidden("Wiederholen:    ")) !== password) {
    console.error("Die Passwörter stimmen nicht überein");
    process.exit(1);
}

const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

try {
    const hash = await bcrypt.hash(password, COST);
    const [result] = await conn.execute<mysql.ResultSetHeader>("UPDATE users SET password_hash = ? WHERE email = ?", [
        hash,
        email,
    ]);
    if (result.affectedRows === 0) {
        console.error(`Kein User mit der E-Mail ${email}`);
        process.exitCode = 1;
    } else {
        // Wie beim Reset durch den Admin: alle bestehenden Sessions enden
        await conn.execute("DELETE s FROM sessions s JOIN users u ON u.id = s.user_id WHERE u.email = ?", [email]);
        console.log(`Passwort für ${email} gesetzt`);
    }
} finally {
    await conn.end();
}
