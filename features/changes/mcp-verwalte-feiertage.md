---
name: mcp-verwalte-feiertage
description: Der MCP-Server bekommt Tools, mit denen der User über einen Agent die für ihn geltenden Feiertage liest und seine eigenen Feiertage hinzufügt, ändert und löscht.
type: change
changes: mcp-enable
epics: mcp, feiertage
---

# Feiertage über MCP verwalten

„Der User verwaltet seine Feiertage mit einem Agent.“

Der User liest über einen Agent die Liste der Feiertage, die für ihn gelten, und fügt eigene Feiertage
hinzu, ändert und löscht sie. Wie bei allen MCP-Tools gilt das nur für den User, dem das API-Token gehört.

Beispiele:

- „Füge den 8.8.2026 als Feiertag ‚Friedensfest Augsburg‘ hinzu.“
- „Welche Feiertage habe ich 2026?“
- „Benenne den Feiertag am 8.8.2026 in ‚Hohes Friedensfest‘ um.“
- „Lösche den Feiertag am 8.8.2026.“

## Tools

| Tool             | Parameter                                   | Ergebnis                                   |
|------------------|---------------------------------------------|--------------------------------------------|
| `list_holidays`  | optional `from`, `to` (JJJJ-MM-TT)          | globale und eigene Feiertage, nach Datum   |
| `add_holiday`    | `date` (JJJJ-MM-TT), `name` (1–100 Zeichen) | der angelegte Feiertag                     |
| `change_holiday` | `id`, optional `date` und `name`            | der geänderte Feiertag                     |
| `delete_holiday` | `id`                                        | Bestätigung                                |

Die Liste zeigt bei jedem Feiertag, ob er global oder eigener ist, und seine `id`. Der Agent rechnet
Datumsangaben wie „8.8.2026“ selbst in JJJJ-MM-TT um.

## Regeln

- Ein neuer Feiertag gehört immer dem User des API-Tokens (`userId` = Token-User). Globale Feiertage
  (`userId` = null) legt das MCP nie an, auch nicht für einen Administrator.
- Ändern und löschen darf der User nur eigene Feiertage. Ein globaler oder fremder Feiertag wird wie ein
  nicht vorhandener behandelt. Die MCP-Tools greifen direkt auf die Datenbank zu und nicht über die
  REST-API, deshalb prüfen sie den Besitzer selbst, nach derselben Regel wie `authorize` in
  `netlify/functions/holidays.ts`. Globale Feiertage pflegt nur ein Administrator in der Oberfläche.
- Datum und Name prüft `checkHoliday` in `shared/holiday-rules.ts`.
- Gibt es am selben Tag schon einen globalen oder eigenen Feiertag (`findHolidayClash` in
  `shared/holiday-rules.ts`), lehnt das Tool ab und gibt `holidayClashMessage` als Fehler zurück.
- Fehler meldet das Tool wie die übrigen MCP-Tools (`run` in `netlify/functions/lib/mcp-tools/view.ts`).

## Code

Für Feiertage gibt es noch keine Use-Case-Beschreibung. Bestehender Code:

- Schemas `HolidayCreateSchema` und `HolidayUpdateSchema` in `shared/holiday.ts`
- Regeln in `shared/holiday-rules.ts`
- REST-API in `netlify/functions/holidays.ts`, Oberfläche in `src/features/holidays/`

Die Tools kommen in eine neue Datei `netlify/functions/lib/mcp-tools/holidays.ts` und werden in
`netlify/functions/lib/mcp-tools/index.ts` registriert, wie `time-entries.ts` und `reports.ts`.

## Fertig, wenn

- Tests für jedes Tool: Erfolg, Konflikt am selben Tag, ungültiges Datum, Ändern oder Löschen eines
  globalen oder fremden Feiertags.
- Die Tool-Liste in `features/boundaries/mcp-enable.md` und im README ist ergänzt.

Geändert wird nach dem Skill `architecture` (`../../agents/.agents/skills/architecture`), zuerst
`../../agents/.agents/skills/architecture/use-case.md` lesen.
