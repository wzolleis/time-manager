---
name: mcp-yearly-report
description: Der MCP-Server bekommt das Tool get_yearly_report. Es liefert den Jahresbericht wie die Seite /user/reports/yearly/JJJJ, mit einer Zeile pro Monat, Summen, Soll bis heute und Soll des Jahres.
type: change
changes: mcp-enable, yearly-report
epics: mcp, report
state: later
---

# Jahresbericht über MCP

„Der User fragt seinen Jahresbericht über einen Agent ab.“

Beispiele:

- „Wie viele Überstunden habe ich dieses Jahr?“
- „Zeig mir den Jahresbericht 2026.“
- „In welchem Monat habe ich am meisten gearbeitet?“

Der Jahresbericht ist in der UI umgesetzt (`../use-case/yearly-report.md`). Für Tag, Woche und Monat
gibt es die MCP-Tools schon (`../boundaries/mcp-enable.md`). `get_yearly_report` ergänzt das Jahr nach
demselben Muster wie `get_monthly_report`.

## Tool

| Tool                | Eingabe                                     | Ergebnis                                     | Entspricht            | Hinweis (Annotation) |
|---------------------|---------------------------------------------|----------------------------------------------|-----------------------|----------------------|
| `get_yearly_report` | `year?` (`JJJJ`, Standard aktuelles Jahr)    | Zeilen pro Monat, Summen, Soll bis heute und Soll des Jahres | `useShowYearlyReport` | readOnly |

Beschreibung des Tools für den Agent, wie bei den anderen Berichten mit dem Satz `SHOW_TABLE`:
„Jahresbericht mit einer Zeile pro Monat, Summen, Soll bis heute und Soll des Jahres. Die Differenz gilt
gegen das Soll bis heute, z. B. für Überstunden.“

## Ergebnis

Wie `get_monthly_report`: ein Text mit Markdown-Tabelle für den User und ein strukturiertes Ergebnis
(`outputSchema`) für den Agent.

**Text:**

```text
## 2026

| Monat   | Arbeit       | Soll    | Differenz |
|---------|--------------|---------|-----------|
| Januar  | –            | –       | –         |
| …       |              |         |           |
| Oktober | 80 Std, läuft | 176 Std | −8 Std    |
| …       |              |         |           |

<Zusammenfassung wie summaryLine, mit „des Jahres“>
```

**Strukturiert** (`YearlyReportSchema`, Felder wie `MonthlyReportSchema`):

| Feld                                         | Inhalt                                                            |
|----------------------------------------------|-------------------------------------------------------------------|
| `year`                                       | `JJJJ`                                                            |
| `months[]`                                   | je Monat: `month` (`JJJJ-MM`), `monthText` („Oktober“), `workMinutes`/`work`, `targetMinutes`/`target`, `diffMinutes`/`diff` (`null`: Monat in der Zukunft oder ohne Soll und Arbeit), `running` |
| `workMinutes`, `work`                        | Arbeitszeit des Jahres                                            |
| `targetToDateMinutes`, `targetToDate`        | Soll der Tage bis heute                                           |
| `targetYearMinutes`, `targetYear`            | Soll des ganzen Jahres                                            |
| `diffMinutes`, `diff`                        | gegen das Soll bis heute; `null` bei einem künftigen Jahr         |
| `running`                                    | läuft gerade eine Arbeitszeit                                     |

## Regeln

1. **Dieselben Zahlen wie die UI.** Gerechnet wird mit `yearTotals` aus `../../shared/time-report.ts`,
   nicht neu (Regel 2 in `../boundaries/mcp-enable.md`). Die Regeln stehen in `../use-case/yearly-report.md`.
2. **Nur der eigene Bericht.** Die Daten kommen wie bei den anderen Berichten über
   `loadReportData(user.id)` für den User des API-Tokens.
3. **Gültiges Jahr:** `year` ist vierstellig und ab 1970 (`isValidYear` aus `../../shared/week.ts`).
   Ein ungültiges Jahr scheitert an der Eingabeprüfung des Tools.
4. **Jahr vor der ersten Buchung:** Das Tool liefert den Bericht trotzdem, alle Monate haben dann kein
   Soll und „–“ als Differenz. Die Zusammenfassung nennt zusätzlich „Die Zeiterfassung beginnt <Jahr>.“
   (Jahr aus `firstBookingDay`, `../../shared/time-rules.ts`), damit der Agent das dem User erklären kann.

## Umsetzung

| Datei                                                        | Änderung |
|--------------------------------------------------------------|----------|
| `../../netlify/functions/lib/mcp-tools/report-view.ts`       | neu: `YearlyReportSchema` und `yearlyReport(data, year, now)`, nach dem Muster von `monthlyReport`; Monatsnamen mit `formatMonthName` aus `../../shared/format.ts` |
| `../../netlify/functions/lib/mcp-tools/reports.ts`           | neu: `YearSchema` (mit `isValidYear`) und das Tool `get_yearly_report`, Standard `localDay(now).slice(0, 4)` |
| `../../netlify/functions/lib/mcp-tools/report-view.test.ts`  | neu: `describe("yearlyReport")` |
| `../boundaries/mcp-enable.md`                                | Zeile `get_yearly_report` in der Tool-Tabelle; `yearTotals` in die Liste der Services in Regel 2 |
| `../../README.md`                                            | „Tages-, Wochen- und Monatsbericht“ → „…, Monats- und Jahresbericht“ |
| `../use-case/yearly-report.md`                               | Hinweis „folgt als eigener Change“ ersetzen durch den Verweis auf das Tool |

Geändert wird nach dem Skill `architecture` (`../../agents/.agents/skills/architecture`), zuerst
`../../agents/.agents/skills/architecture/use-case.md` lesen.

## Fertig, wenn

- Tests in `report-view.test.ts`: zwölf Monate; Summe und Differenz stimmen mit `yearTotals` überein;
  künftiges Jahr hat `diffMinutes: null`; Jahr vor der ersten Buchung nennt „Die Zeiterfassung beginnt“.
- `npx tsc --noEmit -p tsconfig.netlify.json` und `npx vitest run` laufen durch.
- Tool-Tabelle in `mcp-enable.md` und README sind ergänzt.
