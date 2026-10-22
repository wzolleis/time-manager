---
name: report-links
description: Tag, Woche und Monat eines Berichts stehen im Pfad der Seite (/user/reports/daily/2026-10-21, /user/reports/weekly/2026-W43, /user/reports/monthly/2026-10). Im Wochenbericht führt jeder Tag per Link zum Tagesbericht, im Monatsbericht jede Kalenderwoche zum Wochenbericht, im Jahresbericht jeder Monat zum Monatsbericht.
type: change
changes: today-report, weekly-report, monthly-report, yearly-report
epics: report
state: open
---

# Berichte verlinken

„Der User wechselt von einem Bericht in den Bericht eines enthaltenen Zeitraums.“

Ein Bericht enthält die Zeiträume des nächstkleineren Berichts: Der Monatsbericht hat eine Zeile pro
Kalenderwoche, der Wochenbericht eine Zeile pro Tag. Der User klickt auf eine solche Zeile und sieht
den Bericht dieses Zeitraums:

- Wochenbericht, Zeile „Mi 21.10.“ → Tagesbericht vom 21.10.2026
- Monatsbericht, Zeile „KW 43/2026“ → Wochenbericht der KW 43/2026
- Jahresbericht, Zeile „Oktober“ → Monatsbericht Oktober 2026

Dazu bekommt jeder Bericht eine eigene Adresse, in der sein Zeitraum steht. Sie lässt sich auch als
Lesezeichen speichern oder weitergeben, und der Zurück-Button des Browsers springt zum vorherigen
Zeitraum.

Betroffen sind nur die Seiten der Anwendung (TanStack Router), nicht die REST-API: Die Berichte werden
im Browser aus Buchungen, Urlauben, Feiertagen und Krankmeldungen berechnet, es gibt keinen
Report-Endpoint. Die MCP-Tools (`get_daily_report` usw.) bleiben unverändert.

## Adressen

| Bericht | Adresse                         | Zeitraum im Pfad                         |
|---------|---------------------------------|------------------------------------------|
| Tag     | `/user/reports/daily/2026-10-21`  | Tag `JJJJ-MM-TT`                         |
| Woche   | `/user/reports/weekly/2026-W43`   | ISO-Woche `JJJJ-Www`, z. B. `2026-W43`, `2027-W01` |
| Monat   | `/user/reports/monthly/2026-10`   | Monat `JJJJ-MM`                          |

- Die Woche braucht das Jahr, denn „KW 43“ gibt es in jedem Jahr. Das Jahr ist das ISO-Wochenjahr aus
  `isoWeek` (`../../shared/week.ts`): Der 31.12.2026 liegt in `2026-W53`, der 01.01.2027 ebenfalls.
- Ohne Zeitraum (`/user/reports/daily`, `/weekly`, `/monthly`) zeigt die Seite wie heute den aktuellen
  Tag, die aktuelle Woche oder den aktuellen Monat. Die Menüeinträge in
  `../../src/application/navigation/nav-items.ts` bleiben deshalb unverändert.
- Ein ungültiger Zeitraum (`2026-13`, `2026-W54`, `2026-02-30`) zeigt eine Fehlermeldung mit einem
  Link auf den aktuellen Zeitraum, keine leere Seite.

## Verhalten

1. **Links nach unten:** Im Wochenbericht ist der Tag in der Spalte „Tag“ ein Link auf den Tagesbericht.
   Im Monatsbericht ist die Woche in der Spalte „Woche“ ein Link auf den Wochenbericht. Im
   Jahresbericht ist der Monat in der Spalte „Monat“ ein Link auf den Monatsbericht. Der Jahresbericht
   (`../use-case/yearly-report.md`) hat seine Adresse `/user/reports/yearly/JJJJ` schon und bekommt
   in diesem Change nur die Links. Es sind echte
   Links (`<Link>` von TanStack Router), damit Öffnen in neuem Tab funktioniert.
2. **Blättern ändert die Adresse:** „Vorheriger/Nächster Tag“, „Vorherige/Nächste Woche“,
   „Vorheriger/Nächster Monat“, „Heute“/„Diese Woche“/„Dieser Monat“ und die Tagesauswahl im
   Tagesbericht navigieren auf die Adresse des neuen Zeitraums, statt nur den State zu ändern.
3. **Kein Link nach oben** gehört zu diesem Change (z. B. vom Tag zur Woche).
4. Was ein Bericht anzeigt, ändert sich nicht. Nur woher der Zeitraum kommt: aus dem Pfad statt aus
   `useState`.

## Heutiger Stand

Der Zeitraum steht im State der Komponente und geht beim Neuladen verloren:

- `../../src/features/reports/components/report-daily-edit.tsx`: `useState` für `day`
- `../../src/features/reports/components/report-weekly.tsx`: `useState` für `anchor` (irgendein Tag der Woche)
- `../../src/features/reports/components/report-monthly.tsx`: `useState` für `month`

Die Use Cases bekommen den Zeitraum schon als Parameter und bleiben unverändert:
`useShowDailyReport(day)`, `useShowWeeklyReport(anchor)`, `useShowMonthlyReport(month)` in
`../../src/features/reports/use-cases/`.

## Umsetzung

| Art        | Datei                                                        | Änderung |
|------------|--------------------------------------------------------------|----------|
| Service    | `../../shared/week.ts`                                       | neu: `isoWeekId(day)` → `"2026-W43"` und `parseIsoWeek(id)` → Montag der Woche oder `null` bei ungültiger Angabe; dazu `isValidMonth(month)`. Tage prüft schon `isValidDay` in `../../shared/day-range.ts`. |
| Routen     | `../../src/routes/user/reports/`                             | je Bericht eine Route ohne und eine mit Parameter, z. B. `daily/index.tsx` und `daily/$day.tsx`; ebenso `weekly/$week.tsx`, `monthly/$month.tsx`. Die Routen binden nur die Seite ein und reichen den Parameter weiter. `../../src/routeTree.gen.ts` wird vom Router-Plugin erzeugt, nicht von Hand geändert. |
| Seiten     | `report-daily-page.tsx`, `report-weekly-page.tsx`, `report-monthly-page.tsx` in `../../src/features/reports/components/` | nehmen den Zeitraum (oder `undefined` = aktuell) entgegen und geben ihn an die Komponente |
| Komponenten | `report-daily-edit.tsx`, `report-weekly.tsx`, `report-monthly.tsx` | Zeitraum aus Props statt `useState`; Blättern mit `useNavigate`; im Wochenbericht Spalte „Tag“, im Monatsbericht Spalte „Woche“ als `<Link>` |

Hinweise:

- Keine zusätzliche Bibliothek für URL-State (z. B. nuqs). Pfad-Parameter und Navigation liefert
  TanStack Router selbst: `Route.useParams()`, `useNavigate()`, `<Link params={…}>`.
- Den Zeitraum validiert der Service, nicht die Komponente. Die Route ruft ihn auf und zeigt bei `null`
  die Fehlermeldung.
- Die aktuelle Zeit kommt als Parameter in den Service (`today`), nicht über `new Date()` im Service.
- Die Spalten der Tabellen sind außerhalb der Komponente definiert und sollen es bleiben. Der Link
  braucht nur Werte aus der Zeile (`row.original.day` bzw. `year`/`week`), keine Werte aus der Komponente.

Geändert wird nach dem Skill `architecture` (`../../agents/.agents/skills/architecture`), zuerst
`../../agents/.agents/skills/architecture/use-case.md` lesen. Beschreibungen der betroffenen Use Cases:
`../use-case/today-report.md`, `../use-case/weekly-report.md`, `../use-case/monthly-report.md` und
`../use-case/yearly-report.md`.

## Fertig, wenn

- **Service-Tests** in `../../shared/week.test.ts`: `isoWeekId` und `parseIsoWeek` hin und zurück,
  auch über den Jahreswechsel (`2026-12-31` → `2026-W53`, `2027-01-04` → `2027-W01`), ungültige Angaben
  (`2026-W00`, `2026-W54`, `2026-43`) ergeben `null`; `isValidMonth` mit `2026-00`, `2026-13`.
- **Komponenten-Tests** in `../../src/features/reports/components/`: Klick auf einen Tag im
  Wochenbericht öffnet den Tagesbericht dieses Tags; Klick auf eine Woche im Monatsbericht öffnet den
  Wochenbericht dieser Woche; „Nächster Tag“ ändert die Adresse.
- **Routing** in `../../src/tests/routes.test.tsx`: die neuen Adressen mit Zeitraum, z. B.
  `"/user/reports/daily/2026-10-21": "Heute"`, und die bestehenden ohne Zeitraum funktionieren weiter.
- Die Beschreibungen `../use-case/today-report.md`, `../use-case/weekly-report.md` und
  `../use-case/monthly-report.md` nennen die neuen Adressen.
- Typprüfung und `npx vitest run` laufen durch.
