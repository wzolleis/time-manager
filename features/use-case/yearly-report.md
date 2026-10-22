---
name: yearly-report
description: Beschreibt den Use Case Jahresbericht. Der User sieht Soll, Arbeitszeit und Differenz eines Jahres, aufgeteilt nach Monaten, mit Kennzahlen für das ganze Jahr. Das Jahr steht in der Adresse (/user/reports/yearly/2026).
type: story
epics: report
state: resolved
---

# Jahresbericht

„Der User sieht seinen Jahresbericht.“

Der User sieht für das laufende oder ein beliebiges anderes Jahr, wie viel er gearbeitet hat und wie das
zum Soll steht. Der Jahresbericht hat eine Zeile pro Monat, so wie der Monatsbericht eine Zeile pro
Kalenderwoche und der Wochenbericht eine Zeile pro Tag hat. Oben stehen die Kennzahlen des Jahres.

Vorbild ist der Monatsbericht, beschrieben in `monthly-report.md`. Code:

- Komponente `../../src/features/reports/components/report-monthly.tsx`, Seite
  `../../src/features/reports/components/report-monthly-page.tsx`
- Use Case `../../src/features/reports/use-cases/use-show-monthly-report.ts`
- Service `monthTotals` in `../../shared/time-report.ts`

Die Adresse mit Zeitraum aus dem Change `../changes/report-links.md` gilt für den Jahresbericht von
Anfang an: Das Jahr steht im Pfad, nicht im State der Komponente.

Umgesetzt wird nach dem Skill `architecture` (`../../agents/.agents/skills/architecture`), zuerst
`../../agents/.agents/skills/architecture/use-case.md` lesen.

## Adresse

| Adresse                       | Inhalt                                    |
|-------------------------------|-------------------------------------------|
| `/user/reports/yearly`        | das laufende Jahr                         |
| `/user/reports/yearly/2026`   | das Jahr 2026, Format `JJJJ`              |

- Ein ungültiges Jahr (`26`, `2026x`, `0000`) zeigt eine Fehlermeldung mit einem Link auf das laufende
  Jahr, keine leere Seite. Gültig sind vierstellige Jahre ab 1970 (`isValidYear`).
- **Frühestes Jahr ist das Jahr der ersten Buchung** (`firstBookingDay`), ohne Buchungen das laufende
  Jahr. In diesem Jahr ist „Vorheriges Jahr“ deaktiviert. Ein früheres Jahr in der Adresse zeigt statt
  Tabelle und Karten den Hinweis „Die Zeiterfassung beginnt 2026.“ mit einem Link auf dieses Jahr.
- Blättern („Vorheriges Jahr“, „Nächstes Jahr“, „Dieses Jahr“) navigiert auf die Adresse des neuen
  Jahres, damit Zurück-Button und Lesezeichen funktionieren.

## Inhalt

### Zeilen: eine pro Monat

Angezeigt werden die zwölf Monate des Jahres, Januar bis Dezember. Spalten wie im Monatsbericht:

| Spalte      | Inhalt                                                               |
|-------------|----------------------------------------------------------------------|
| Monat       | Name des Monats, z. B. „Oktober“                                     |
| Soll        | Soll des Monats (`targetMonthMs`), „–“ bei 0                         |
| Arbeitszeit | Arbeitszeit des Monats, „–“ bei 0; läuft gerade eine, „läuft noch“   |
| Differenz   | Arbeitszeit minus Soll bis heute, siehe [Regeln](#regeln)            |

Ein Monat, der ganz in der Zukunft liegt oder bis heute weder Soll noch Arbeitszeit hat (z. B. vor dem
Beginn der Zeiterfassung), zeigt „–“ als Differenz, wie eine Woche im Monatsbericht.

### Kennzahlen oben (Zusammenfassung)

Drei Karten wie im Monatsbericht (Komponente `Summary` aus `../../src/components/summary.tsx`):

- **Soll:** Soll aller Monate des Jahres. Im laufenden Jahr dazu der Hinweis „bis heute: …“.
- **Arbeitszeit:** Summe des Jahres. Läuft gerade eine Arbeitszeit, der Hinweis „läuft noch“.
- **Differenz:** Arbeitszeit minus Soll bis heute. Im laufenden Jahr der Hinweis „gegen das Soll bis
  heute“. Liegt das ganze Jahr in der Zukunft, steht dort „–“.

## Regeln

1. **Ein Monat zählt so wie im Monatsbericht.** Soll, Arbeitszeit und Differenz eines Monats sind genau
   die Summen aus `monthTotals` für diesen Monat. Der Jahresbericht rechnet nichts Eigenes, er addiert.
2. **Kein Tag doppelt.** Kalenderwochen über eine Monatsgrenze zählen im Monatsbericht nur mit den Tagen
   im Monat (Regel 1 in `monthly-report.md`). Deshalb ergibt die Summe der zwölf Monate jeden Tag des
   Jahres genau einmal, auch bei KW 1 und KW 52/53 am Jahreswechsel.
3. **Künftige Tage zählen nicht zur Differenz.** Die Differenz eines Monats und des Jahres rechnet gegen
   das Soll der Tage bis einschließlich heute (`targetToDateMs`).
4. **Soll eines Tages** wie in allen Berichten: `targetMs` aus `../../shared/target-hours.ts` (8 Stunden
   an Arbeitstagen, 0 am Wochenende, an Feiertagen, an Krankheitstagen, im Urlaub und vor Beginn der
   Zeiterfassung).
5. **Soll erst ab Beginn der Zeiterfassung** (Regel 6 in `monthly-report.md`). Beginnt die Erfassung
   mitten im Jahr, haben die Monate davor kein Soll und zeigen „–“ als Differenz.

## Beispiele

**Laufendes Jahr:** Heute ist Mittwoch, der 21.10.2026, die erste Buchung war am 01.03.2026.

- **Januar, Februar:** Soll „–“, Differenz „–“ (vor Beginn der Zeiterfassung).
- **März bis September:** Soll, Arbeitszeit und Differenz wie im jeweiligen Monatsbericht.
- **Oktober:** Soll des ganzen Monats, Differenz nur gegen das Soll bis 21.10.
- **November, Dezember:** Soll des Monats, Arbeitszeit „–“, Differenz „–“ (Zukunft).
- **Karten:** Soll des Jahres ab März mit „bis heute: …“, Differenz „gegen das Soll bis heute“.

**Jahreswechsel:** KW 53/2026 geht vom 28.12.2026 bis 03.01.2027. Im Jahresbericht 2026 zählen nur der
28.12. bis 31.12. (im Dezember), im Jahresbericht 2027 nur der 01.01. bis 03.01. (im Januar).

## Bedienung

- Überschrift „Jahresbericht“. Darunter der Name des Users und das Jahr, z. B. „Test · 2026“.
- Navigation wie im Monatsbericht:
  - Pfeil „Vorheriges Jahr“ (←), deaktiviert im Jahr der ersten Buchung, und Pfeil „Nächstes Jahr“ (→)
  - Button „Dieses Jahr“: springt zum laufenden Jahr, deaktiviert, solange es angezeigt wird
- Ohne ausgewählten User: „Bitte zuerst einen User anlegen und auswählen.“
- Laden und Fehler wie in `../../agents/.agents/skills/architecture/views.md`: „Lade…“, bei einem Fehler
  die Meldung mit „Erneut versuchen“ (`ReportError` aus
  `../../src/features/reports/components/report-error.tsx`).
- Menü: neuer Eintrag „Jahr“ nach „Monat“ (`reports-yearly`, `/user/reports/yearly`).
- Ein MCP-Tool `get_yearly_report` folgt als eigener Change.
- Links von jedem Monat zum Monatsbericht (`/user/reports/monthly/2026-10`) kommen mit dem Change
  `../changes/report-links.md`, weil der Monatsbericht erst dann eine Adresse mit Monat hat.

## Fragen zum Use Case

| Frage                        | Antwort                                                          |
|------------------------------|------------------------------------------------------------------|
| Wer möchte was?              | Der User sieht seinen Jahresbericht: `useShowYearlyReport(year)` |
| Wer darf das?                | Jeder User für sich selbst, im User-Bereich. Der Server prüft.   |
| Welche Regeln gelten?        | Regeln 1 bis 5 oben, als Service in `../../shared/`              |
| Welche Daten werden geladen? | Buchungen, Urlaube, Feiertage und Krankmeldungen des Users       |
| Was kann schiefgehen?        | Laden schlägt fehl: Meldung mit „Erneut versuchen“; ungültiges Jahr in der Adresse: Fehlermeldung mit Link aufs laufende Jahr |
| Was ist danach wahr?         | Nichts, der Use Case liest nur                                   |
| Wer sieht das Ergebnis?      | Nur der User selbst                                              |

## Umsetzung nach der Architektur

Lesender Use Case: Views und ein Service, kein Repository.

| Baustein   | Datei                                                             | Inhalt                                                                 |
|------------|-------------------------------------------------------------------|------------------------------------------------------------------------|
| Views      | `../../src/views/time-entries.ts`, `vacations.ts`, `holidays.ts`, `sick-leaves.ts` | vorhanden: `useTimeEntries`, `useVacations`, `useHolidays`, `useSickLeaves` |
| Service    | `../../shared/week.ts`                                            | neu: `isValidYear(year)`, `yearMonths(year)` → `["2026-01", …, "2026-12"]` |
| Service    | `../../shared/format.ts`                                          | neu: `formatMonthName(month)` → „Oktober“ (wie `formatMonth`, ohne Jahr) |
| Service    | `../../shared/time-report.ts`                                     | neu: `yearTotals`, ruft `monthTotals` je Monat auf und summiert        |
| Use Case   | `../../src/features/reports/use-cases/use-show-yearly-report.ts`  | neu: `useShowYearlyReport(year)`, wie `useShowMonthlyReport`, dazu `firstYear` |
| Komponente | `../../src/features/reports/components/report-yearly.tsx`         | neu: zeigt nur an; Jahr aus Props, Blättern mit `useNavigate`          |
| Seite      | `../../src/features/reports/components/report-yearly-page.tsx`    | neu: `ReportYearlyPage`, liest das Jahr mit `useParams({strict: false})` und prüft es mit `isValidYear` |
| Routen     | `../../src/routes/user/reports/yearly/index.tsx`, `yearly/$year.tsx` | neu: binden nur `ReportYearlyPage` ein |
| Menü       | `../../src/application/navigation/nav-items.ts`                   | neue ID `reports-yearly`, Eintrag „Jahr“ nach `reports-monthly`        |

Hinweise:

- Das Jahr wird als Text `JJJJ` übergeben, wie der Monat als `JJJJ-MM` und der Tag als `JJJJ-MM-TT`.
- `yearTotals` liefert je Monat dieselben Felder wie eine Woche in `MonthTotals` (`targetMs`, `workMs`,
  `running`, `diffMs`) und für das Jahr `targetYearMs`, `targetToDateMs`, `workMs`, `diffMs`, `running`.
- Die aktuelle Zeit kommt als Parameter in den Service (`today`, `now`), nicht über `new Date()`.
- Keine zusätzliche Bibliothek für URL-State (z. B. nuqs), siehe `../changes/report-links.md`.
- `../../src/routeTree.gen.ts` erzeugt das Router-Plugin, nicht von Hand ändern.

## Tests

Nach `../../agents/.agents/skills/architecture/testing.md`, jede Regel mit Gegenprobe:

- **Service-Tests** ohne Mocks:
  - `../../shared/time-report.test.ts`, `yearTotals`: Summe der Monate = Summe aller Tage (Regel 2, mit
    Jahreswechsel 2026/2027), im laufenden Jahr nur Soll bis heute (Regel 3), Beginn der Zeiterfassung
    mitten im Jahr (Regel 5)
  - `../../shared/week.test.ts`: `yearMonths`, `isValidYear` mit `2026`, `26`, `2026x`, `0000`
  - `../../shared/format.test.ts`: `formatMonthName`
- **Komponenten-Test** `../../src/features/reports/components/report-yearly.test.tsx`: zwölf Zeilen,
  Blättern über die Adresse, „Vorheriges Jahr“ im ersten Jahr deaktiviert, Jahr vor der ersten Buchung
  zeigt den Hinweis mit Link, ungültiges Jahr zeigt die Fehlermeldung mit Link
- **Routing** in `../../src/tests/routes.test.tsx`: `"/user/reports/yearly": "Jahresbericht"`. Routen
  mit Parameter prüft dieser Test nicht, die deckt der Komponenten-Test ab.
