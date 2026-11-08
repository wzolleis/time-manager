---
name: authorization-timemanager
description: Wie die Rollenprüfung im time-manager umgesetzt ist, Migrationen für endpoint_roles, withSession und lib/roles.ts, die Wiederholungen von Netlify bei 403, /api/mcp und die Daten eines Users. Ergänzt den Skill authorization. Verwenden bei Arbeiten an Rollen, Absicherung von Endpoints oder der Admin-Oberfläche im time-manager.
---

# Rollen im time-manager

Lade zuerst den Skill `authorization`. Hier steht nur, was im time-manager zusätzlich gilt.

## Datenbank und Bootstrap

- Feste IDs in `shared/role.ts` (`ADMIN_ROLE_ID`, `USER_ROLE_ID`).
- `POST /api/users` trägt die Rolle "User" in derselben Transaktion ein.
- Erster Administrator: `node scripts/grant-admin.ts <email>`.
- Letzter Administrator: `lockAdmins` aus `netlify/functions/lib/roles.ts` sperrt die Administrator-Zeilen.
- Dialog "Rollen" der Benutzerverwaltung: `GET /api/roles`, `GET`/`PUT /api/users/:id/roles`.

## endpoint_roles pflegen

Neue Einträge mit `npx drizzle-kit generate --custom --name <name>`, dann `INSERT`/`UPDATE`/`DELETE` in der
SQL-Datei (MySQL-Syntax mit Backticks). Startwerte in `db/migrations/0006_roles_seed.sql` (damals noch mit
Rollennamen, Umstellung auf IDs in 0007 und 0008).

Der Pfad ist das Muster aus der `config.path` der Netlify Function.

Vorhandene Einträge mit Rolle Administrator:

- Globale Feiertage: `POST /api/holidays`, `PATCH` und `DELETE /api/holidays/:id` (Migration
  `0012_holidays_roles.sql`). Die eigenen Feiertage unter `/api/users/:userId/holidays` haben keinen Eintrag,
  dort prüft `ensureAccess`.
- Agent-Tokens aller User: `GET /api/admin/api-tokens`, `DELETE /api/admin/api-tokens/:id` (Migration
  `0011_api_tokens_roles.sql`).
- Admin-Reset `POST /api/auth/reset-password`. `auth.ts` prüft die Rolle nur beim Reset, mit dem konkreten Pfad,
  weil `/api/auth/:action` auch Login, Logout, `/me` und die eigene Passwortänderung umfasst.

## Durchsetzung

`withSession` aus `netlify/functions/lib/session.ts` zusammen mit `netlify/functions/lib/roles.ts`.

Netlify wiederholt eine `403` wie eine `404` mit `.html`, `.htm`, `/index.html` und `/index.htm` und gibt die
Antwort der letzten Wiederholung zurück. Bei diesen Wiederholungen ist `context.params` leer, deshalb verwendet die
Prüfung nur den Pfad. `endpointPath` in `lib/roles.ts` entfernt die Endungen, damit auch die Wiederholungen mit
`403` beantwortet werden. Wer eine Rollenprüfung außerhalb von `withSession` baut (wie in `auth.ts`), muss das
auch beachten.

## Daten eines Users

- Pfade: `/api/users/:userId/time-entries`, `…/vacations`, `…/sick-leaves`, `…/holidays`, jeweils mit `/:id`.
- `ensureAccess(session.user.id, userId)` aus `netlify/functions/lib/roles.ts` wirft `ForbiddenError`.
- Ein fremder Datensatz ist „nicht gefunden“ mit `notFound()`, also 410.
- `isRoutePath` aus `lib/id.ts` lässt nur die Pfade aus `config.path` durch, auch in den Wiederholungen von
  Netlify (`…/vacations.html`), und `pathParams` liest `userId` und `id` daraus.

## /api/mcp

Beschreibung: `features/boundaries/mcp-enable.md`, Function `netlify/functions/mcp.ts`. Kein Eintrag in
`endpoint_roles`, exportiert mit `withToken`. Eine fremde Buchung ist „Buchung nicht gefunden“. Schreibende Tools
nutzen `lib/time-entries-store.ts` mit einem `authorize`, das nur den eigenen User zulässt.
