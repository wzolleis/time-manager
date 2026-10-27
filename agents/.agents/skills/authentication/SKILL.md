---
name: authentication
description: Wie wird der Anwender angemeldet und wie werden Anwender und Passwörter verwaltet. Verwenden bei Arbeiten an Login, Logout, Passwörtern oder dem Anlegen von Anwendern.
---

## Definition der Anwender

Der Administrator kann neue Anwender anlegen. Der erste Administrator wird manuell angelegt,
siehe `authorization/SKILL.md`. Sein Passwort wird mit `node scripts/set-password.ts <email>` gesetzt,
die Rolle Administrator mit `node scripts/grant-admin.ts <email>`.
Beim Anlegen legt der Administrator das Passwort fest. In der Tabelle `users` wird nur
ein Hash des Passworts gespeichert, nie das Passwort selbst.

## Passwörter

- Hashing mit bcrypt (Kostenfaktor 12). Der Hash enthält den Salt, eine eigene Salt-Spalte ist nicht nötig.
- bcrypt berücksichtigt nur die ersten 72 Bytes. Längere Passwörter werden abgelehnt.
- Der Anwender kann sein Passwort selbst ändern. Dabei muss er das alte Passwort angeben.
- Der Administrator kann das Passwort eines Anwenders zurücksetzen und legt dabei ein neues fest.
  Das alte Passwort wird dafür nicht benötigt.
- Mindestens 8 Zeichen. Die Regeln stehen in `shared/auth.ts` und gelten im Frontend und im Backend.
- Der Hash verlässt nie das Backend: `users.ts` liest nur freigegebene Spalten, die Zod-Schemas in
  `shared/user.ts` kennen keinen `passwordHash`.

## Anmeldung

Die Anwendung hat eine eigene Benutzerverwaltung, es gibt keinen externen Anmeldedienst (kein OAuth).
Der Anwender meldet sich mit E-Mail und Passwort an (die E-Mail ist in `users` eindeutig) oder mit einem
Passkey (siehe unten).
Das Backend prüft das Passwort gegen den Hash in `users`.
Bei unbekannter E-Mail oder falschem Passwort kommt dieselbe Fehlermeldung, und die Antwort
dauert gleich lang, damit nicht erkennbar ist, welche E-Mails existieren.
Ein User ohne Passwort-Hash kann sich nicht anmelden, bis der Administrator ein Passwort setzt.

| Endpoint                        | Zweck                                                  |
|---------------------------------|--------------------------------------------------------|
| `POST /api/auth/login`          | Anmelden, setzt das Session-Cookie                     |
| `POST /api/auth/logout`         | Abmelden                                               |
| `GET /api/auth/me`              | Der angemeldete User, sonst `401`                      |
| `POST /api/auth/password`       | Eigenes Passwort ändern (`oldPassword`, `newPassword`) |
| `POST /api/auth/reset-password` | Admin setzt ein Passwort zurück (`userId`, `password`) |

Umgesetzt in `netlify/functions/auth.ts`.

## Passkeys

Statt mit E-Mail und Passwort kann sich der User mit einem Passkey (WebAuthn) anmelden. Das Passwort bleibt
bestehen. Beschreibung mit Regeln: `features/use-case/passkeys.md`.

- Bibliotheken `@simplewebauthn/server` (Netlify Functions) und `@simplewebauthn/browser` (Login-Seite, Seite
  „Passkeys“). Kein externer Anmeldedienst.
- Tabelle `passkeys` mit dem öffentlichen Schlüssel, nie dem privaten. Die Challenges stehen bis zur Prüfung in
  `passkey_challenges`, gelten 5 Minuten und nur einmal (`saveChallenge`, `consumeChallenge` in
  `netlify/functions/lib/passkey.ts`).
- Domain und Origin aus `PASSKEY_RP_ID` und `PASSKEY_ORIGIN`, ohne Variablen aus der URL der Anfrage
  (`relyingParty`). **In der Produktion beide setzen**, sonst ist ein Passkey an die Domain gebunden, unter der
  er eingetragen wurde, z. B. eine Deploy-Preview.
- User Verification ist Pflicht, Passkeys sind auffindbar (Resident Key): beim Anmelden ist keine E-Mail nötig.
- Nach der Prüfung legt `passkey-login` dieselbe Session an wie der Login mit Passwort (`createSession`).
- Passwortänderung lässt die Passkeys bestehen. Der Admin-Reset löscht sie mit den Sessions.

| Endpoint                                  | Zweck                                                   |
|-------------------------------------------|---------------------------------------------------------|
| `POST /api/auth/passkey-login-options`    | Optionen mit Challenge, ohne Session                    |
| `POST /api/auth/passkey-login`            | Antwort des Browsers prüfen, setzt das Session-Cookie   |
| `POST /api/auth/passkey-register-options` | Optionen mit Challenge für einen neuen Passkey          |
| `POST /api/auth/passkey-register`         | `{name, response}` prüfen und speichern                 |
| `GET /api/passkeys`                       | eigene Passkeys ohne Schlüssel                          |
| `DELETE /api/passkeys/:id`                | eigenen Passkey löschen                                 |

## Sessions

Netlify Functions sind zustandslos, deshalb werden Sessions in der Datenbank gespeichert (Tabelle `sessions`), nicht im
Arbeitsspeicher.

- Nach erfolgreichem Login erzeugt das Backend eine zufällige Session-ID (32 Bytes, kryptografisch sicher).
- In `sessions` werden der SHA-256-Hash der Session-ID, die User-ID und der Ablaufzeitpunkt gespeichert.
  Die Session-ID selbst steht nur im Cookie.
- Cookie: `HttpOnly`, `SameSite=Strict`, `Path=/`, über HTTPS zusätzlich `Secure`. Lokal (`netlify dev`, http) fehlt
  `Secure`,
  weil Safari solche Cookies auf `http://localhost` verwirft.
- Bei jedem API-Aufruf liest das Backend die Session über den Hash der Session-ID.
  Fehlt sie oder ist sie abgelaufen, antwortet es mit `401 Unauthorized`.
- Eine Session läuft nach 8 Stunden Inaktivität ab. Jeder gültige API-Aufruf verlängert sie wieder auf 8 Stunden.
- Die Prüfung erfolgt in den Netlify Functions über `withSession` aus `netlify/functions/lib/session.ts`,
  nicht in einer Edge Function (die läuft unter Deno und kann `mysql2` nicht verwenden).
  Jede neue Function wird mit `withSession(handler)` exportiert.
- Abgelaufene Sessions werden beim nächsten Login aus der Tabelle gelöscht.
- Der so ermittelte Anwender ist die Grundlage für die Rollenprüfung in `authorization/SKILL.md`.
  `withSession` prüft danach auch die Rolle und antwortet ohne sie mit `403 Forbidden`.

## Logout

- `POST /api/auth/logout` löscht die Session aus `sessions` und setzt das Cookie mit `Max-Age=0` zurück.
- Ändert der Anwender sein Passwort, werden alle seine anderen Sessions gelöscht. Die aktuelle bleibt bestehen.
- Setzt der Administrator ein Passwort zurück, werden alle Sessions und alle Passkeys dieses Anwenders gelöscht.

## Agent-Tokens

Ein Agent (z. B. Claude Code) meldet sich nicht mit Passwort und Cookie an, sondern mit einem persönlichen
API-Token im Header `Authorization: Bearer tm_…`. Beschreibung: `features/boundaries/mcp-token.md`.

- Tabelle `api_tokens`, aufgebaut wie `sessions`: gespeichert wird nur der SHA-256-Hash. Das Token
  (`tm_` + 32 zufällige Bytes als base64url) steht nur in der Antwort auf `POST /api/api-tokens`.
- Der User wählt beim Erzeugen die Gültigkeit (30 Tage, 90 Tage, 1 Jahr oder kein Ablauf,
  `expires_at` = `null`). Widerrufen löscht die Zeile.
- Geprüft wird mit `withToken` aus `netlify/functions/lib/api-token.ts`, analog zu `withSession`: ohne
  gültiges Token `401` mit `WWW-Authenticate: Bearer`, danach dieselbe Rollenprüfung. `withToken` liest
  kein Session-Cookie, und `withSession` kein Token. Ein Endpoint nimmt also genau eine der beiden
  Anmeldungen an. Gedacht ist `withToken` nur für `/api/mcp`.
- Passwortänderung und Reset lassen die Tokens bestehen. Wird der User gelöscht, verschwinden sie.

| Endpoint                           | Zweck                                                    |
|------------------------------------|----------------------------------------------------------|
| `GET /api/api-tokens`              | Eigene Tokens ohne Hash                                  |
| `POST /api/api-tokens`             | Token erzeugen (`name`, `expiresInDays`), einmalig `token` |
| `DELETE /api/api-tokens/:id`       | Eigenes Token widerrufen                                 |
| `GET /api/admin/api-tokens`        | Admin: Tokens aller User mit `userName`                  |
| `DELETE /api/admin/api-tokens/:id` | Admin: beliebiges Token widerrufen                       |

Umgesetzt in `netlify/functions/api-tokens.ts`.

## Frontend

- Der `UserProvider` fragt `GET /api/auth/me`. Ohne Session zeigt er die Login-Seite
  (`src/components/login/login-page.tsx`) statt der Anwendung.
- `useCurrentUser()` liefert immer den angemeldeten User, eine Auswahl anderer User gibt es nicht.
- Antwortet ein API-Aufruf mit `401`, setzt `src/query-client.ts` den Anmeldestatus zurück,
  und die Login-Seite erscheint.
- Beim Logout werden alle Daten aus dem Query-Cache und aus dem localStorage entfernt.
