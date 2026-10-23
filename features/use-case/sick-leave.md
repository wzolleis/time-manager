---
name: sick-leave
description: Beschreibt die Use Cases zur Krankmeldung. Der User trägt Krankheitstage ein, ändert und löscht sie und sieht sie auf der Seite „Krankmeldungen“. Krankheitstage haben Soll 0, Buchungen an Krankheitstagen bleiben gespeichert, zählen aber nicht.
type: story
epics: krankmeldung
state: resolved
---

# Krankmeldung

„Der User trägt eine Krankmeldung ein.“

Ist der User krank, trägt er einen Tag oder einen Zeitraum als Krankmeldung ein. Krankheitstage haben
kein Soll. Buchungen an Krankheitstagen bleiben gespeichert, zählen aber in keinem Bericht. Alle Krankmeldungen eines Jahres sieht er im Bericht
„Krankmeldungen“, dort legt er sie auch an, ändert und löscht sie.

Vorbild ist der Urlaub. Eine eigene Beschreibung gibt es dafür nicht, nur den Code:

- Seite `../../src/features/vacations/components/vacations-page.tsx`, Route `../../src/routes/user/vacations.tsx`
- Komponenten `../../src/features/vacations/components/` (`vacations-list.tsx`, `vacation-dialog.tsx`, `vacation-actions.tsx`)
- Use Cases `../../src/features/vacations/use-cases/`
- Services `../../shared/vacation-rules.ts`, Schema `../../shared/vacation.ts`, Function `../../netlify/functions/vacations.ts`

Umgesetzt wird nach dem Skill `architecture` (`../../agents/.agents/skills/architecture`), zuerst `../../agents/.agents/skills/architecture/use-case.md` lesen.

## Use Cases

| Use Case                              | Hook                 |
|---------------------------------------|----------------------|
| Der User sieht seine Krankmeldungen.  | `useShowSickLeaves`  |
| Der User trägt eine Krankmeldung ein. | `useAddSickLeave`    |
| Der User ändert eine Krankmeldung.    | `useChangeSickLeave` |
| Der User löscht eine Krankmeldung.    | `useDeleteSickLeave` |

Dazu kommen Änderungen an vorhandenen Use Cases:

- **Berichte:** Tages-, Wochen- und Monatsbericht rechnen Krankheitstage mit Soll 0 und ohne
  Arbeitszeit (Regeln 5 und 7).
- **Urlaub:** Ein Krankheitstag im Urlaub ist kein Urlaubstag (Regel 6).
- **Zeiterfassung:** Buchungen an einem Krankheitstag sind möglich, die UI weist darauf hin, dass sie
  nicht zählen. Die Abfolge Kommen/Gehen wird wie bisher geprüft (Regeln 7 und 8).

## Daten

Eine Krankmeldung ist ein Zeitraum ganzer Tage, wie ein Urlaub:

| Feld        | Typ                      | Inhalt                                    |
|-------------|--------------------------|-------------------------------------------|
| `id`        | UUID                     |                                           |
| `userId`    | UUID                     | der kranke User                           |
| `startDate` | Tag `JJJJ-MM-TT`         | erster Krankheitstag                      |
| `endDate`   | Tag `JJJJ-MM-TT`         | letzter Krankheitstag, inklusive          |
| `note`      | Text, optional, max. 500 | Notiz des Users, z. B. „Attest liegt vor“ |

Tabelle `sick_leaves`, im Code `SickLeave`, wie `vacations` / `Vacation`. Die Buchungen
(`time_entries`) ändern sich durch eine Krankmeldung nicht.

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
   (`day-kind-label.ts`). Wochen- und Monatsbericht zeigen Krankheit nur über Soll und Arbeitszeit.
6. **Krankheit geht vor Urlaub.** Ein Krankheitstag im Urlaub verbraucht keinen Urlaubstag (§ 9 BUrlG).
   Der Urlaub bleibt eingetragen, aber `workdaysInYear`, `vacationBalance` und `checkYearLimit`
   zählen Krankheitstage nicht mit. Eine Krankmeldung darf sich also mit einem Urlaub überschneiden.
7. **Buchungen an Krankheitstagen werden ignoriert, nicht gelöscht.**
   - Maßgeblich ist der Tag der Buchung wie bei `localDay`. Weil ein Gehen nur am Tag des Kommens
     gebucht werden kann, liegt ein Buchungspaar immer an einem Tag.
   - Die Arbeitszeit eines Krankheitstags ist 0, auch wenn dort Buchungen liegen. Mit Soll 0 ist auch
     die Differenz 0. Eine laufende Arbeitszeit an einem Krankheitstag zählt ebenfalls nicht.
   - Wird eine Krankmeldung gelöscht oder verkürzt, zählen die Buchungen an den freigewordenen Tagen
     automatisch wieder. Wird sie eingetragen oder verlängert, zählen sie nicht mehr.
   - Der Tag der ersten Buchung (`firstBookingDay`, Beginn der Zeiterfassung) berücksichtigt alle
     Buchungen, auch ignorierte.
8. **Buchungen an Krankheitstagen sind erlaubt, aber nur als vollständige Paare.**
   - Neue Buchungen an einem Krankheitstag sind erlaubt (Stempeln, Nachtragen, Ändern). Die UI zeigt
     dazu den Hinweis „Der 14.10.2026 ist als Krankheitstag eingetragen. Die Buchung zählt nicht zur
     Arbeitszeit.“ Speichern ist trotzdem möglich.
   - Für die Abfolge gelten dieselben Regeln wie an jedem anderen Tag: `checkSequence`, `findMissingGehen`
     und `findPartner` sehen alle Buchungen, auch die an Krankheitstagen. Zu einem Kommen muss also am
     selben Tag ein Gehen gebucht werden, sonst meldet die Stempelkarte am nächsten Tag das fehlende Gehen.
   - Weil die Abfolge unabhängig von Krankmeldungen immer gültig ist, kann man Krankmeldungen ohne
     weitere Prüfung der Buchungen eintragen, ändern und löschen. Ignoriert werden Buchungen nur beim
     Summieren der Arbeitszeit (Regel 7).
9. **Vor Beginn der Zeiterfassung** darf man Krankmeldungen eintragen, das Soll ist dort ohnehin 0.
   Krankmeldungen in der Zukunft sind erlaubt, z. B. für eine geplante Operation.

## Beispiele

Feiertage im Beispiel: keine, zur Vereinfachung auch nicht Neujahr.

| Krankmeldung                  | Kalendertage | Krankheitstage | Grund                          |
|-------------------------------|--------------|----------------|--------------------------------|
| Mi 14.10.2026                 | 1            | 1              |                                |
| Mi 14.10.2026 – Di 20.10.2026 | 7            | 5              | Sa 17. und So 18. zählen nicht |
| Sa 17.10.2026 – So 18.10.2026 | 2            | 0              | nur Wochenende                 |
| Mo 28.12.2026 – Fr 08.01.2027 | 12           | 10             | 2026: 4, 2027: 6 (Regel 4)     |

**Krankheit im Urlaub:** Urlaub Mo 12.10. – Fr 23.10.2026 (10 Urlaubstage), krank Mi 14.10. – Fr 16.10.2026.
Verbraucht werden 7 Urlaubstage, auf der Seite „Krankmeldungen“ stehen 3 Krankheitstage.

**Buchungen im Zeitraum:** Am Mi 14.10.2026 gibt es Kommen 08:00 und Gehen 12:00. Der User trägt eine
Krankmeldung für den 14.10. ein. Der Dialog zeigt den Hinweis „Im Zeitraum gibt es 2 Buchungen. Sie
zählen nicht zur Arbeitszeit.“ Nach dem Speichern hat der 14.10. Soll 0 und Arbeitszeit 0. Die beiden
Buchungen stehen im Tagesbericht weiter da, markiert mit „zählt nicht (krank)“. Löscht der User die
Krankmeldung, hat der 14.10. wieder 8 Stunden Soll und 4 Stunden Arbeitszeit.

**Buchung an einem Krankheitstag:** Der User ist am Do 15.10.2026 krankgemeldet und stempelt um 09:00
ein Kommen. Die Stempelkarte zeigt vorher und danach den Hinweis aus Regel 8. Bucht er kein Gehen,
meldet die Stempelkarte am Fr 16.10. wie an jedem anderen Tag das fehlende Gehen. Trägt er um 11:00 ein
Gehen nach, ist der 15.10. weiter ein Krankheitstag mit Soll 0 und Arbeitszeit 0.

## Bedienung

Alles auf einer eigenen Seite im User-Bereich (wie „Feiertage“ unter `/user/holidays`), aufgebaut wie der
Seite „Urlaub“ (`vacations-list.tsx`).

- **Menü:** Eintrag „Krankmeldungen“ nach `vacations`, Route `/user/sick-leaves`.
- **Kopf:** Überschrift „Krankmeldungen“. Darunter Name des Users, Jahr und Zahl der Einträge, z. B.
  „Jack · 2026 · 3 Einträge“. Rechts der Button „Krankmeldung eintragen“.
- **Jahr wählen** wie auf der Seite „Urlaub“: Pfeil „Vorheriges Jahr“ (←), Pfeil „Nächstes Jahr“ (→) und
  Button „Dieses Jahr“, deaktiviert, solange das laufende Jahr angezeigt wird. Beim Öffnen das laufende Jahr.
- **Kennzahl:** eine Karte (`MetricCard`) „Krankheitstage“ mit der Gesamtzahl des Jahres nach Regel 4.
- **Tabelle** (`DataTable`) mit allen Krankmeldungen, die zumindest teilweise im Jahr liegen,
  aufsteigend nach Beginn:

| Spalte         | Inhalt                                           |
|----------------|--------------------------------------------------|
| Beginn         | `TT.MM.JJJJ`                                     |
| Ende           | `TT.MM.JJJJ`                                     |
| Kalendertage   | `dayCount`                                       |
| Krankheitstage | Arbeitstage im ganzen Zeitraum (`countWorkdays`) |
| Notiz          | Notiz oder leer                                  |
| (Aktionen)     | „Bearbeiten“ und „Löschen“                       |

  Ohne Einträge wird die leere Tabelle mit dem Hinweis „Keine Krankheitstage“ gezeigt.
- **Dialog** zum Eintragen und Bearbeiten wie `vacation-dialog.tsx`: Felder Beginn, Ende und Notiz.
  Beim Eintragen sind Beginn und Ende mit heute vorbelegt. Das Ende zieht mit, wenn es vor den Beginn
  rutscht. Unter den Feldern stehen die Zahl der Krankheitstage und live das `problem` (Regeln 2 und 3). Bei einem Problem ist „Speichern“ deaktiviert. Liegen im Zeitraum Buchungen,
  steht dort zusätzlich der Hinweis „Im Zeitraum gibt es N Buchungen. Sie zählen nicht zur
  Arbeitszeit.“ Er verhindert das Speichern nicht.
- **Löschen** mit Rückfrage wie beim Urlaub (`vacation-actions.tsx`).
- **Zeiterfassung:** Stempelkarte, Dialog „Buchung nachtragen“ und Bearbeiten-Dialog zeigen den Hinweis
  aus Regel 8, wenn der Tag der Buchung ein Krankheitstag ist. Die Stempelkarte zeigt ihn schon vor dem
  Stempeln, wenn heute ein Krankheitstag ist.
- **Tagesbericht:** Buchungen an einem Krankheitstag werden weiter angezeigt, aber ausgegraut und mit
  „zählt nicht (krank)“ markiert. Bearbeiten und Löschen bleiben möglich.
- **Laden und Fehler** wie in `../../agents/.agents/skills/architecture/views.md`: „Lade…“, bei einem Fehler die Meldung mit „Erneut versuchen“.

Nicht dabei: halbe Tage, Upload eines Attests, Krankmeldung für andere User, Löschen von Buchungen
durch die Krankmeldung.

## Fragen zum Use Case

| Frage                        | Antwort                                                                                                                                |
|------------------------------|----------------------------------------------------------------------------------------------------------------------------------------|
| Wer möchte was?              | Der User sieht, trägt ein, ändert und löscht seine Krankmeldungen (Hooks siehe oben)                                                   |
| Wer darf das?                | Jeder User für sich selbst, im User-Bereich. Der Server prüft.                                                                         |
| Welche Regeln gelten?        | Regeln 1 bis 9 oben, als Services in `../../shared/`. Die Function prüft sie noch einmal.                                              |
| Welche Daten werden geladen? | Krankmeldungen, Feiertage und Buchungen des Users                                                                                      |
| Was kann schiefgehen?        | Laden schlägt fehl: Meldung mit „Erneut versuchen“. Regel verletzt: 422 mit Meldung.                                                   |
| Was ist danach wahr?         | Die Krankmeldung ist gespeichert, die Buchungen sind unverändert. Invalidiert wird `["sick-leaves"]`, alle Berichte rechnen damit neu. |
| Wer sieht das Ergebnis?      | Nur der User selbst, auf der Seite „Krankmeldungen“ und in den Berichten über Soll und Arbeitszeit                                     |

## Umsetzung nach der Architektur

| Baustein    | Datei                                                                                                               | Inhalt                                                                                                                                                                                                                                                                                                                                                                                                              |
|-------------|---------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Schema      | `../../db/schema.ts`, neue Migration in `../../db/migrations/`                                                      | neu: Tabelle `sick_leaves` mit Index auf `user_id, start_date`, wie `vacations`                                                                                                                                                                                                                                                                                                                                     |
| Schema      | `../../shared/sick-leave.ts`                                                                                        | neu: `SickLeave`, `SickLeaveCreate`, `SickLeaveUpdate` mit drizzle-zod, wie `../../shared/vacation.ts`                                                                                                                                                                                                                                                                                                              |
| Service     | `../../shared/sick-leave-rules.ts`                                                                                  | neu: `checkSickLeave(existing, candidate)` (Regeln 2, 3), `isSickDay(day, sickLeaves)`, `sickDaysInYear(sickLeaves, year, holidays)`, `withoutSickDays(entries, sickLeaves)` (Buchungen außerhalb von Krankheitstagen, nur für die Summen nach Regel 7). `checkRange`, `dayCount`, `countWorkdays` aus `vacation-rules.ts` wiederverwenden, Range-Funktionen bei Bedarf in `../../shared/day-range.ts` verschieben. |
| Service     | `../../shared/target-hours.ts`                                                                                      | `DayKind` um `"sick"` erweitern. `dayKind` und `targetMs` bekommen die Krankmeldungen als Parameter.                                                                                                                                                                                                                                                                                                                |
| Service     | `../../shared/time-report.ts`                                                                                       | `dayTotals`, `weekTotals`, `monthTotals` bekommen die Krankmeldungen als Parameter und summieren nur `withoutSickDays(entries, …)`. `firstBookingDay` weiter mit allen Buchungen.                                                                                                                                                                                                                                   |
| Service     | `../../shared/vacation-rules.ts`                                                                                    | `workdaysInYear`, `vacationBalance`, `checkYearLimit` lassen Krankheitstage aus (Regel 6)                                                                                                                                                                                                                                                                                                                           |
| Service     | `../../shared/time-rules.ts`                                                                                        | unverändert. `checkSequence`, `findMissingGehen`, `findPartner` und `firstBookingDay` bekommen weiter alle Buchungen.                                                                                                                                                                                                                                                                                               |
| Function    | `../../netlify/functions/sick-leaves.ts`                                                                            | neu: `GET/POST /api/users/:userId/sick-leaves`, `GET/PATCH/DELETE /api/users/:userId/sick-leaves/:id`, wie `vacations.ts` (Pfade seit `../changes/api-user-pfade.md`). Die Buchungen werden nicht geprüft und nicht geändert.                                                                                                                                                                                                                                                               |
| Function    | `../../netlify/functions/vacations.ts`                                                                              | Jahresgrenze ohne Krankheitstage (Regel 6)                                                                                                                                                                                                                                                                                                                                                                          |
| API         | `../../src/api/sick-leaves.ts`                                                                                      | neu: `fetchSickLeaves`, `createSickLeave`, `updateSickLeave`, `deleteSickLeave`                                                                                                                                                                                                                                                                                                                                     |
| View        | `../../src/views/sick-leaves.ts`                                                                                    | neu: `useSickLeaves(userId)`, Key `["sick-leaves", userId]`                                                                                                                                                                                                                                                                                                                                                         |
| Use Cases   | `../../src/features/sick-leaves/use-cases/`                                                                         | neu: `use-show-sick-leaves.ts`, `use-add-sick-leave.ts`, `use-change-sick-leave.ts`, `use-delete-sick-leave.ts`. Add und Change liefern `problem` und `entriesInRange` (Zahl für den Hinweis). Alle invalidieren nur `["sick-leaves"]`.                                                                                                                                                                             |
| Use Cases   | `../../src/features/reports/use-cases/`                                                                             | laden zusätzlich `useSickLeaves` und reichen die Krankmeldungen an die Services weiter. Der Tagesbericht liefert je Buchung, ob sie ignoriert wird.                                                                                                                                                                                                                                                                 |
| Use Cases   | `../../src/features/vacations/use-cases/`                                                                           | laden zusätzlich `useSickLeaves` für Regel 6                                                                                                                                                                                                                                                                                                                                                                        |
| Use Cases   | `../../src/features/reports/use-cases/`                                                                             | laden zusätzlich `useSickLeaves`. `problem` bleibt unverändert. Neu `sickNotice(day)`: Hinweistext aus Regel 8 oder `null`. `useStampTime` liefert den Hinweis für heute.                                                                                                                                                                                                                                           |
| Komponenten | `../../src/features/sick-leaves/components/`                                                                        | neu: `sick-leaves-list.tsx`, `sick-leave-dialog.tsx`, `sick-leave-actions.tsx`, zeigen nur an                                                                                                                                                                                                                                                                                                                       |
| Komponenten | `../../src/features/reports/components/`                                                                            | Stempelkarte, Nachtragen- und Bearbeiten-Dialog zeigen `sickNotice`                                                                                                                                                                                                                                                                                                                                                 |
| Komponenten | `../../src/features/reports/components/report-daily-edit.tsx`, `../../src/features/reports/utils/day-kind-label.ts` | Buchungen an Krankheitstagen ausgegraut mit „zählt nicht (krank)“. Fall `"sick"` → „krank“.                                                                                                                                                                                                                                                                                                                         |
| Seite       | `../../src/features/sick-leaves/components/sick-leaves-page.tsx`                                                    | neu: `SickLeavesPage`, wie `holidays-page.tsx`                                                                                                                                                                                                                                                                                                                                                                      |
| Route       | `../../src/routes/user/sick-leaves.tsx`                                                                             | neu: `/user/sick-leaves`, bindet nur `SickLeavesPage` ein                                                                                                                                                                                                                                                                                                                                                           |
| Menü        | `../../src/application/navigation/nav-items.ts`                                                                     | neue ID `sick-leaves`, Eintrag „Krankmeldungen“ nach `vacations`                                                                                                                                                                                                                                                                                                                                                    |

Hinweise:

- Tage werden als Text `JJJJ-MM-TT` übergeben, die aktuelle Zeit als Parameter (`today`, `now`), nicht über `new Date()` im Service.
- `withoutSickDays` ist die einzige Stelle, die entscheidet, welche Buchungen ignoriert werden. Sie wird
  nur in den Summen-Services verwendet, nie für die Prüfung der Abfolge.
- Reihenfolge der Commits: zuerst Schema und Services mit Tests, dann Function und API, dann die Seite,
  zuletzt die Änderungen an Berichten, Urlaub und Zeiterfassung.

## Tests

Nach `../../agents/.agents/skills/architecture/testing.md`, jede Regel mit Gegenprobe (Regel absichtlich brechen, Test muss fehlschlagen):

- **Service-Tests** ohne Mocks:
  - `../../shared/sick-leave-rules.test.ts`: Regeln 2 und 3 (auch Ändern ohne Vergleich mit sich selbst),
    Krankheitstage aus den Beispielen inklusive Jahreswechsel, `withoutSickDays`
  - `../../shared/target-hours.test.ts`: `dayKind` = `"sick"`, Reihenfolge gegenüber Wochenende, Feiertag,
    Urlaub und Beginn der Zeiterfassung, `targetMs` = 0
  - `../../shared/time-report.test.ts`: Tag mit Buchungen und Krankmeldung hat Arbeitszeit 0 und Differenz 0,
    ohne Krankmeldung zählen dieselben Buchungen wieder, Woche und Monat summieren ohne den Krankheitstag
  - `../../shared/vacation-rules.test.ts`: Beispiel „Krankheit im Urlaub“ (7 statt 10 Urlaubstage)
- **Komponenten-Test** `../../src/features/sick-leaves/components/sick-leaves.test.tsx`: leere Tabelle mit
  „Keine Krankheitstage“, Hinweis auf Buchungen im Zeitraum
- **Routing:** Eintrag `"/user/sick-leaves": "Krankmeldungen"` in `../../src/tests/routes.test.tsx`
