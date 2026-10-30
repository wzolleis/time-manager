---
name: mcp-time-stamp-whole-day
description: Der MCP-Server bekommt das Tool add_time_entry_day. Es trägt einen ganzen Tag nach wie der Dialog
  „Buchung nachtragen“ im Modus „Ganzer Tag“, mit Beginn 08:00 und 8 h Arbeitszeit als Vorgabe.
type: change
changes: mcp-enable, time-stamp
epics: mcp, zeiterfassung
state: resolved
---

# Ganzen Tag über MCP nachtragen

„Der User trägt über einen Agent einen ganzen Tag mit seiner Arbeitszeit nach.“

Beispiele:

- „Trag für gestern einen ganzen Tag ein.“
- „Buche mir 9 h für gestern.“
- „Buche 9 h auf das Projekt Alpha am 27.10.“ Statt des Datums geht auch heute, gestern, vorgestern oder „am
  Montag“, der Agent rechnet es in `JJJJ-MM-TT` um.
- „Ich habe am Montag 7,5 Stunden für Alpha gearbeitet, ab 9 Uhr.“
- „Trag den 20. und 21. Oktober mit je 8 Stunden nach.“

Den ganzen Tag gibt es in der UI (`time-stamp-whole-day.md`, `../use-case/time-stamp.md`). Über MCP kann der
Agent heute nur einzelne Buchungen mit `add_time_entry` nachtragen, für einen Tag mit Pause also vier Aufrufe,
und er muss die Pause selbst berechnen. `add_time_entry_day` macht das in einem Aufruf mit denselben Regeln wie
die UI.

## Tool

| Tool                 | Eingabe                                                    | Ergebnis                              | Entspricht           | Hinweis (Annotation) |
|----------------------|------------------------------------------------------------|---------------------------------------|----------------------|----------------------|
| `add_time_entry_day` | `day`, `start?` (Standard 08:00), `workMinutes?` (Standard 480), `projectId?` | die angelegten Buchungen des Tages | `useAddTimeEntryDay` |                      |

- `day`: Tag `JJJJ-MM-TT` (`DaySchema`).
- `start`: Beginn `HH:mm` in Berliner Zeit (`TimeSchema`), Standard 08:00.
- `workMinutes`: Arbeitszeit in ganzen Minuten ohne Pause, > 0, Standard 480 (8 h). Beispiel: 7,5 h = 450.
- `projectId`: ID aus `list_projects`, gilt für jedes Kommen des Tages.

Beschreibung des Tools für den Agent:
„Trägt einen ganzen Tag nach: Aus Beginn und Arbeitszeit entstehen Kommen und Gehen, über 6 h mit einer Pause nach
6 h Arbeit (30 min, über 9 h 45 min). Höchstens 10 h, das Gehen muss am selben Tag liegen, und der Tag darf noch
keine Buchungen haben, sonst scheitert der Aufruf und nichts wird gebucht. Dann die Meldung dem User zeigen und
einzelne Buchungen mit add_time_entry anbieten. Ohne Angabe beginnt der Tag um 08:00 mit 8 h Arbeitszeit, die
Arbeitszeit in Minuten angeben (7,5 h = 450). Auch für Sätze wie ‚Buche mir 9 h für gestern‘ oder ‚Buche 9 h
auf das Projekt Alpha am 27.10.‘. day immer als JJJJ-MM-TT: Angaben wie heute, gestern, vorgestern oder ‚am
Montag‘ vorher in das Datum umrechnen. Ein Projekt per Name vorher mit list_projects in die ID auflösen, bei
keinem oder mehreren Treffern beim User nachfragen.“

## Ergebnis

Wie bei `add_time_entry` ein Text für den User und ein strukturiertes Ergebnis für den Agent.

**Text:**

```text
Nachgetragen am Mo, 26.10.: 08:00–14:00, 14:30–16:30 (8 Std Arbeit, 30 Min Pause).
<Hinweis an einem Krankheitstag>
```

**Strukturiert:**

| Feld          | Inhalt                                                        |
|---------------|---------------------------------------------------------------|
| `entries[]`   | die angelegten Buchungen nach Zeit, je `EntrySchema` (mit `id`) |
| `sickNotice`  | Hinweis, wenn der Tag ein Krankheitstag ist, sonst `null`     |

## Regeln

1. **Dieselben Regeln wie die UI.** Das Tool ruft `createDay` aus
   `../../netlify/functions/lib/time-entries-store.ts` auf. Pause, höchstens 10 h, Ende am selben Tag und ein Tag
   ohne Buchungen prüft dort `checkWorkDay`, die Buchungen berechnet `planWorkDay` (Regel 1 in
   `../boundaries/mcp-enable.md`).
2. **Alles oder nichts.** Scheitert eine Regel, legt das Tool keine Buchung an und liefert die Meldung als
   Tool-Fehler (`isError`, Regel 4 in `../boundaries/mcp-enable.md`).
3. **Dieselben Vorgaben wie die UI.** Beginn 08:00 und 8 h Arbeitszeit stehen einmal in `../../shared/time-rules.ts`
   und gelten für den Dialog und das Tool.
4. **Nur eigene Daten.** Gebucht wird für den User des API-Tokens, das Tool hat keine `userId`.
5. **Krankheitstage** wie bei `add_time_entry`: Buchen ist erlaubt, das Ergebnis enthält den Hinweis.

## Beispiele

| Der User sagt dem Agent                                   | Aufrufe des Agents                                                                       |
|-----------------------------------------------------------|------------------------------------------------------------------------------------------|
| „Trag für gestern einen ganzen Tag ein.“                  | `add_time_entry_day {day: <gestern>}` → 08:00–14:00, 14:30–16:30                         |
| „Buche mir 9 h für gestern.“                              | `add_time_entry_day {day: <gestern>, workMinutes: 540}` → 08:00–14:00, 14:30–17:30        |
| „Buche 9 h auf das Projekt Alpha am 27.10.“               | `list_projects` → `add_time_entry_day {day: "2026-10-27", workMinutes: 540, projectId: <Alpha>}` → 08:00–14:00, 14:30–17:30, beide Kommen mit Alpha |
| „Buche 9 h auf das Projekt Alpha für vorgestern.“         | wie oben, mit `day: <vorgestern>`                                                        |
| „Buche 9 h auf das Projekt Xyz für heute.“ (kein Projekt Xyz) | `list_projects` → kein Treffer, der Agent nennt die vorhandenen Projekte und fragt nach, nichts wird gebucht |
| „Am Montag 7,5 Stunden für Alpha, ab 9 Uhr.“              | `list_projects` → `add_time_entry_day {day: <Montag>, start: "09:00", workMinutes: 450, projectId: …}` → 09:00–15:00, 15:30–17:00 |
| „Trag den 20. und 21. Oktober mit je 8 Stunden nach.“     | zweimal `add_time_entry_day`, je ein Tag                                                 |
| „Gestern 4 Stunden.“                                      | `add_time_entry_day {day: <gestern>, workMinutes: 240}` → 08:00–12:00, ohne Pause        |
| „Gestern 11 Stunden.“                                     | `add_time_entry_day {…, workMinutes: 660}` → Fehler: höchstens 10 Stunden                |
| „Trag gestern einen ganzen Tag ein.“ (gestern hat schon Buchungen) | Fehler: Tag hat schon Buchungen. Der Agent zeigt die Meldung und bietet `add_time_entry` an |

## Umsetzung nach der Architektur
Umgesetzt wird nach dem Skill `architecture` (`../../.claude/skills/architecture`).

| Baustein   | Datei                                                                  | Inhalt |
|------------|------------------------------------------------------------------------|--------|
| Service    | `../../shared/time-rules.ts`                                           | `WORK_DAY_START = "08:00"` und `WORK_DAY_MINUTES = 480` als Vorgaben des ganzen Tages. |
| Komponente | `../../src/features/reports/components/time-entry-create-dialog.tsx`   | `DAY_START` und `DAY_WORK_TIME` durch die Vorgaben aus `time-rules.ts` ersetzen, die Arbeitszeit als `HH:mm` aus `WORK_DAY_MINUTES` bilden. |
| Tool       | `../../netlify/functions/lib/mcp-tools/time-entries.ts`                | neues Tool `add_time_entry_day` nach dem Muster von `add_time_entry`: Eingabe mit `DaySchema`, `TimeSchema`, `workMinutes` (`z.number().int().positive()`) und `ProjectIdSchema`, ruft `createDay` auf. Ergebnis mit `entryView` je Buchung und dem Hinweis an Krankheitstagen. |
| View       | `../../netlify/functions/lib/mcp-tools/view.ts`                        | `workDayText(entries)` für den Text des Ergebnisses: Tag, Paare `von–bis`, Arbeitszeit und Pause mit `formatDuration`. |
| Tests      | `../../netlify/functions/lib/mcp-tools/view.test.ts`                   | `describe("workDayText")`: ein Paar ohne Pause, zwei Paare mit 30 und 45 min Pause. |
| Walkthrough | `../../scripts/api-walkthrough.sh`                                    | `add_time_entry_day` für einen leeren Tag → vier Buchungen. Derselbe Tag noch einmal → `isError`, nichts gebucht. |
| Doku       | `../boundaries/mcp-enable.md`                                          | Zeile `add_time_entry_day` in der Tool-Tabelle, die Beispiele „Trag für gestern einen ganzen Tag ein.“ und „Am Montag 7,5 Stunden …“. |
| Doku       | `../use-case/time-stamp.md`                                            | beim ganzen Tag den Verweis auf das Tool, und dass die Vorgaben in `time-rules.ts` stehen. |
| Doku       | `../../README.md`                                                      | „stempeln, Buchungen nachtragen“ → „stempeln, Buchungen oder ganze Tage nachtragen“. |

## Fertig, wenn

- `add_time_entry_day` erscheint in `tools/list` mit Beschreibung und Schemas (MCP Inspector).
- Tests in `view.test.ts` und die bestehenden Tests laufen durch, Lint und Typen sind ohne Fehler.
- Der Walkthrough legt einen ganzen Tag an und lehnt den zweiten Versuch für denselben Tag ab.
