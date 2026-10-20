---
name: holiday
description: Beschreibt die Use Cases zu Feiertagen. Der Administrator pflegt die Feiertage für alle User, jeder User trägt zusätzlich eigene Feiertage ein, ändert und löscht sie. An einem Feiertag ist das Soll 0, im Urlaub verbraucht er keinen Urlaubstag.
type: story
epics: feiertage
---

# Feiertage

„Der User sieht die Feiertage, die für ihn gelten.“

Es gibt zwei Arten von Feiertagen:

- **Globale Feiertage** gelten für alle User, z. B. „Tag der Deutschen Einheit“. Sie pflegt der
  Administrator auf der Seite „Feiertage“ im Admin-Bereich.
- **Eigene Feiertage** gelten nur für einen User, z. B. ein regionaler Feiertag wie das „Friedensfest
  Augsburg“. Der User trägt sie auf seiner Seite „Feiertage“ ein, ändert und löscht sie. Dort sieht er
  auch die globalen Feiertage, kann sie aber nicht ändern.

Der Use Case ist umgesetzt. Diese Beschreibung hält fest, wie er sich verhält, damit Änderungen daran die
Regeln nicht verletzen. Code:

- Seiten `../../src/features/holidays/components/holidays-page.tsx` (User) und
  `../../src/features/holidays/components/admin-holidays-page.tsx` (Administrator), Routen
  `../../src/routes/user/holidays.tsx` und `../../src/routes/admin/holidays.tsx`
- Komponenten `../../src/features/holidays/components/` (`holiday-list.tsx`, `holiday-dialog.tsx`,
  `holiday-actions.tsx`)
- Use Cases `../../src/features/holidays/use-cases/`
- View `../../src/views/holidays.ts`, Repository `../../src/api/holidays.ts`
- Services `../../shared/holiday-rules.ts`, Schema `../../shared/holiday.ts`, Function
  `../../netlify/functions/holidays.ts`

Geändert wird nach dem Skill `architecture` (`../../agents/.agents/skills/architecture`), zuerst
`../../agents/.agents/skills/architecture/use-case.md` lesen.

## Use Cases

| Use Case                                              | Hook                                     |
|-------------------------------------------------------|------------------------------------------|
| Der User sieht die Feiertage, die für ihn gelten.     | `useShowHolidays("user", year)`          |
| Der Administrator sieht die Feiertage für alle.       | `useShowHolidays("global", year)`        |
| Der User trägt einen eigenen Feiertag ein.            | `useAddHoliday` mit `userId` des Users   |
| Der Administrator trägt einen Feiertag für alle ein.  | `useAddHoliday` mit `userId: null`       |
| Ein Feiertag wird geändert (Datum oder Name).         | `useChangeHoliday`                       |
| Ein Feiertag wird gelöscht.                           | `useDeleteHoliday`                       |

Feiertage wirken außerdem auf andere Use Cases:

- **Berichte:** Tages-, Wochen- und Monatsbericht rechnen einen Feiertag mit Soll 0 (Regel 6). Der
  Tagesbericht zeigt den Namen des Feiertags (`holidayName` in `../../shared/time-report.ts`).
- **Urlaub und Krankmeldung:** Ein Feiertag zählt nicht als Urlaubs- oder Krankheitstag (Regel 7).

## Daten

| Feld     | Typ                | Inhalt                                            |
|----------|--------------------|---------------------------------------------------|
| `id`     | UUID               |                                                   |
| `userId` | UUID oder `null`   | `null` = gilt für alle, sonst nur für diesen User |
| `date`   | Tag `JJJJ-MM-TT`   | der Feiertag                                      |
| `name`   | Text, 1–100        | z. B. „Allerheiligen“, Leerzeichen am Rand fallen weg |

Tabelle `holidays`, im Code `Holiday`. Ein Feiertag ist immer genau ein Tag.

## Regeln

1. **Gültige Eingabe** (`checkHoliday`): ein gültiges Datum und ein Name, der nicht leer ist.
2. **Höchstens ein globaler Feiertag pro Tag** und **höchstens ein eigener Feiertag pro User und Tag**
   (`findHolidayClash`). Beim Ändern wird der Feiertag nicht mit sich selbst verglichen.
3. **Kein eigener Feiertag an einem globalen.** Er wäre doppelt und wird abgelehnt. Meldung
   (`holidayClashMessage`): „Am 03.10.2026 ist bereits der Feiertag „Tag der Deutschen Einheit“ für
   alle eingetragen“.
4. **Ein globaler Feiertag an einem Tag, den ein User schon selbst eingetragen hat, ist erlaubt.** Der
   Administrator muss nicht die eigenen Feiertage aller User kennen. Für den User zählt der Tag weiter
   einmal als Feiertag.
5. **Global bleibt global.** Beim Ändern lassen sich nur Datum und Name ändern, nicht `userId`
   (`HolidayUpdateSchema`). Aus einem eigenen Feiertag wird kein globaler und umgekehrt.
6. **Soll 0.** `dayKind` liefert `"holiday"`, `targetMs` ist dann 0. Reihenfolge:
   Wochenende → vor Beginn der Zeiterfassung → **Feiertag** → krank → Urlaub → Arbeitstag. Ein Feiertag
   am Wochenende ändert das Soll also nicht; der Dialog weist darauf hin. Buchungen an einem Feiertag
   zählen normal als Arbeitszeit.
7. **Kein Urlaubs- oder Krankheitstag.** `countWorkdays` und `countVacationDays` in
   `../../shared/vacation-rules.ts` zählen Feiertage nicht mit.
8. **Rechte** (geprüft in `../../netlify/functions/holidays.ts`, Skill `authorization`):
   - Globale Feiertage lesen darf jeder, anlegen, ändern und löschen nur ein Administrator.
   - Eigene Feiertage liest, legt an, ändert und löscht der User selbst oder ein Administrator.
   - Ohne Recht antwortet der Server mit 403.
9. **Löschen ist endgültig.** Der Bestätigungsdialog sagt bei einem globalen Feiertag, dass er danach
   bei allen Usern fehlt.

## Schnittstelle

| Aufruf                                 | Ergebnis                                        |
|----------------------------------------|-------------------------------------------------|
| `GET /api/holidays`                    | nur die globalen Feiertage, nach Datum          |
| `GET /api/holidays?userId=U`           | globale und eigene Feiertage von U, nach Datum  |
| `POST /api/holidays`                   | `{userId, date, name}`, `userId` ist Pflicht (`null` = global) |
| `PATCH /api/holidays/:id`              | `{date?, name?}`                                |
| `DELETE /api/holidays/:id`             | 204                                             |

Ein Konflikt nach Regel 2 oder 3 ergibt 422 mit der Meldung aus `holidayClashMessage`. Geplante Änderung
der Pfade: `../changes/api-user-pfade.md`.

## Tests

- `../../shared/holiday-rules.test.ts`: Regeln 1 bis 4
- `../../shared/holiday.test.ts`: Schema, `userId` beim Anlegen Pflicht, beim Ändern nicht änderbar (Regel 5)
- `../../shared/target-hours.test.ts` und `../../shared/vacation-rules.test.ts`: Regeln 6 und 7
- `../../src/features/holidays/components/holidays.test.tsx`: User sieht globale und eigene, ändert nur
  eigene; Administrator sieht und ändert nur globale
- Für die Rechte (Regel 8) gibt es noch keinen Test.
