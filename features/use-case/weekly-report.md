---
name: weekly-report
description: Beschreibt den Use Case Wochenbericht. Der User sieht für eine Kalenderwoche (Montag bis Sonntag) je Tag Soll, Arbeitszeit, Pausen, Differenz und Zahl der Buchungen, dazu die Summen der Woche.
type: story
epics: report
state: resolved
---

# Wochenbericht

„Der User sieht seinen Wochenbericht.“

Der User sieht für die laufende oder eine beliebige andere Kalenderwoche, wie viel er an jedem Tag
gearbeitet und Pause gemacht hat und wie das zum Soll steht. Der Wochenbericht hat eine Zeile pro Tag,
so wie der Monatsbericht (`monthly-report.md`) eine Zeile pro Kalenderwoche hat. Buchungen ändert der
User hier nicht, das geht im Tagesbericht (`today-report.md`).

Der Use Case ist umgesetzt. Diese Beschreibung hält fest, wie er sich verhält, damit Änderungen daran die
Regeln nicht verletzen. Code:

- Komponente `../../src/features/reports/components/report-weekly.tsx`, Seite
  `../../src/features/reports/components/report-weekly-page.tsx`, Route
  `../../src/routes/user/reports/weekly/index.tsx` (`/user/reports/weekly`) und `weekly/$week.tsx`
  (`/user/reports/weekly/2026-W43`)
- Use Case `../../src/features/reports/use-cases/use-show-weekly-report.ts`
- Services `weekTotals`, `dayTotals` und `dayDiffMs` in `../../shared/time-report.ts`, `targetMs` und
  `dayKind` in `../../shared/target-hours.ts`, `weekDays` und `isoWeek` in `../../shared/week.ts`,
  `firstBookingDay` in `../../shared/time-rules.ts`
- Views `useTimeEntries`, `useVacations`, `useHolidays`, `useSickLeaves` in `../../src/views/`
- MCP-Tool `get_weekly_report` in `../../netlify/functions/lib/mcp-tools/reports.ts` liefert denselben
  Bericht für einen Agent (`../boundaries/mcp-enable.md`)

Geändert wird nach dem Skill `architecture` (`../../agents/.agents/skills/architecture`), zuerst
`../../agents/.agents/skills/architecture/use-case.md` lesen.

## Inhalt

### Zeilen: eine pro Tag

Angezeigt werden die sieben Tage der Woche, Montag bis Sonntag (`weekDays`). Spalten:

| Spalte      | Inhalt                                                                      |
|-------------|-----------------------------------------------------------------------------|
| Tag         | z. B. „Mi., 21.10.“ (`formatDayShort`), dazu Hinweise, siehe unten          |
| Soll        | Tagessoll (`targetMs`), „–“ bei 0                                           |
| Arbeitszeit | Arbeitszeit des Tages (`dayTotals`), „–“ bei 0                              |
| Pausen      | Pausen des Tages, „–“ bei 0                                                 |
| Differenz   | Arbeitszeit minus Soll (`dayDiffMs`), „–“ für künftige und freie Tage ohne Arbeit |
| Buchungen   | Zahl der Buchungen an diesem Tag, „–“ bei 0                                 |

Hinweise in der Spalte „Tag“:

- **heute:** der heutige Tag ist fett und trägt „· heute“.
- **Urlaub / Feiertag / krank:** „Urlaub“, „Feiertag: <Name>“ bzw. „krank“ (`dayKindLabel`). Liegt ein
  Feiertag in einer Krankmeldung, steht dort der Feiertag (Reihenfolge in `dayKind`).
- **Gehen fehlt:** an einem vergangenen Tag fehlt zum letzten Kommen das Gehen (`missingGehen`).

### Kennzahlen oben

Vier Karten (Komponente `MetricCard` aus `../../src/components/cards/metric-card.tsx`):

- **Arbeitszeit:** Summe der Woche. Läuft gerade eine Arbeitszeit, der Hinweis „läuft noch“.
- **Pausen:** Summe der Woche.
- **Soll:** Soll der ganzen Woche (`targetWeekMs`). Hinweise, durch „·“ getrennt: Zahl der Urlaubs-,
  Feier- und Krankheitstage an Arbeitstagen, z. B. „1 Urlaubstag · 1 Feiertag · 2 Krankheitstage“, in
  der laufenden Woche dazu „bis heute: …“ (`targetToDateMs`).
- **Differenz:** Arbeitszeit minus Soll bis heute. In der laufenden Woche der Hinweis „gegen das Soll
  bis heute“. Liegt die ganze Woche in der Zukunft, steht dort „–“.

## Regeln

1. **Woche = Montag bis Sonntag**, Nummer und Jahr nach ISO 8601 (`isoWeek`): KW 1 ist die Woche mit
   dem ersten Donnerstag des Jahres. Die Woche über den Jahreswechsel gehört ganz zu einem Jahr, z. B.
   KW 53/2026 vom 28.12.2026 bis 03.01.2027.
2. **Soll eines Tages** (`targetMs` in `../../shared/target-hours.ts`): 8 Stunden an Arbeitstagen, 0 am
   Wochenende, vor Beginn der Zeiterfassung, an Feiertagen, an Krankheitstagen und im Urlaub. Die
   Reihenfolge steht in `dayKind`. Jeder Urlaubs-, Feier- oder Krankheitstag an einem Arbeitstag senkt
   das Wochensoll um ein Tagessoll.
3. **Soll erst ab Beginn der Zeiterfassung.** Vor dem Tag der ersten Buchung (`firstBookingDay`) ist das
   Soll 0, damit Tage davor keine Minusstunden ergeben. Gilt für alle Berichte, siehe Regel 6 in
   `monthly-report.md`.
4. **Arbeitszeit eines Tages** (`dayTotals`): Es gehen alle Buchungen des Users ein, damit Nachtschichten
   am Tageswechsel stimmen. Buchungen an Krankheitstagen zählen nicht (`sick-leave.md`, Regel 7), werden
   aber in der Spalte „Buchungen“ mitgezählt.
5. **Künftige Tage zählen nicht zur Differenz.** Die Differenz der Woche rechnet gegen das Soll der Tage
   bis einschließlich heute, damit sie mitten in der Woche aussagekräftig ist. Die Differenz eines Tages
   ist bei künftigen Tagen und bei freien Tagen ohne Arbeit leer („–“).
6. **Laufende Arbeitszeit** zählt bis jetzt (`now`) mit.

## Beispiel

Heute ist Mittwoch, der 21.10.2026, die Zeiterfassung läuft schon länger. Am Montag 8:30 h, am Dienstag
7:30 h gearbeitet, am Mittwoch bisher 4:00 h, Freitag 23.10. ist Urlaub:

| Tag                    | Soll  | Arbeitszeit  | Differenz     |
|------------------------|-------|--------------|---------------|
| Mo., 19.10.            | 8 Std | 8 Std 30 Min | +30 Min       |
| Di., 20.10.            | 8 Std | 7 Std 30 Min | −30 Min       |
| Mi., 21.10. · heute    | 8 Std | 4 Std        | −4 Std        |
| Do., 22.10.            | 8 Std | –            | –             |
| Fr., 23.10. Urlaub     | –     | –            | –             |
| Sa., 24.10., So., 25.10. | –   | –            | –             |

Kennzahlen: Soll 32 Std („1 Urlaubstag · bis heute: 24 Std“), Arbeitszeit 20 Std („läuft noch“, falls
der Mittwoch noch offen ist), Differenz −4 Std („gegen das Soll bis heute“). Formate aus
`../../shared/format.ts` (`formatDuration`, `formatDifference`).

## Bedienung

- Überschrift „Wochenbericht“. Darunter der Name des Users, die Woche und ihre Tage, z. B.
  „KW 43/2026 · 19.10. – 25.10.“.
- Navigation:
  - Pfeil „Vorherige Woche“ (←) und Pfeil „Nächste Woche“ (→)
  - Button „Diese Woche“: springt zur laufenden Woche, deaktiviert, solange sie angezeigt wird
- Beim Öffnen zeigt der Bericht die laufende Woche.
- Ohne ausgewählten User: „Bitte zuerst einen User anlegen und auswählen.“
- Laden und Fehler wie in `../../agents/.agents/skills/architecture/views.md`: „Lade…“, bei einem Fehler
  die Meldung mit „Erneut versuchen“ (`ReportError` aus
  `../../src/features/reports/components/report-error.tsx`).
- Adresse mit Woche (Change `../changes/report-links.md`): `/user/reports/weekly/2026-W43`, Format
  `JJJJ-Www` mit dem ISO-Wochenjahr aus `isoWeekId` (der 31.12.2026 liegt in `2026-W53`). Ohne Woche zeigt
  die Seite die aktuelle. Eine ungültige Woche (`2026-W54`) zeigt eine Fehlermeldung mit dem Link „Zur
  aktuellen Woche“. Blättern und „Diese Woche“ navigieren auf die Adresse der neuen Woche.
- Der Tag in der Spalte „Tag“ ist ein Link auf den Tagesbericht dieses Tags (`/user/reports/daily/JJJJ-MM-TT`).

## Fragen zum Use Case

| Frage                        | Antwort                                                          |
|------------------------------|------------------------------------------------------------------|
| Wer möchte was?              | Der User sieht seinen Wochenbericht: `useShowWeeklyReport(anchor)`, `anchor` ist irgendein Tag der Woche |
| Wer darf das?                | Jeder User für sich selbst, im User-Bereich. Der Server prüft.   |
| Welche Regeln gelten?        | Regeln 1 bis 6 oben, als Service in `../../shared/`              |
| Welche Daten werden geladen? | Buchungen, Urlaube, Feiertage und Krankmeldungen des Users       |
| Was kann schiefgehen?        | Laden schlägt fehl: Meldung mit „Erneut versuchen“               |
| Was ist danach wahr?         | Nichts, der Use Case liest nur                                   |
| Wer sieht das Ergebnis?      | Nur der User selbst                                              |

## Tests

- `../../shared/time-report.test.ts`, `describe("weekTotals")`: Differenz mitten in der Woche gegen das
  Soll bis heute, keine Differenz für künftige und freie Tage, Wochensoll an Urlaubs- und Feiertagen;
  dazu „Buchungen an Krankheitstagen“ und „Beginn der Zeiterfassung im Bericht“
- `../../shared/week.test.ts`: `weekDays`, `isoWeek` (auch über den Jahreswechsel)
- `../../shared/target-hours.test.ts`: `targetMs` und `dayKind`
- **Routing:** `"/user/reports/weekly": "Wochenbericht"` in `../../src/tests/routes.test.tsx`
- `../../src/features/reports/components/report-weekly.test.tsx`: Hinweis „krank“ und Zahl der
  Krankheitstage beim Soll, Feiertag in einer Krankmeldung zeigt den Feiertag
