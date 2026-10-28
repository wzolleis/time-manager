---
name: today-report
description: Beschreibt den Use Case Tagesbericht („Heute“). Der User stempelt dort, sieht Buchungen, Arbeitszeit, Pausen, Soll und Differenz eines Tages, standardmäßig des heutigen, und trägt Buchungen nach, ändert und löscht sie.
type: story
epics: report, zeiterfassung
state: resolved
---

# Tagesbericht

„Der User sieht seinen Tagesbericht.“

Der User sieht für heute oder einen beliebigen anderen Tag seine Buchungen (Kommen und Gehen), wie lange
er gearbeitet und Pause gemacht hat und wie das zum Soll des Tages steht. Im Bericht trägt er vergessene
Buchungen nach, ändert und löscht sie. Am heutigen Tag stempelt er dort auch Kommen und Gehen. Beim Öffnen
zeigt der Bericht den heutigen Tag.

Der Use Case ist umgesetzt. Diese Beschreibung hält fest, wie er sich verhält, damit Änderungen daran die
Regeln nicht verletzen. Code:

- Komponente `../../src/features/reports/components/report-daily-edit.tsx`, darin die Stempelkarte
  `../../src/features/reports/components/stamp-card.tsx`
- Use Case `../../src/features/reports/use-cases/use-show-daily-report.ts`
- Services `dayTotals` und `dayDiffMs` in `../../shared/time-report.ts`, `targetMs` und `dayKind` in
  `../../shared/target-hours.ts`, `nextType` und `firstBookingDay` in `../../shared/time-rules.ts`

Geändert wird nach dem Skill `architecture` (`../../.claude/skills/architecture`), zuerst
`../../.claude/skills/architecture/use-case.md` lesen.

## Wo der Bericht erscheint

Nur unter dem Menüeintrag „Heute“, Route `/user/reports/daily` (`ReportDailyPage` zeigt `ReportDailyEdit`).
Ein bestimmter Tag hat die Adresse `/user/reports/daily/2026-10-21` (Format `JJJJ-MM-TT`), ohne Tag zeigt die
Seite heute. Ein ungültiger Tag (`2026-02-30`) zeigt eine Fehlermeldung mit dem Link „Zum heutigen Tag“. Der
Wochenbericht verlinkt jeden Tag hierher (Change `../changes/report-links.md`).
Die frühere Seite „Zeiterfassung“ (`/user/time-stamp`) gibt es nicht mehr, ihr Inhalt ist hier.

## Inhalt

### Stempelkarte

Nur wenn der heutige Tag angezeigt wird, steht unter dem Kopf die Stempelkarte (`StampCard`, Use Case
`useStampTime` in `../../src/features/reports/use-cases/use-stamp-time.ts`). Gestempelt wird immer mit
der aktuellen Zeit, an einem anderen Tag würde die Buchung nicht in der angezeigten Tabelle erscheinen.

- Titel: Name des Users. Darunter der Status: „Noch keine Buchungen“, „Eingestempelt seit 08:00 Uhr
  (2 Std 15 Min) · <Projekt>“ oder „Ausgestempelt seit 12:00 Uhr“. Liegt die letzte Buchung an einem
  anderen Tag, steht der Tag davor, z. B. „Di., 13.10., 17:00 Uhr“.
- Ausgestempelt: Auswahl „Projekt wählen“ (mit „Kein Projekt“) und Button „Kommen“.
- Eingestempelt: Button „Gehen“.
- Fehlt zu einem Kommen eines früheren Tages das Gehen (`findMissingGehen`): Status „Gehen zum Kommen am
  <Tag> fehlt“, Hinweis „Ein Gehen lässt sich nur am Tag des Kommens buchen. Trage es nach, danach kannst
  du wieder stempeln.“ und Button „Gehen nachtragen“ statt „Kommen“/„Gehen“.
- Ist heute ein Krankheitstag, der Hinweis aus `sick-leave.md`, Regel 8. Stempeln bleibt möglich.
- Nach dem Stempeln wird `["time-entries"]` invalidiert, Tabelle und Karten rechnen neu.

### Kennzahlen

Vier Karten (Komponente `MetricCard` aus `../../src/components/cards/metric-card.tsx`):

| Karte       | Wert                                                                          | Hinweis unter dem Wert                                          |
|-------------|-------------------------------------------------------------------------------|-----------------------------------------------------------------|
| Arbeitszeit | Arbeitszeit des Tages (Regel 3)                                               | „läuft noch“, solange heute eine Arbeitszeit läuft              |
| Pausen      | Summe der Pausen des Tages (Regel 4)                                          | –                                                               |
| Soll        | Soll des Tages (Regel 5)                                                      | Grund für Soll 0 aus `dayKindLabel` (siehe unten), sonst nichts |
| Differenz   | Arbeitszeit minus Soll oder „–“ (Regel 6), Plus grün, Minus rot (`diffClass`) | –                                                               |

Hinweis zum Soll (`../../src/features/reports/utils/day-kind-label.ts`):

| `dayKind`   | Hinweis                        |
|-------------|--------------------------------|
| `weekend`   | „Wochenende“                   |
| `untracked` | „vor Beginn der Zeiterfassung“ |
| `holiday`   | „Feiertag: <Name>“             |
| `sick`      | „krank“                        |
| `vacation`  | „Urlaub“                       |
| `workday`   | kein Hinweis                   |

### Tabelle der Buchungen

Alle Buchungen, deren Zeitpunkt im Tag liegt (Regel 1), aufsteigend nach Uhrzeit (`DataTable`):

| Spalte     | Inhalt                                                                               |
|------------|--------------------------------------------------------------------------------------|
| Uhrzeit    | `HH:mm Uhr` in Europe/Berlin                                                         |
| Buchung    | „Kommen“ oder „Gehen“, an einem Krankheitstag mit dem Zusatz „· zählt nicht (krank)“ |
| Projekt    | Name des Projekts, ohne Projekt „–“                                                  |
| (Aktionen) | „Bearbeiten“ und „Löschen“ (`EntryActions`)                                          |

Ohne Buchungen zeigt die leere Tabelle „Heute noch keine Buchungen.“ (heute) bzw. „An diesem Tag keine
Buchungen.“ (anderer Tag).

### Formate

Aus `../../shared/format.ts`:

| Funktion           | Beispiele                                  | Regel                                               |
|--------------------|--------------------------------------------|-----------------------------------------------------|
| `formatDuration`   | „8 Std 30 Min“, „8 Std“, „45 Min“, „0 Min“ | ganze Minuten, abgerundet, nie negativ              |
| `formatDifference` | „+30 Min“, „−1 Std 15 Min“, „±0 Min“       | unter einer Minute „±0 Min“, Minus als „−“ (U+2212) |
| `formatDate`       | „Mittwoch, 14.10.2026“                     | Wochentag ausgeschrieben, Europe/Berlin             |

## Regeln

1. **Ein Tag ist ein lokaler Tag in Europe/Berlin.** Übergeben wird er als Text `JJJJ-MM-TT`, der Zeitraum
   ist `localDayRange(day)`: von Mitternacht bis Mitternacht des Folgetags, das Ende gehört nicht dazu. An
   den Tagen der Zeitumstellung hat der Tag 23 bzw. 25 Stunden.
2. **Heute** ist `localDay(now)`. `now` kommt aus `useNow` und wird alle 30 Sekunden neu gesetzt, damit
   eine laufende Arbeitszeit mitzählt.
3. **Arbeitszeit** ist `dayTotals(entries, range, sickLeaves, now).workMs`:
   - Eine Arbeitszeit beginnt mit einem Kommen und endet mit der nächsten Buchung.
   - Abgeschlossene Arbeitszeiten werden an den Grenzen des Tages abgeschnitten (Altdaten über Mitternacht).
   - Ein Kommen ohne folgende Buchung zählt bis `now`, solange der Tag noch läuft (`running`).
     Ist der Tag vorbei, zählt es nicht, und der Bericht meldet das fehlende Gehen (Regel 8).
   - In die Summe gehen **alle Buchungen des Users** ein, nicht nur die des Tages, damit Altdaten am
     Tageswechsel stimmen. Ausgenommen sind nur Buchungen an Krankheitstagen (Regel 7).
4. **Pausen** sind die Zeiten von einem Gehen bis zum nächsten Kommen am selben lokalen Tag
   (`buildPeriods`). Die Zeit vom letzten Gehen bis zum ersten Kommen des Folgetags ist keine Pause.
5. **Soll** ist `targetMs(day, vacations, holidays, sickLeaves, trackingStart)`: 8 Stunden an einem
   Arbeitstag, sonst 0. Die Art des Tages bestimmt `dayKind` in dieser Reihenfolge: Wochenende → vor Beginn
   der Zeiterfassung → Feiertag → krank → Urlaub → Arbeitstag. `trackingStart` ist der Tag der ersten
   Buchung des Users (`firstBookingDay`, mit allen Buchungen, auch denen an Krankheitstagen), ohne jede
   Buchung `null`, dann ist das Soll an jedem Tag 0.
6. **Differenz** ist `dayDiffMs(day, today, workMs, target)`, derselbe Service wie im Wochenbericht:
   Arbeitszeit minus Soll. `null`, angezeigt als „–“ ohne Farbe, gilt für künftige Tage (`day > today`)
   und für Tage ohne Soll und ohne Arbeitszeit (freier Tag ohne Arbeit). Ein freier Tag mit Arbeit, z. B.
   ein Samstag, zeigt die Arbeitszeit als Plus.
7. **Buchungen an Krankheitstagen** (Use Case `sick-leave.md`, Regel 7) stehen weiter in der Tabelle,
   ausgegraut und mit „· zählt nicht (krank)“. Sie zählen weder zur Arbeitszeit noch zu den Pausen, auch
   nicht als laufende Arbeitszeit. Bearbeiten und Löschen bleiben möglich.
8. **Fehlendes Gehen:** Liegt an einem vergangenen Tag ein Kommen ohne folgende Buchung
   (`missingGehen`), zeigt der Bericht über den Karten „An diesem Tag fehlt das Gehen. Trage es mit
   „Buchung nachtragen" nach.“ (`role="alert"`). Am heutigen Tag ist das kein Fehler, sondern eine
   laufende Arbeitszeit.
9. **Vorbelegung beim Nachtragen:** Der Dialog „Buchung nachtragen“ startet mit dem angezeigten Tag und
   mit der Buchungsart, die am Ende dieses Tages als Nächstes dran wäre (`nextType(entries, range.end)`):
   nach einem Kommen ein Gehen, sonst ein Kommen. Am heutigen Tag ist die Uhrzeit mit jetzt vorbelegt,
   an anderen Tagen leer. Künftige Tage lassen sich im Dialog nicht wählen (`max` = heute).
10. **Ändern und Löschen** der Buchungen sind eigene Use Cases (`useAddTimeEntry`, `useChangeTimeEntry`,
    `useDeleteTimeEntry` in `../../src/features/reports/use-cases/`). Der Tagesbericht ruft sie nur
    über die Komponenten auf. Für sie gilt die Abfolge Kommen/Gehen (`checkSequence`): Kommen und Gehen
    eines Paars liegen am selben Tag.

## Beispiele

Alle Uhrzeiten in Europe/Berlin. Die erste Buchung des Users liegt vor den Beispieltagen, außer im
Beispiel „Vor Beginn der Zeiterfassung“. Keine Feiertage, außer im Beispiel „Feiertag“.

| Fall                         | Tag           | Buchungen / Daten                      | Arbeitszeit                | Pausen | Soll  | Hinweis Soll                   | Differenz                       |
|------------------------------|---------------|----------------------------------------|----------------------------|--------|-------|--------------------------------|---------------------------------|
| Vollständiger Arbeitstag     | Mi 14.10.2026 | K 08:00, G 12:00, K 12:30, G 17:00     | 8 Std 30 Min               | 30 Min | 8 Std |                                | +30 Min                         |
| Läuft noch (jetzt 10:15)     | Mi 14.10.2026 | K 08:00                                | 2 Std 15 Min, „läuft noch“ | 0 Min  | 8 Std |                                | −5 Std 45 Min                   |
| Gehen vergessen              | Di 13.10.2026 | K 08:00, heute ist der 14.10.          | 0 Min                      | 0 Min  | 8 Std |                                | −8 Std, Meldung fehlendes Gehen |
| Ohne Buchungen               | Mo 12.10.2026 | keine                                  | 0 Min                      | 0 Min  | 8 Std |                                | −8 Std                          |
| Wochenende mit Arbeit        | Sa 17.10.2026 | K 10:00, G 12:00, heute ist der 18.10. | 2 Std                      | 0 Min  | 0 Min | „Wochenende“                   | +2 Std                          |
| Urlaub                       | Do 15.10.2026 | Urlaub 15.10., keine Buchungen         | 0 Min                      | 0 Min  | 0 Min | „Urlaub“                       | –                               |
| Feiertag                     | Do 15.10.2026 | Feiertag „Betriebsfeier“ am 15.10.     | 0 Min                      | 0 Min  | 0 Min | „Feiertag: Betriebsfeier“      | –                               |
| Krank mit Buchungen          | Mi 14.10.2026 | Krankmeldung 14.10., K 08:00, G 12:00  | 0 Min                      | 0 Min  | 0 Min | „krank“                        | –                               |
| Vor Beginn der Zeiterfassung | Di 13.10.2026 | erste Buchung des Users am 14.10.      | 0 Min                      | 0 Min  | 0 Min | „vor Beginn der Zeiterfassung“ | –                               |
| Künftiger Tag                | Mo 19.10.2026 | heute ist der 14.10.                   | 0 Min                      | 0 Min  | 8 Std |                                | –                               |

Im Fall „Krank mit Buchungen“ stehen beide Buchungen in der Tabelle als „Kommen · zählt nicht (krank)“
und „Gehen · zählt nicht (krank)“, ausgegraut.

**Nachtschicht (Altdaten):** Kommen Di 13.10.2026 22:00, Gehen Mi 14.10.2026 06:00. Der 13.10. hat
2 Std Arbeitszeit (22:00 bis Mitternacht), der 14.10. hat 6 Std (Mitternacht bis 06:00). Neue Buchungen
dieser Art lässt `checkSequence` nicht mehr zu.

## Bedienung

- **Kopf:** Überschrift „Heute“ (`h1`), wie der Menüeintrag, auch wenn ein anderer Tag gewählt ist.
  Darunter am heutigen Tag die Stempelkarte, dann Navigation, Karten und Tabelle. Darunter Name des Users und der Tag mit
  `formatDate`, z. B. „Jack · Mittwoch, 14.10.2026“.
- **Tag wählen:**
  - Pfeil „Vorheriger Tag“ (←) und Pfeil „Nächster Tag“ (→), je ein Tag
  - Datumsfeld „Tag wählen“, ein leerer Wert wird ignoriert
  - Button „Heute“, deaktiviert, solange heute angezeigt wird
  - Der gewählte Tag steht in der Adresse. Pfeile, Datumsfeld und „Heute“ navigieren auf die Adresse des
    neuen Tags, der Zurück-Button des Browsers springt zum vorherigen Tag.
- **Button „Buchung nachtragen“** öffnet `TimeEntryCreateDialog` (Regel 9).
- **Aktionen je Buchung** (`../../src/features/reports/components/time-entry-actions.tsx`):
  - „Bearbeiten“: Uhrzeit ändern, beim Kommen auch das Projekt. Der Tag bleibt gleich. Die Abfolge wird
    live geprüft, bei einem Problem ist „Speichern“ deaktiviert. An einem Krankheitstag steht der Hinweis
    aus `sick-leave.md`, Regel 8.
  - „Löschen“ (`time-entry-delete.tsx`): Rückfrage mit „Nur diese“ und „Mit Gegenstück“. Eine Variante,
    die die Abfolge verletzen würde, ist deaktiviert und nennt den Grund.
- **Ohne User:** „Bitte zuerst einen User anlegen und auswählen.“
- **Laden und Fehler** wie in `../../.claude/skills/architecture/views.md`: „Lade…“, bei einem Fehler
  die Meldung mit „Erneut versuchen“ (`ReportError` aus
  `../../src/features/reports/components/report-error.tsx`). Die Karten stehen schon während des Ladens
  da, mit den Werten aus den bis dahin vorhandenen Daten.

## Fragen zum Use Case

| Frage                        | Antwort                                                                                                                   |
|------------------------------|---------------------------------------------------------------------------------------------------------------------------|
| Wer möchte was?              | Der User sieht seinen Tagesbericht: `useShowDailyReport(day)`                                                             |
| Wer darf das?                | Jeder User für sich selbst, im User-Bereich. Der Server prüft (`ensureAccess` in `../../netlify/functions/lib/roles.ts`). |
| Welche Regeln gelten?        | Regeln 1 bis 10 oben, als Services in `../../shared/`                                                                     |
| Welche Daten werden geladen? | Buchungen, Projekte, Urlaube, Feiertage und Krankmeldungen des Users                                                      |
| Was kann schiefgehen?        | Laden schlägt fehl: Meldung mit „Erneut versuchen“                                                                        |
| Was ist danach wahr?         | Nichts, der Use Case liest nur. Schreiben erledigen die Use Cases der Buchungen (Regel 10).                               |
| Wer sieht das Ergebnis?      | Nur der User selbst                                                                                                       |

## Umsetzung nach der Architektur

Lesender Use Case: Views und Services, kein Repository. Alle Bausteine sind vorhanden.

| Baustein   | Datei                                                                                             | Inhalt                                                                                                                                                                             |
|------------|---------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Views      | `../../src/views/time-entries.ts`, `projects.ts`, `vacations.ts`, `holidays.ts`, `sick-leaves.ts` | `useTimeEntries`, `useProjects`, `useVacations`, `useHolidays`, `useSickLeaves`                                                                                                    |
| Service    | `../../shared/day-range.ts`                                                                       | `localDayRange`, `addDays`                                                                                                                                                         |
| Service    | `../../shared/time-report.ts`                                                                     | `dayTotals`: Arbeitszeit, Pausen, `running`, `missingGehen`; `dayDiffMs`: Differenz oder `null`                                                                                    |
| Service    | `../../shared/target-hours.ts`                                                                    | `targetMs`, `dayKind`                                                                                                                                                              |
| Service    | `../../shared/time-rules.ts`                                                                      | `localDay`, `firstBookingDay`, `nextType`, `buildPeriods`                                                                                                                          |
| Service    | `../../shared/sick-leave-rules.ts`                                                                | `isSickDay` für die Markierung, `withoutSickDays` steckt in `dayTotals`                                                                                                            |
| Use Case   | `../../src/features/reports/use-cases/use-show-daily-report.ts`                                   | `useShowDailyReport(day)`, liefert `rows` (`DailyReportRow` mit `ignored`), `totals`, `target`, `kind`, `holidayName`, `diff` (`null`: „–“), `next`, `isPending`, `error`, `retry` |
| Komponente | `../../src/features/reports/components/report-daily-edit.tsx`                                     | `ReportDailyEdit`, zeigt nur an, hält den gewählten Tag, zeigt heute die `StampCard`                                                                                               |
| Komponente | `../../src/features/reports/components/stamp-card.tsx`                                            | `StampCard` mit Use Case `useStampTime` (stempeln, Status, fehlendes Gehen)                                                                                                        |
| Komponente | `../../src/features/reports/utils/day-kind-label.ts`                                              | Hinweis zum Soll je `DayKind`                                                                                                                                                      |
| Seite      | `../../src/features/reports/components/report-daily-page.tsx`                                     | `ReportDailyPage`                                                                                                                                                                  |
| Routen     | `../../src/routes/user/reports/daily/index.tsx`, `daily/$day.tsx`                                 | `/user/reports/daily` und `/user/reports/daily/$day`, binden nur `ReportDailyPage` ein                                                                                             |
| Menü       | `../../src/application/navigation/nav-items.ts`                                                   | Eintrag `reports-daily`, Label „Heute“                                                                                                                                             |

Hinweise:

- Tage werden als Text `JJJJ-MM-TT` übergeben, die aktuelle Zeit als Parameter (`now`), nicht über
  `new Date()` im Service.
- Neue Berechnungen gehören in einen Service in `../../shared/`, nicht in die Komponente. Die Komponente
  formatiert nur.
- Ein neues Aggregat, das das Soll oder die Arbeitszeit beeinflusst, muss in `dayKind`/`targetMs` bzw.
  `dayTotals` eingehen. Dann rechnen Tages-, Wochen- und Monatsbericht gleich.

## Tests

Nach `../../.claude/skills/architecture/testing.md`. Vorhanden:

- **Service-Tests** ohne Mocks:
  - `../../shared/time-report.test.ts`, `describe("dayTotals")`: vollständiger Tag, laufender Zeitraum,
    Altdaten am Tageswechsel, Buchungen anderer Tage, ohne Buchungen, vergessenes Gehen, kein fehlendes
    Gehen am laufenden Tag; `describe("dayDiffMs")`: vergangene Tage, heute, Wochenende mit Arbeit,
    künftige Tage, freier Tag ohne Arbeit; `describe("Buchungen an Krankheitstagen")`
  - `../../shared/target-hours.test.ts`: `targetMs` und `dayKind` mit Reihenfolge der Tagesarten
  - `../../shared/time-rules.test.ts`: `nextType`, `firstBookingDay`
  - `../../shared/format.test.ts`: Formate
- **Routing:** Eintrag `"/user/reports/daily": "Heute"` in
  `../../src/tests/routes.test.tsx`

- **Komponenten-Test** `../../src/features/reports/components/report-daily.test.tsx`: Stempelkarte, Karten
  und „Buchung nachtragen“ erscheinen; die Stempelkarte nur am heutigen Tag

Wird eine Regel geändert, gehört der Test in den Service-Test, mit Gegenprobe (Regel absichtlich brechen,
Test muss fehlschlagen).

## Offene Punkte

Bewusst zurückgestellt, kommt später. Ohne Auftrag des Users nicht ändern:

1. **Meldung zum fehlenden Gehen** steht im Raster der Karten und belegt dort einen Platz wie eine Karte.
