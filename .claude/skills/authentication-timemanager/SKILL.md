---
name: authentication-timemanager
description: Wie die Anmeldung im time-manager umgesetzt ist, Endpoints, Tabellen, Skripte, Passkeys, Sessions in Netlify Functions und Agent-Tokens (tm_). Ergänzt den Skill authentication. Verwenden bei Arbeiten an Login, Logout, Passwörtern, Passkeys, Tokens oder dem Anlegen von Anwendern im time-manager.
---

# Anmeldung im time-manager

Lade zuerst den Skill `authentication`. Hier steht nur, was im time-manager zusätzlich gilt.

## Anwender und Passwörter

- Erster Administrator: Passwort mit `node scripts/set-password.ts <email>`, Rolle mit
  `node scripts/grant-admin.ts <email>`.
- Tabelle `users`, die E-Mail ist dort eindeutig. Passwort-Regeln in `shared/auth.ts`.
- `users.ts` liest nur freigegebene Spalten, die Zod-Schemas in `shared/user.ts` kennen keinen `passwordHash`.

## Endpoints

| Endpoint                                  | Zweck                                                   |
|-------------------------------------------|---------------------------------------------------------|
| `POST /api/auth/login`                    | Anmelden, setzt das Session-Cookie                      |
| `POST /api/auth/logout`                   | Abmelden                                                |
| `GET /api/auth/me`                        | Der angemeldete User, sonst `401`                       |
| `POST /api/auth/password`                 | Eigenes Passwort ändern (`oldPassword`, `newPassword`)  |
| `POST /api/auth/reset-password`           | Admin setzt ein Passwort zurück (`userId`, `password`)  |
| `POST /api/auth/passkey-login-options`    | Optionen mit Challenge, ohne Session                    |
| `POST /api/auth/passkey-login`            | Antwort des Browsers prüfen, setzt das Session-Cookie   |
| `POST /api/auth/passkey-register-options` | Optionen mit Challenge für einen neuen Passkey          |
| `POST /api/auth/passkey-register`         | `{name, response}` prüfen und speichern                 |
| `GET /api/passkeys`                       | eigene Passkeys ohne Schlüssel                          |
| `DELETE /api/passkeys/:id`                | eigenen Passkey löschen                                 |

Umgesetzt in `netlify/functions/auth.ts` und `netlify/functions/passkeys.ts`.

## Passkeys

Beschreibung mit Regeln: `features/use-case/passkeys.md`.

- Tabelle `passkeys`, Challenges in `passkey_challenges` (`saveChallenge`, `consumeChallenge` in
  `netlify/functions/lib/passkey.ts`).
- Domain und Origin aus `PASSKEY_RP_ID` und `PASSKEY_ORIGIN` (`relyingParty`). In der Produktion beide setzen,
  sonst ist ein Passkey an eine Deploy-Preview gebunden.
- `passkey-login` legt die Session mit `createSession` an.

## Sessions

- Tabelle `sessions`.
- Lokal (`netlify dev`, http) fehlt `Secure` am Cookie.
- Geprüft wird mit `withSession` aus `netlify/functions/lib/session.ts`, nicht in einer Edge Function (die läuft
  unter Deno und kann `mysql2` nicht verwenden). Jede neue Function wird mit `withSession(handler)` exportiert.

## Agent-Tokens

Beschreibung: `features/boundaries/mcp-token.md`.

- Tabelle `api_tokens`, Präfix `tm_`. Gültigkeit 30 Tage, 90 Tage, 1 Jahr oder kein Ablauf (`expires_at` = `null`).
- Geprüft wird mit `withToken` aus `netlify/functions/lib/api-token.ts`, gedacht nur für `/api/mcp`.

| Endpoint                           | Zweck                                                    |
|------------------------------------|----------------------------------------------------------|
| `GET /api/api-tokens`              | Eigene Tokens ohne Hash                                  |
| `POST /api/api-tokens`             | Token erzeugen (`name`, `expiresInDays`), einmalig `token` |
| `DELETE /api/api-tokens/:id`       | Eigenes Token widerrufen                                 |
| `GET /api/admin/api-tokens`        | Admin: Tokens aller User mit `userName`                  |
| `DELETE /api/admin/api-tokens/:id` | Admin: beliebiges Token widerrufen                       |

Umgesetzt in `netlify/functions/api-tokens.ts`.

## Frontend

- Login-Seite: `src/components/login/login-page.tsx`.
