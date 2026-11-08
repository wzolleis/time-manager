---
name: shared-modules-timemanager
description: Die Dateien und Konventionen von shared/ im time-manager, erlaubte Imports (drizzle-zod, db/schema), Tage, Zeitzone und feste IDs. Ergänzt den Skill shared-modules. Verwenden beim Anlegen oder Ändern von Dateien in shared/ im time-manager.
---

# shared/ im time-manager

Lade zuerst den Skill `shared-modules`. Hier steht nur, was im time-manager zusätzlich gilt.

`shared/` wird vom Client (`src/`) und von den Netlify Functions (`netlify/functions/`) verwendet. Für `netlify/`,
`db/` und `scripts/` gilt der Skill `backend-modules`.

## Beispiele

| Art                         | Dateien                                                    |
|-----------------------------|------------------------------------------------------------|
| Schemas eines Aggregats     | `vacation.ts`, `user.ts`, `time-entry.ts`, `api-token.ts`  |
| Regeln eines Aggregats      | `vacation-rules.ts`, `sick-leave-rules.ts`, `time-rules.ts` |
| Auswertungen                | `time-report.ts`, `target-hours.ts`                        |
| Zeiträume ohne Fachlichkeit | `day-range.ts`, `week.ts`                                  |

Was nur der Server braucht, gehört nach `netlify/functions/lib/`.

## Imports

`drizzle-zod` und `db/schema` sind erlaubt, `db/schema` nur für die Tabellen, aus denen `drizzle-zod` die Schemas
erzeugt (`createSelectSchema(vacations)`). Hashes und Schlüssel werden mit `.omit(…)` entfernt, siehe
`api-token.ts` und `user.ts`.

## Konventionen

- `checkRange` in `vacation-rules.ts` ist das Vorbild für eine Regel. `RuleError` liegt in
  `netlify/functions/lib/rule-error.ts`.
- Ein `Day` entsteht nur über `DaySchema`, `parseDay`, `isValidDay`, die Helfer in `day-range.ts` und `week.ts`
  oder mit `localDay` in `time-rules.ts`.
- Die Zeitzone ist `TZ` aus `day-range.ts` (Europe/Berlin).
- Feste IDs: `ADMIN_ROLE_ID` in `role.ts`, `SOLL_SETTING_ID` in `user-setting.ts`.
