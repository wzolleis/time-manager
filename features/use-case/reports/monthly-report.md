---
name: monthly-report
description: Beschreibt den Use Case Monatsbericht. Der User sieht Soll, Arbeitszeit und Differenz eines Monats, aufgeteilt nach Kalenderwochen.
---

# Monatsbericht

„Der User sieht seinen Monatsbericht.“

Der User sieht für den laufenden oder einen beliebigen anderen Monat, wie viel er gearbeitet hat und wie
das zum Soll steht. Der Monatsbericht hat eine Zeile pro Kalenderwoche, so wie der Wochenbericht eine
Zeile pro Tag hat.

Vorbild ist der Wochenbericht. Eine eigene Beschreibung gibt es dafür nicht, nur den Code:

- Komponente `src/features/reports/components/report-weekly.tsx`
- Use Case `src/features/reports/use-cases/use-show-weekly-report.ts`
- Service `weekTotals` in `shared/time-report.ts`

Umgesetzt wird nach dem Skill `architecture` (`agents/.agents/skills/architecture`), zuerst `use-case.md` lesen.

## Inhalt

### Zeilen: eine pro Kalenderwoche

Angezeigt werden alle Kalenderwochen, die mindestens einen Tag im gewählten Monat haben, aufsteigend
sortiert. Spalten:

| Spalte      | Inhalt                                                                  |
|-------------|-------------------------------------------------------------------------|
| Woche       | `KW <n>/<Jahr> (<von>–<bis>)`                                           |
| Soll        | Summe des Tagessolls der Tage dieser Woche im Monat                     |
| Arbeitszeit | Summe der Arbeitszeit der Tage dieser Woche im Monat                    |
| Differenz   | Arbeitszeit minus Soll der vergangenen Tage, siehe [Regeln](#regeln)    |

- `<n>` und `<Jahr>` sind Nummer und Jahr der ISO-Kalenderwoche, wie `isoWeek` in `shared/week.ts`
  sie liefert. So schreibt sie auch der Wochenbericht („KW 42/2026“).
- `<von>–<bis>` sind der erste und der letzte Tag der Woche **innerhalb des Monats**, ohne Jahr,
  im Format `TT.MM.`. Bei angebrochenen Wochen am Monatsanfang oder -ende sind das weniger als 7 Tage.
- Pausen und die Zahl der Buchungen zeigt der Monatsbericht nicht.

### Kennzahlen oben

Drei Karten wie im Wochenbericht (Komponente `Summary` aus `src/components/summary.tsx`):

- **Soll:** Soll aller Tage des Monats. Im laufenden Monat dazu der Hinweis „bis heute: …“.
- **Arbeitszeit:** Summe des Monats. Läuft gerade eine Arbeitszeit, der Hinweis „läuft noch“.
- **Differenz:** Arbeitszeit minus Soll bis heute. Im laufenden Monat der Hinweis „gegen das Soll bis
  heute“. Liegt der ganze Monat in der Zukunft, steht dort „–“.

## Regeln

1. **Nur Tage des Monats zählen.** Von einer Woche, die in den Vor- oder Folgemonat reicht, zählen nur
   die Tage im gewählten Monat. Die übrigen Tage werden ignoriert, auch in Soll und Arbeitszeit.
2. **Jahreswechsel.** Eine Woche über den Jahreswechsel zählt nur bis zum 31.12. bzw. ab dem 01.01.
   Das folgt schon aus Regel 1, weil der Jahreswechsel immer auch ein Monatswechsel ist.
3. **Künftige Tage zählen nicht zur Differenz.** Die Differenz einer Woche und des Monats wird nur gegen
   das Soll der Tage bis einschließlich heute gerechnet. Eine Woche, deren Tage im Monat alle in der
   Zukunft liegen, zeigt „–“ als Differenz.
4. **Soll eines Tages** wie im Wochenbericht: `targetMs` aus `shared/target-hours.ts`, also 8 Stunden
   an Arbeitstagen und 0 am Wochenende, an Feiertagen und im Urlaub.
5. **Arbeitszeit eines Tages** wie im Wochenbericht: `dayTotals` aus `shared/time-report.ts`. Dabei gehen
   alle Buchungen des Users ein, damit Nachtschichten am Tageswechsel stimmen.

## Beispiele

**Oktober 2026** (01.10. ist ein Donnerstag, 31.10. ein Samstag):

| Woche                       | Tage im Monat |
|-----------------------------|---------------|
| KW 40/2026 (01.10.–04.10.)  | 4             |
| KW 41/2026 (05.10.–11.10.)  | 7             |
| KW 42/2026 (12.10.–18.10.)  | 7             |
| KW 43/2026 (19.10.–25.10.)  | 7             |
| KW 44/2026 (26.10.–31.10.)  | 6             |

KW 40 beginnt eigentlich am 28.09., KW 44 endet eigentlich am 01.11. Diese Tage zählen nicht.

**Jahreswechsel:** KW 53/2026 geht vom 28.12.2026 bis 03.01.2027.

- Im Dezember 2026 erscheint sie als `KW 53/2026 (28.12.–31.12.)`.
- Im Januar 2027 erscheint sie als `KW 53/2026 (01.01.–03.01.)`, danach folgt `KW 1/2027 (04.01.–10.01.)`.

**Laufender Monat:** Ist heute Mittwoch, der 14.10.2026, rechnet die Differenz von KW 42 nur mit dem
Soll von Montag bis Mittwoch. KW 43 und KW 44 zeigen „–“ als Differenz.

## Bedienung

- Überschrift „Monatsbericht“. Darunter der Name des Users und der Monat, z. B. „Oktober 2026“.
- Navigation wie im Wochenbericht (`report-weekly.tsx`):
  - Pfeil „Vorheriger Monat“ (←) und Pfeil „Nächster Monat“ (→)
  - Button „Dieser Monat“, entspricht „Diese Woche“ im Wochenbericht: springt zurück zum laufenden
    Monat und ist deaktiviert, solange der laufende Monat angezeigt wird
- Beim Öffnen zeigt der Bericht den laufenden Monat.
- Laden und Fehler wie in `views.md`: „Lade…“, bei einem Fehler die Meldung mit „Erneut versuchen“
  (`ReportError` aus `src/features/reports/components/report-error.tsx`).

## Fragen zum Use Case

| Frage                         | Antwort                                                                |
|-------------------------------|------------------------------------------------------------------------|
| Wer möchte was?               | Der User sieht seinen Monatsbericht: `useShowMonthlyReport`            |
| Wer darf das?                 | Jeder User für sich selbst, im User-Bereich. Der Server prüft.         |
| Welche Regeln gelten?         | Regeln 1 bis 5 oben, als Service in `shared/`                          |
| Welche Daten werden geladen?  | Buchungen, Urlaube und Feiertage des Users                             |
| Was kann schiefgehen?         | Laden schlägt fehl: Meldung mit „Erneut versuchen“                     |
| Was ist danach wahr?          | Nichts, der Use Case liest nur                                         |
| Wer sieht das Ergebnis?       | Nur der User selbst                                                    |

## Umsetzung nach der Architektur

Lesender Use Case: Views und ein Service, kein Repository.

| Baustein   | Datei                                                         | Inhalt                                                       |
|------------|---------------------------------------------------------------|--------------------------------------------------------------|
| Views      | `src/views/time-entries.ts`, `vacations.ts`, `holidays.ts`    | vorhanden: `useTimeEntries`, `useVacations`, `useHolidays`   |
| Service    | `shared/week.ts`                                              | neu: die Wochen eines Monats mit ihren Tagen im Monat        |
| Service    | `shared/time-report.ts`                                       | neu: `monthTotals`, Summen je Woche und für den Monat        |
| Use Case   | `src/features/reports/use-cases/use-show-monthly-report.ts`   | neu: `useShowMonthlyReport(month)`, setzt Views und Service zusammen |
| Komponente | `src/features/reports/components/report-monthly.tsx`          | neu: zeigt nur an                                            |
| Seite      | `src/features/reports/components/report-monthly-page.tsx`     | neu: `ReportMonthlyPage`                                     |
| Route      | `src/routes/user/reports/monthly.tsx`                         | neu: `/user/reports/monthly`, bindet nur `ReportMonthlyPage` ein |
| Menü       | `src/application/navigation/nav-items.ts`                     | neuer Eintrag „Monatsbericht“ nach `reports-weekly`          |

Hinweise:

- `weekTotals(entries, days, …)` rechnet für eine beliebige Liste von Tagen. Übergibt man nur die Tage
  einer Woche, die im Monat liegen, gelten Regel 1 und 3 ohne weitere Logik. `monthTotals` kann darauf
  aufbauen.
- Der Monat wird als Text `JJJJ-MM` übergeben, wie Tage als `JJJJ-MM-TT` (siehe `service.md`).
- Die aktuelle Zeit kommt als Parameter in den Service (`today`, `now`), nicht über `new Date()`.

## Tests

Nach `testing.md`:

- **Service-Test** in `shared/time-report.test.ts` (und `shared/week.test.ts` für die Wochen eines
  Monats), ohne Mocks:
  - angebrochene Wochen am Monatsanfang und -ende zählen nur die Tage im Monat (Oktober 2026)
  - Woche über den Jahreswechsel (Dezember 2026 und Januar 2027)
  - im laufenden Monat zählen künftige Tage nicht zur Differenz
- **Routing:** Eintrag `"/user/reports/monthly": "Monatsbericht"` in `src/tests/routes.test.tsx`.
- Kein eigener Komponenten-Test nötig, solange die Komponente nur anzeigt.
