---
name: architecture-timemanager
description: Wie die Architektur im time-manager umgesetzt ist. Verzeichnisse des Backends, Views und Query Keys aller Aggregate, Pfade der API, Optimistic Write für Buchungen, Sonderfall Anmeldung und Tests gegen die Testdatenbank. Ergänzt den Skill architecture. Verwenden beim Planen und Umsetzen eines Use Case oder Change im time-manager.
---

# Architektur im time-manager

Lade zuerst den Skill `architecture`. Hier steht nur, was im time-manager zusätzlich gilt. Den Stack beschreibt
`CLAUDE.md`.

## Layout des Backends

```text
netlify/functions/      Ein File pro Aggregat mit den Endpoints unter /api/<aggregat>
└ lib/                  Session, Rollen, DB-Verbindung, RuleError
db/
├ schema.ts             Drizzle-Schema aller Tabellen
└ migrations/           Erzeugt mit drizzle-kit generate, angewendet mit npm run db:migrate
scripts/                Skripte für die Kommandozeile, z. B. grant-admin.ts, api-walkthrough.sh
```

Einzelheiten im Skill `backend-modules`.

## Imports

Die Aliase stehen in `tsconfig.app.json`. Für `netlify/functions` prüft zusätzlich `tsc` die Imports ohne Endung
(`allowImportingTsExtensions: false`). In `tsconfig.app.json` bleibt `allowImportingTsExtensions` erlaubt, wegen
der generierten Dateien.

## Beispiele aus dem Projekt

- Admin- und User-Seite in einem Feature: `src/features/holidays/components/holidays-page.tsx` und
  `admin-holidays-page.tsx`.
- Use Cases: `useShowDailyReport` (lesend, `src/features/reports/use-cases/`), `useAddVacation` (schreibend,
  `src/features/vacations/use-cases/`). Regeln wie `checkRange` und `findOverlap` in `shared/vacation-rules.ts`.
- Services: `dayTotals`, `countWorkdays`, Konstanten wie `VACATION_DAYS_PER_YEAR` und `DAILY_TARGET_MS`.
- Union für Zustände: `DayKind`.

## Views und Query Keys

| Aggregat           | View in `src/views/`                         | Query Keys                                       | invalidieren        |
|--------------------|----------------------------------------------|--------------------------------------------------|---------------------|
| Urlaube            | `vacations.ts`: `useVacations(userId)`       | `["vacations", userId]`                          | `["vacations"]`     |
| Krankmeldungen     | `sick-leaves.ts`: `useSickLeaves(userId)`    | `["sick-leaves", userId]`                        | `["sick-leaves"]`   |
| Überstunden        | `overtime.ts`: `useOvertime(userId)`         | `["overtime", userId]`                           | `["overtime"]`      |
| Einstellungen      | `user-settings.ts`: `useUserSettings(userId)` | `["user-settings", userId]`                     | `["user-settings"]` |
| Buchungen          | `time-entries.ts`: `useTimeEntries(userId)`  | `["time-entries", userId]`                       | `["time-entries"]`  |
| Projekte           | `projects.ts`: `useProjects()`               | `["projects"]`                                   | `["projects"]`      |
| Feiertage          | `holidays.ts`: `useHolidays(userId)`, `useGlobalHolidays()` | `["holidays", userId]`, `["holidays", "global"]` | `["holidays"]` |
| User               | noch keine View (siehe unten)                | `["users"]`                                      | `["users"]`         |
| Rollen             | noch keine View (siehe unten)                | `["roles"]`, `["users", id, "roles"]`            | `setQueryData` mit der Antwort |
| Agent-Tokens       | `api-tokens.ts`: `useApiTokens(userId)`, `useAllApiTokens()` | `["api-tokens", userId]`, `["api-tokens", "all"]` | `["api-tokens"]` |
| Passkeys           | `passkeys.ts`                                | `["passkeys", userId]`                           | `["passkeys"]`      |
| Backups            | `backups.ts`                                 | `["backups"]`                                    | `["backups"]`       |

Ein neues Aggregat wird hier eingetragen.

Abweichung im Bestand: User und Rollen rufen `useQuery` und `useMutation` noch direkt in
`src/features/users/components/` auf (`users.tsx`, `user-roles-dialog.tsx`, `user-actions.tsx`). Wird dort etwas
geändert, nach Rückfrage auf eine View in `src/views/` und Use Cases umstellen.

## Pfade der API

Daten eines Users unter `/api/users/:userId/<aggregat>`: Buchungen, Urlaube, Krankmeldungen, eigene Feiertage.
Globale Feiertage bleiben unter `/api/holidays`, `src/api/holidays.ts` wählt den Pfad mit `userId: null`.

## Optimistic Write für Buchungen

Stempeln, Nachtragen eines Zeitstempels, Ändern und Löschen einer Buchung schreiben den neuen Stand sofort in den
Cache. Die Optionen liefert `optimisticTimeEntries` aus `src/features/reports/time-entries-cache.ts`: `onMutate`
setzt den neuen Stand, `onError` stellt den alten wieder her und zeigt den Fehler als Toast (`notifyError` aus
`src/lib/notify.ts`), `onSettled` invalidiert `["time-entries"]` nach Erfolg und Fehler. Der Dialog schließt
direkt nach `mutate` und zeigt keinen Fehler. Eine neue Buchung hat bis zur Antwort eine vorläufige Id
(`isOptimistic`). Andere Aggregate nur nach Absprache (Skill `performance`).

## Anmelden und Abmelden

`src/api/auth.ts` und `ME_QUERY_KEY`. Beim Abmelden entfernt `clearUserData()` alle Daten, beim Anmelden
`removeQueries` in `login-page.tsx`.

## RuleError

`netlify/functions/lib/rule-error.ts`, im `catch` mit `ruleViolation(err)`.

## Tests

- Ausführen mit `npm run test:run`.
- Hilfen im Backend: `netlify/functions/lib/<name>.test.ts`.
- Endpoints mit Datenbank prüft `scripts/api-walkthrough.sh` gegen `npm run dev:test`: `netlify dev` auf Port 8889
  mit der Testdatenbank `time_manager_test`. Nie gegen die Produktion (`features/boundaries/local-environment.md`).
- shot braucht ein laufendes `netlify dev` mit Anmeldung.
