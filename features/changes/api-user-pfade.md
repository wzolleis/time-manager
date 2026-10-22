---
name: api-user-pfade
description: Die REST-API adressiert Daten eines Users über den Pfad /api/users/:userId/… statt über ?userId= und userId im Body. Betrifft Buchungen, Urlaube, Krankmeldungen und eigene Feiertage; globale Feiertage bleiben unter /api/holidays und sind über endpoint_roles nur für Administratoren änderbar.
type: change
changes: today-report, monthly-report, time-stamp, sick-leave, holiday
epics: api, berechtigungen
state: resolved
---

# Daten eines Users über den Pfad adressieren

Heute steht der User, dem Daten gehören, in der Query (`GET /api/vacations?userId=…`) oder im Body
(`POST /api/vacations` mit `userId`). Bei Feiertagen bedeutet `userId: null` im Body „für alle User“.
Künftig steht der User im Pfad, wie schon bei `/api/users/:id/roles`:

| Heute                                         | Künftig                                          |
|-----------------------------------------------|--------------------------------------------------|
| `GET /api/time-entries?userId=U`              | `GET /api/users/U/time-entries`                  |
| `POST /api/time-entries` mit `userId: U`      | `POST /api/users/U/time-entries`                 |
| `PATCH`/`DELETE /api/time-entries/:id`        | `PATCH`/`DELETE /api/users/U/time-entries/:id`   |
| dasselbe für `vacations` und `sick-leaves`    | dasselbe unter `/api/users/U/…`                  |
| `GET /api/holidays?userId=U`                  | `GET /api/users/U/holidays` (globale und eigene) |
| `POST /api/holidays` mit `userId: U`          | `POST /api/users/U/holidays`                     |
| `PATCH`/`DELETE /api/holidays/:id` (eigener)  | `PATCH`/`DELETE /api/users/U/holidays/:id`       |
| `GET /api/holidays`                           | unverändert: nur globale Feiertage               |
| `POST /api/holidays` mit `userId: null`       | `POST /api/holidays` ohne `userId`               |
| `PATCH`/`DELETE /api/holidays/:id` (globaler) | unverändert                                      |

## Warum

- Der Pfad sagt, wem die Daten gehören. Ein Sonderwert wie `userId: null` im Body entfällt, und ein
  vergessenes Feld kann nicht mehr aus Versehen einen globalen Feiertag anlegen.
- Globale Feiertage lassen sich über `endpoint_roles` sperren statt im Code: `POST /api/holidays` sowie
  `PATCH` und `DELETE /api/holidays/:id` bekommen die Rolle Administrator. Die Funktion `authorize` in
  `netlify/functions/holidays.ts` entfällt dann.
- Die Rechte auf User-Daten prüft jede Function einheitlich mit
  `ensureAccess(session.user.id, userId)` aus dem Pfad: der User selbst oder ein Administrator.

## Regeln

- Ein Datensatz unter `/api/users/U/…/:id`, der nicht U gehört, wird mit 404 beantwortet, nicht mit 403.
  So verrät die API nicht, dass es ihn gibt.
- Die Create-Schemas (`VacationCreateSchema`, `SickLeaveCreateSchema`, `TimeEntryCreateSchema`,
  `HolidayCreateSchema`) enthalten kein `userId` mehr. Die Function setzt es aus dem Pfad.
- `GET /api/users/U/holidays` liefert wie heute `GET /api/holidays?userId=U` die globalen und die eigenen
  Feiertage, damit Berichte und die Feiertagsliste mit einer Abfrage auskommen.
- Die Wiederholungen von Netlify (`…/time-entries.html`) müssen auch für die neuen Pfade auf den Pfad
  der Function abgebildet werden (`stripRetrySuffix`, `endpointPath`, `isApiPath` in
  `netlify/functions/lib/`).
- Die alten Pfade werden entfernt, nicht parallel weiter betrieben. Die Anwendung ist der einzige
  Aufrufer der REST-API; die MCP-Tools greifen direkt auf die Datenbank zu und sind nicht betroffen.

## Betroffener Code

- Functions: `netlify/functions/time-entries.ts`, `vacations.ts`, `sick-leaves.ts`, `holidays.ts`
  (jeweils `config.path`, `ListQuerySchema`, Rechteprüfung)
- Pfad-Hilfen und ihre Tests: `netlify/functions/lib/id.ts`, `roles.ts`, `id.test.ts`, `roles.test.ts`
- Schemas in `shared/`: `time-entry.ts`, `vacation.ts`, `sick-leave.ts`, `holiday.ts` und ihre Tests
- Neue Migration mit den `endpoint_roles` für globale Feiertage (`db/migrations/`)
- Repositories in `src/api/` und Views in `src/views/` für alle vier Ressourcen, die Use Cases in
  `src/features/*/use-cases/` und die Komponenten-Tests mit gemockten Pfaden
- `scripts/api-walkthrough.sh`, `eslint.config.js`
- Dokumentation: Skills `architecture` (`SKILL.md`, `repository.md`, `views.md`) und `authorization`,
  `features/boundaries/local-environment.md`, `features/use-case/sick-leave.md`,
  `features/use-case/holiday.md` (Abschnitt „Schnittstelle“)

## Fertig, wenn

- Keine Datei verwendet mehr `?userId=` oder `userId` im Body für diese vier Ressourcen.
- Tests für die Rechte: eigener User erlaubt, fremder User 403, Administrator erlaubt, Datensatz eines
  anderen Users unter dem eigenen Pfad 404, `POST /api/holidays` als User 403.
- `npx tsc --noEmit -p tsconfig.netlify.json`, die App-Typprüfung und `npx vitest run` laufen durch.
- `scripts/api-walkthrough.sh` läuft lokal durch.

Geändert wird nach dem Skill `architecture` (`../../agents/.agents/skills/architecture`), zuerst
`../../agents/.agents/skills/architecture/use-case.md` lesen. Für die Rechte gilt der Skill `authorization`.
