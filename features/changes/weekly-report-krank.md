---
name: weekly-report-krank
description: Der Wochenbericht zeigt an einem Krankheitstag in der Spalte „Tag“ den Hinweis „krank“, wie bei Urlaub und Feiertag. Die Karte „Soll“ nennt zusätzlich die Zahl der Krankheitstage.
type: change
changes: weekly-report
epics: report, krankmeldung
state: resolved
---

# Hinweis „krank“ im Wochenbericht

„Der User sieht im Wochenbericht, an welchen Tagen er krank war.“

Heute zeigt der Wochenbericht in der Spalte „Tag“ nur bei Urlaub („Urlaub“) und Feiertag
(„Feiertag: <Name>“) einen Hinweis. Ein Krankheitstag erkennt man nur daran, dass Soll und Arbeitszeit
„–“ sind, obwohl dort Buchungen liegen können. Das ist uneinheitlich:

- Der Tagesbericht zeigt beim Soll „krank“ (`sick-leave.md`, Regel 5).
- Das MCP-Tool `get_weekly_report` zeigt „krank“ schon an
  (`../../netlify/functions/lib/mcp-tools/report-view.ts`, Hinweise bei `vacation`, `holiday` und `sick`).

Beschreibung des Wochenberichts: `../use-case/weekly-report.md`. Regeln zur Krankmeldung:
`../use-case/sick-leave.md`.

## Verhalten

1. **Spalte „Tag“:** An einem Tag mit `kind === "sick"` steht nach dem Datum der Hinweis „krank“, im
   selben Stil wie „Urlaub“ (gedämpft, mit Abstand). Den Text liefert `dayKindLabel("sick")` aus
   `../../shared/format.ts`, er wird nicht in der Komponente neu geschrieben.
2. **Karte „Soll“:** Der Hinweis nennt neben Urlaubs- und Feiertagen auch die Krankheitstage, z. B.
   „1 Urlaubstag · 2 Krankheitstage · bis heute: 16 Std“ (Reihenfolge: Urlaub, Feiertag, krank).
   Einzahl „1 Krankheitstag“, Mehrzahl „2 Krankheitstage“. Gezählt werden wie bei Urlaub nur Tage mit `kind === "sick"`, also keine
   Krankheitstage am Wochenende, an Feiertagen oder vor Beginn der Zeiterfassung (Reihenfolge in
   `dayKind`, `../../shared/target-hours.ts`).
3. **Feiertag geht vor.** Liegt ein Feiertag in der Krankmeldung, ist `kind` dort `"holiday"`
   (`dayKind`), der Hinweis ist also „Feiertag: <Name>“, nicht „krank“. Das braucht keine eigene Logik.
4. Sonst ändert sich nichts: Soll, Arbeitszeit, Differenz und die Zahl der Buchungen bleiben wie
   bisher berechnet.

## Umsetzung

Nur die Komponente `../../src/features/reports/components/report-weekly.tsx`:

- In der Spaltendefinition `columns`, Spalte `day`: die Bedingung
  `row.original.kind === "vacation" || row.original.kind === "holiday"` um `"sick"` erweitern.
- In `ReportWeekly`: neben `vacationDays` und `holidayDays` ein `sickDays` zählen und in `targetHint`
  nach den Feiertagen einfügen: „1 Urlaubstag · 1 Feiertag · 2 Krankheitstage · bis heute: …“.

Use Case (`use-show-weekly-report.ts`), Services und Views bleiben unverändert, `kind` steht schon in
jeder Zeile (`WeekDayTotals` in `../../shared/time-report.ts`).

Geändert wird nach dem Skill `architecture` (`../../.claude/skills/architecture`), zuerst
`../../.claude/skills/architecture/use-case.md` lesen.

## Fertig, wenn

- **Komponenten-Test** `../../src/features/reports/components/report-weekly.test.tsx` (neu, nach dem
  Muster von `report-daily.test.tsx`): Eine Woche mit einer Krankmeldung zeigt beim Krankheitstag „krank“
  und in der Karte „Soll“ „1 Krankheitstag“; ein Feiertag innerhalb der Krankmeldung zeigt
  „Feiertag: …“ statt „krank“.
- `../use-case/weekly-report.md` beschreibt den Hinweis „krank“ in „Hinweise in der Spalte Tag“ und in
  der Karte „Soll“; der Satz „Krankheitstage tragen keinen Hinweis“ entfällt.
- Typprüfung und `npx vitest run` laufen durch.
