// scripts/lib/env.ts
// Lädt die Zugangsdaten für Skripte und drizzle.config.ts: lokal aus .env.local, mit APP_ENV=production
// aus .env.production (features/boundaries/local-environment.md). Eine gesetzte Umgebungsvariable gewinnt.
// Wird statt import "dotenv/config" als erstes importiert.
import {existsSync} from "node:fs";
import {config} from "dotenv";

export const isProduction = process.env.APP_ENV === "production";
export const envFile = isProduction ? ".env.production" : ".env.local";

if (!existsSync(envFile)) {
    console.error(
        isProduction
            ? `${envFile} fehlt: die Zugangsdaten der Produktion dort eintragen`
            : `${envFile} fehlt: cp .env.local.example .env.local, Passwörter eintragen, npm run db:up`,
    );
    process.exit(2);
}
config({path: envFile, quiet: true});

/** Ziel ohne Passwort, z. B. "127.0.0.1:3307/time_manager" */
export const dbTarget = `${process.env.DB_HOST}:${process.env.DB_PORT ?? 3306}/${process.env.DB_NAME}`;

export const isLocalHost = (host: string | undefined): boolean => host === "127.0.0.1" || host === "localhost";

console.error(`Datenbank: ${dbTarget}${isProduction ? " (Produktion)" : ""}`);
