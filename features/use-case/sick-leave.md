---
name: sick-leave
description: Beschreibt die Use Cases zur Krankmeldung. Der User trägt Krankheitstage ein, ändert und löscht sie und sieht sie im Bericht „Krankmeldungen“. Krankheitstage haben Soll 0 und keine Buchungen.
---

# Krankmeldung

„Der User trägt eine Krankmeldung ein.“

Ist der User krank, trägt er einen Tag oder einen Zeitraum als Krankmeldung ein. Krankheitstage haben
kein Soll und keine Buchungen. Alle Krankmeldungen eines Jahres sieht er im Bericht „Krankmeldungen“,
dort legt er sie auch an, ändert und löscht sie.

Vorbild ist der Urlaub. Eine eigene Beschreibung gibt es dafür nicht, nur den Code:

- Seite `src/features/reports/components/report-vacations-page.tsx`, Route `src/routes/user/reports/vacations.tsx`
- Komponenten `src/features/vacations/components/` (`report-vacations.tsx`, `vacation-dialog.tsx`, `vacation-actions.tsx`)
- Use Cases `src/features/vacations/use-cases/`
- Services `shared/vacation-rules.ts`, Schema `shared/vacation.ts`, Function `netlify/functions/vacations.ts`

Umgesetzt wird nach dem Skill `architecture` (`agents/.agents/skills/architecture`), zuerst `use-case.md` lesen.

## Use Cases

| Use Case                                    | Hook                  |
|---------------------------------------------|-----------------------|
| Der User sieht seine Krankmeldungen.        | `useShowSickLeaves`   |
| Der User trägt eine Krankmeldung ein.       | `useAddSickLeave`     |
| Der User ändert eine Krankmeldung.          | `useChangeSickLeave`  |
| Der User löscht eine Krankmeldung.          | `useDeleteSickLeave`  |

Dazu kommen Änderungen an vorhandenen Use Cases:

- **Berichte:** Tages-, Wochen- und Monatsbericht rechnen Krankheitstage mit Soll 0 (Regel 5).
- **Urlaub:** Ein Krankheitstag im Urlaub ist kein Urlaubstag (Regel 6).
- **Zeiterfassung:** An einem Krankheitstag kann man nicht buchen (Regel 7).

## Daten

Eine Krankmeldung ist ein Zeitraum ganzer Tage, wie ein Urlaub:

| Feld        | Typ                     | Inhalt                                               |
|-------------|-------------------------|------------------------------------------------------|
| `id`        | UUID                    |                                                      |
| `userId`    | UUID                    | der kranke User                                      |
| `startDate` | Tag `JJJJ-MM-TT`        | erster Krankheitstag                                 |
| `endDate`   | Tag `JJJJ-MM-TT`        | letzter Krankheitstag, inklusive                     |
| `note`      | Text, optional, max. 500 | Notiz des Users, z. B. „Attest liegt vor“          |

Tabelle `sick_leaves`, im Code `SickLeave`, wie `vacations` / `Vacation`.

## Regeln

1. **Nur ganze Tage.** Es gibt keine halben Krankheitstage. Ein einzelner Tag ist ein Zeitraum mit
   Beginn = Ende.
2. **Gültiger Zeitraum** wie beim Urlaub (`checkRange`): gültige Daten, Ende nicht vor dem Beginn,
   höchstens 366 Kalendertage.
3. **Keine Überschneidung** mit einer anderen Krankmeldung desselben Users (wie `findOverlap`). Meldung:
   „Überschneidet sich mit der Krankmeldung vom 12.10.2026 bis 14.10.2026“. Beim Ändern wird die
   Krankmeldung nicht mit sich selbst verglichen.
4. **Krankheitstage zählen** als Arbeitstage im Zeitraum, also ohne Wochenenden und Feiertage, wie
   Urlaubstage (`countWorkdays`). Im Jahr zählt nur der Teil des Zeitraums, der im Jahr liegt (wie
   `workdaysInYear`).
5. **Soll 0 in allen Berichten.** `dayKind` bekommt die Art `"sick"`. Reihenfolge:
   Wochenende → vor Beginn der Zeiterfassung → Feiertag → **krank** → Urlaub → Arbeitstag.
   `targetMs` ist an Krankheitstagen 0. Der Tagesbericht zeigt beim Soll den Hinweis „krank“
   (`day-kind-label.ts`). Wochen- und Monatsbericht zeigen Krankheit nur über das Soll.
6. **Krankheit geht vor Urlaub.** Ein Krankheitstag im Urlaub verbraucht keinen Urlaubstag (§ 9 BUrlG).
   Der Urlaub bleibt eingetragen, aber `workdaysInYear`, `vacationBalance` und `checkYearLimit`
   zählen Krankheitstage nicht mit. Eine Krankmeldung darf sich also mit einem Urlaub überschneiden.
7. **Keine Buchungen an Krankheitstagen.**
   - Beim Eintragen oder Ändern einer Krankmeldung: Gibt es im Zeitraum schon Buchungen (Kommen oder
     Gehen, maßgeblich ist der Tag der Buchung wie bei `localDay`), fragt der Dialog nach, z. B.
     „Im Zeitraum gibt es 4 Buchungen. Sie werden gelöscht.“ mit „Löschen und speichern“ und
     „Abbrechen“. Erst nach der Bestätigung wird gespeichert. Krankmeldung und Löschen der Buchungen
     passieren auf dem Server in **einer** Transaktion.
   - Beim Stempeln, Nachtragen und Ändern einer Buchung: Liegt der Tag der Buchung in einer
     Krankmeldung, wird die Buchung abgelehnt. Meldung: „Am 14.10.2026 bist du krankgemeldet“.
   - Löscht oder verkürzt der User eine Krankmeldung, kommen gelöschte Buchungen nicht zurück.
8. **Vor Beginn der Zeiterfassung** darf man Krankmeldungen eintragen, das Soll ist dort ohnehin 0.
   Krankmeldungen in der Zukunft sind erlaubt, z. B. für eine geplante Operation.

## Beispiele

Feiertage im Beispiel: keine, zur Vereinfachung auch nicht Neujahr.

| Krankmeldung                     | Kalendertage | Krankheitstage | Grund                         |
|----------------------------------|--------------|----------------|-------------------------------|
| Mi 14.10.2026                    | 1            | 1              |                               |
| Mi 14.10.2026 – Di 20.10.2026    | 7            | 5              | Sa 17. und So 18. zählen nicht |
| Sa 17.10.2026 – So 18.10.2026    | 2            | 0              | nur Wochenende                |
| Mo 28.12.2026 – Fr 08.01.2027    | 12           | 10             | 2026: 4, 2027: 6 (Regel 4)    |

**Krankheit im Urlaub:** Urlaub Mo 12.10. – Fr 23.10.2026 (10 Urlaubstage), krank Mi 14.10. – Fr 16.10.2026.
Verbraucht werden 7 Urlaubstage, im Bericht „Krankmeldungen“ stehen 3 Krankheitstage.

**Buchungen im Zeitraum:** Am Mi 14.10.2026 gibt es Kommen 08:00 und Gehen 12:00. Der User trägt eine
Krankmeldung für den 14.10. ein. Der Dialog fragt „Im Zeitraum gibt es 2 Buchungen. Sie werden
gelöscht.“ Nach „Löschen und speichern“ ist der Tag krank, die beiden Buchungen sind weg, das Soll ist 0.

## Bedienung

Alles auf einer Seite unter den Berichten, aufgebaut wie der Bericht „Urlaub“ (`report-vacations.tsx`).

- **Menü:** Eintrag „Krankmeldungen“ nach `reports-vacations`, Route `/user/reports/sick-leaves`.
- **Kopf:** Überschrift „Krankmeldungen“. Darunter Name des Users, Jahr und Zahl der Einträge, z. B.
  „Jack · 2026 · 3 Einträge“. Rechts der Button „Krankmeldung eintragen“.
- **Jahr wählen** wie im Bericht „Urlaub“: Pfeil „Vorheriges Jahr“ (←), Pfeil „Nächstes Jahr“ (→) und
  Button „Dieses Jahr“, deaktiviert, solange das laufende Jahr angezeigt wird. Beim Öffnen das laufende Jahr.
- **Kennzahl:** eine Karte (`Summary`) „Krankheitstage“ mit der Gesamtzahl des Jahres nach Regel 4.
- **Tabelle** (`DataTable`) mit allen Krankmeldungen, die zumindest teilweise im Jahr liegen,
  aufsteigend nach Beginn:

  | Spalte         | Inhalt                                          |
  |----------------|-------------------------------------------------|
  | Beginn         | `TT.MM.JJJJ`                                    |
  | Ende           | `TT.MM.JJJJ`                                    |
  | Kalendertage   | `dayCount`                                      |
  | Krankheitstage | Arbeitstage im ganzen Zeitraum (`countWorkdays`) |
  | Notiz          | Notiz oder leer                                 |
  | (Aktionen)     | „Bearbeiten“ und „Löschen“                       |

  Ohne Einträge wird die leere Tabelle mit dem Hinweis „Keine Krankheitstage“ gezeigt.
- **Dialog** zum Eintragen und Bearbeiten wie `vacation-dialog.tsx`: Felder Beginn, Ende und Notiz.
  Beim Eintragen sind Beginn und Ende mit heute vorbelegt. Das Ende zieht mit, wenn es vor den Beginn
  rutscht. Unter den Feldern stehen die Zahl der Krankheitstage und live das `problem` (Regeln 2 und 3).
  Bei einem Problem ist „Speichern“ deaktiviert. Danach folgt die Nachfrage aus Regel 7.
- **Löschen** mit Rückfrage wie beim Urlaub (`vacation-actions.tsx`).
- **Laden und Fehler** wie in `views.md`: „Lade…“, bei einem Fehler die Meldung mit „Erneut versuchen“.

Nicht dabei: halbe Tage, Upload eines Attests, Krankmeldung für andere User.

## Fragen zum Use Case

| Frage                         | Antwort                                                                                     |
|-------------------------------|---------------------------------------------------------------------------------------------|
| Wer möchte was?               | Der User sieht, trägt ein, ändert und löscht seine Krankmeldungen (Hooks siehe oben)        |
| Wer darf das?                 | Jeder User für sich selbst, im User-Bereich. Der Server prüft.                              |
| Welche Regeln gelten?         | Regeln 1 bis 8 oben, als Services in `shared/`. Die Function prüft sie noch einmal.         |
| Welche Daten werden geladen?  | Krankmeldungen, Feiertage und Buchungen des Users                                           |
| Was kann schiefgehen?         | Laden schlägt fehl: Meldung mit „Erneut versuchen“. Regel verletzt: 422 mit Meldung. Buchungen im Zeitraum ohne Bestätigung: 409. |
| Was ist danach wahr?          | Die Krankmeldung ist gespeichert, Buchungen im Zeitraum sind gelöscht. Invalidiert werden `["sick-leaves"]` und `["time-entries"]`. |
| Wer sieht das Ergebnis?       | Nur der User selbst, im Bericht „Krankmeldungen“ und als Soll 0 in den übrigen Berichten    |

## Umsetzung nach der Architektur

| Baustein   | Datei                                                             | Inhalt                                                                                   |
|------------|-------------------------------------------------------------------|------------------------------------------------------------------------------------------|
| Schema     | `db/schema.ts`, neue Migration in `db/migrations/`                | neu: Tabelle `sick_leaves` mit Index auf `user_id, start_date`, wie `vacations`          |
| Schema     | `shared/sick-leave.ts`                                            | neu: `SickLeave`, `SickLeaveCreate`, `SickLeaveUpdate` mit drizzle-zod, wie `shared/vacation.ts`. Create und Update haben zusätzlich `deleteEntries?: boolean`. |
| Service    | `shared/sick-leave-rules.ts`                                      | neu: `checkSickLeave(existing, candidate)` (Regeln 2, 3), `isSickDay(day, sickLeaves)`, `sickDaysInYear(sickLeaves, year, holidays)`, `findEntriesInRange(entries, start, end)`. `checkRange`, `dayCount`, `countWorkdays` aus `vacation-rules.ts` wiederverwenden, Range-Funktionen bei Bedarf in `shared/day-range.ts` verschieben. |
| Service    | `shared/target-hours.ts`                                          | `DayKind` um `"sick"` erweitern. `dayKind` und `targetMs` bekommen die Krankmeldungen als Parameter. **Alle Aufrufer anpassen** (`time-report.ts`, Use Cases der Berichte). |
| Service    | `shared/vacation-rules.ts`                                        | `workdaysInYear`, `vacationBalance`, `checkYearLimit` lassen Krankheitstage aus (Regel 6) |
| Service    | `shared/time-rules.ts`                                            | neu: Prüfung „Buchung an einem Krankheitstag“ für Regel 7                                |
| Function   | `netlify/functions/sick-leaves.ts`                                | neu: `GET/POST /api/sick-leaves`, `GET/PATCH/DELETE /api/sick-leaves/:id`, wie `vacations.ts`. POST und PATCH prüfen in der Transaktion Regeln 2, 3 und 7: Buchungen im Zeitraum ohne `deleteEntries` → 409, mit → im selben Commit löschen. |
| Function   | `netlify/functions/time-entries.ts`                               | Buchung an einem Krankheitstag → 422 (Regel 7)                                           |
| Function   | `netlify/functions/vacations.ts`                                  | Jahresgrenze ohne Krankheitstage (Regel 6)                                               |
| API        | `src/api/sick-leaves.ts`                                          | neu: `fetchSickLeaves`, `createSickLeave`, `updateSickLeave`, `deleteSickLeave`          |
| View       | `src/views/sick-leaves.ts`                                        | neu: `useSickLeaves(userId)`, Key `["sick-leaves", userId]`                              |
| Use Cases  | `src/features/sick-leaves/use-cases/`                             | neu: `use-show-sick-leaves.ts`, `use-add-sick-leave.ts`, `use-change-sick-leave.ts`, `use-delete-sick-leave.ts`. Add und Change liefern `problem`, `entriesInRange` (für die Nachfrage) und invalidieren `["sick-leaves"]` und `["time-entries"]`. |
| Use Cases  | `src/features/reports/use-cases/`, `src/features/vacations/use-cases/`, `src/features/time-stamp/use-cases/` | laden zusätzlich `useSickLeaves` und reichen die Krankmeldungen an die Services weiter. Die Zeiterfassung liefert das Problem aus Regel 7. |
| Komponenten| `src/features/sick-leaves/components/`                            | neu: `report-sick-leaves.tsx`, `sick-leave-dialog.tsx`, `sick-leave-actions.tsx`, zeigen nur an |
| Komponente | `src/features/reports/utils/day-kind-label.ts`                    | Fall `"sick"` → „krank“                                                                  |
| Seite      | `src/features/reports/components/report-sick-leaves-page.tsx`     | neu: `ReportSickLeavesPage`, wie `report-vacations-page.tsx`                             |
| Route      | `src/routes/user/reports/sick-leaves.tsx`                         | neu: `/user/reports/sick-leaves`, bindet nur `ReportSickLeavesPage` ein                  |
| Menü       | `src/application/navigation/nav-items.ts`                         | neue ID `reports-sick-leaves`, Eintrag „Krankmeldungen“ nach `reports-vacations`         |

Hinweise:

- Tage werden als Text `JJJJ-MM-TT` übergeben, die aktuelle Zeit als Parameter (`today`, `now`), nicht über `new Date()` im Service.
- Reihenfolge der Commits: zuerst Schema und Services mit Tests, dann Function und API, dann die Seite,
  zuletzt die Änderungen an Berichten, Urlaub und Zeiterfassung.

## Tests

Nach `testing.md`, jede Regel mit Gegenprobe (Regel absichtlich brechen, Test muss fehlschlagen):

- **Service-Tests** ohne Mocks:
  - `shared/sick-leave-rules.test.ts`: Regeln 2 und 3 (auch Ändern ohne Vergleich mit sich selbst),
    Krankheitstage aus den Beispielen inklusive Jahreswechsel, Buchungen im Zeitraum finden
  - `shared/target-hours.test.ts`: `dayKind` = `"sick"`, Reihenfolge gegenüber Wochenende, Feiertag,
    Urlaub und Beginn der Zeiterfassung, `targetMs` = 0
  - `shared/vacation-rules.test.ts`: Beispiel „Krankheit im Urlaub“ (7 statt 10 Urlaubstage)
  - `shared/time-rules.test.ts`: Buchung an einem Krankheitstag wird abgelehnt
  - `shared/time-report.test.ts`: Woche und Monat mit Krankheitstag haben weniger Soll
- **Komponenten-Test** `src/features/sick-leaves/components/sick-leaves.test.tsx`: leere Tabelle mit
  „Keine Krankheitstage“, Nachfrage vor dem Löschen von Buchungen
- **Routing:** Eintrag `"/user/reports/sick-leaves": "Krankmeldungen"` in `src/tests/routes.test.tsx`
