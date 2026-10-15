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
Der Anwender meldet sich mit E-Mail und Passwort an (die E-Mail ist in `users` eindeutig).
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
- Setzt der Administrator ein Passwort zurück, werden alle Sessions dieses Anwenders gelöscht.

## Frontend

- Der `UserProvider` fragt `GET /api/auth/me`. Ohne Session zeigt er die Login-Seite
  (`src/features/auth/pages/login-page.tsx`) statt der Anwendung.
- `useCurrentUser()` liefert immer den angemeldeten User, eine Auswahl anderer User gibt es nicht.
- Antwortet ein API-Aufruf mit `401`, setzt `src/query-client.ts` den Anmeldestatus zurück,
  und die Login-Seite erscheint.
- Beim Logout werden alle Daten aus dem Query-Cache und aus dem localStorage entfernt.
