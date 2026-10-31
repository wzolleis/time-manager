---
name: time-stamp-period
description: Der ganze Tag wird zum Zeitraum. Der User bucht eine Arbeitszeit auch an einem Tag mit Buchungen, das
  Backend legt das neue Buchungspaar nach dem letzten Gehen an und plant die nötige Pause mit ein. Für UI und MCP.
type: change
changes: time-stamp, mcp-enable
epics: zeiterfassung, mcp
state: resolved
---

# Einen Zeitraum nachtragen

„Der User bucht eine Arbeitszeit, und das Backend findet den passenden Platz am Tag.“

Beispiele:

- „Buche mir heute noch 2 h.“ (heute 08:00–12:00 gebucht)
- „Ich habe gestern nach dem Feierabend noch 1,5 h für Alpha gearbeitet.“

# Was ist das Problem
Einen ganzen Tag gibt es nur für einen Tag ohne Buchungen (`time-stamp-whole-day.md`,
`mcp-time-stamp-whole-day.md`). Hat der Tag schon Buchungen, muss der User Kommen und Gehen einzeln nachtragen und
die Pause selbst ausrechnen, auch über MCP.

# Was soll sich ändern
Der ganze Tag wird zum Zeitraum. Ist der Tag leer, gilt alles wie bisher. Hat er schon Buchungen, legt das Backend
das neue Buchungspaar nach dem letzten Gehen des Tages an. Die Sperre „Nur ein leerer Tag“ fällt weg.

Eingaben wie beim ganzen Tag: Tag, Arbeitszeit, optional Beginn und Projekt.

Regeln für einen Tag mit Buchungen:

1. **Kein offenes Kommen.** Ist die letzte Buchung des Tages ein Kommen, wird nichts gebucht: „Erst das Gehen um …
   buchen“. Ein offenes Kommen eines früheren Tages verhindert die Buchung wie bisher (Regel 2 und 4 in
   `../use-case/time-stamp.md`).
2. **Nach dem letzten Gehen.** Das neue Kommen liegt nach dem letzten Gehen des Tages. Ohne Beginn so früh wie
   möglich, mit Beginn zu dieser Uhrzeit. Ein Beginn vor dem frühestmöglichen wird abgelehnt: „Beginn frühestens um
   HH:mm“.
3. **Höchstens 10 h** Arbeitszeit am Tag, vorhandene und neue zusammen.
4. **Am selben Tag.** Das letzte Gehen liegt vor Mitternacht (Regel 3 in `../use-case/time-stamp.md`).
5. **Pflichtpause für den ganzen Tag.** Die gesamte Arbeitszeit des Tages mit der neuen bestimmt die Pause wie beim
   ganzen Tag: bis 6 h keine, über 6 h bis 9 h 30 min, über 9 h 45 min (`breakMinutes`). Vorhandene Pausen des Tages
   werden angerechnet, auch der Abstand zwischen dem letzten Gehen und dem neuen Kommen. Nur der fehlende Rest wird
   eingeplant.
6. **Fehlender Rest vor dem neuen Kommen.** Der fehlende Rest liegt zwischen dem letzten Gehen und dem neuen Kommen.
   Fehlt nichts, liegt das neue Kommen 1 min nach dem letzten Gehen, denn zwei Buchungen zur selben Zeit sind nicht
   erlaubt (Regel 5 in `../use-case/time-stamp.md`). Die 1 min zählt als Pause wie jeder andere Abstand.
7. **Höchstens 6 h am Stück.** Ist die neue Arbeitszeit länger als 6 h, wird sie nach 6 h geteilt wie beim ganzen
   Tag. Der fehlende Rest der Pause liegt dann dort, mindestens 15 min, und das neue Kommen liegt 1 min nach dem
   letzten Gehen. Diese 1 min wird hier nicht angerechnet, damit die Pause nach 6 h volle 30 oder 45 min dauert.
8. **Projekt** wie beim ganzen Tag: gilt für jedes neue Kommen (Regel 6).

Vorgaben:

- **Leerer Tag:** Beginn 08:00, Arbeitszeit 8 h, wie bisher (`WORK_DAY_START`, `WORK_DAY_MINUTES`).
- **Tag mit Buchungen:** Beginn leer (so früh wie möglich), Arbeitszeit ohne Vorgabe. Die UI lässt das Feld leer,
  über MCP ist `workMinutes` dann Pflicht.

# Beispiele

Vorhandene Buchungen des Tages, dann die Eingabe.

| Vorhanden                          | Eingabe              | Neue Buchungen            | Rechnung                                             |
|------------------------------------|----------------------|---------------------------|------------------------------------------------------|
| –                                  | 8 h                  | 08:00–14:00, 14:30–16:30  | wie bisher beim ganzen Tag                           |
| 08:00–12:00                        | 1 h                  | 12:01–13:01               | 5 h am Tag, keine Pause nötig, 1 min Abstand         |
| 08:00–12:00                        | 3 h                  | 12:30–15:30               | 7 h, 30 min Pause nötig, keine vorhanden             |
| 08:00–12:00                        | 3 h, Beginn 13:00    | 13:00–16:00               | Abstand 60 min deckt die Pause                       |
| 08:00–12:00                        | 3 h, Beginn 12:15    | Fehler: Beginn frühestens um 12:30 | Regel 2                                     |
| 08:00–12:00, 12:30–14:00           | 2 h                  | 14:01–16:01               | 7,5 h, 30 min Pause schon vorhanden                  |
| 08:00–14:00, 14:30–16:30           | 1,5 h                | 16:45–18:15               | 9,5 h, 45 min nötig, 30 min vorhanden, 15 min fehlen |
| 08:00–14:00, 14:30–16:30           | 2,5 h                | Fehler: höchstens 10 Stunden | Regel 3                                           |
| 08:00–09:00                        | 8 h                  | 09:01–15:01, 15:31–17:31  | 9 h, 30 min nötig, neuer Block über 6 h geteilt (Regel 7) |
| 17:00–21:00                        | 4 h                  | Fehler: Gehen 01:30 am nächsten Tag | Regel 4                                    |
| Kommen 08:00 (offen)               | 2 h                  | Fehler: Erst das Gehen um … buchen | Regel 1                                     |

# UI
Im Dialog „Buchung nachtragen“ heißt der Modus „Ganzer Tag“ künftig „Zeitraum“.

- Tag ohne Buchungen: Beginn 08:00 und Arbeitszeit 08:00 vorbelegt, wie bisher.
- Tag mit Buchungen: Beginn und Arbeitszeit leer. Ein leerer Beginn bedeutet „so früh wie möglich“, unter den Feldern
  steht der frühestmögliche Beginn („Ohne Beginn so früh wie möglich, ab 12:30.“). Ein Uhrzeit-Feld kann keinen
  Platzhalter zeigen. Ändert der User den Tag, werden die Vorgaben neu gesetzt.
- Die Vorschau zeigt wie bisher die neuen Buchungen, dazu die Pause, die eingeplant wird.

# MCP
`add_time_entry_day` bleibt der Name. `start` ist optional, ohne Angabe 08:00 am leeren Tag und so früh wie möglich
an einem Tag mit Buchungen. `workMinutes` hat nur am leeren Tag die Vorgabe 480.

Neue Sätze in der Beschreibung des Tools: „Hat der Tag schon Buchungen, entsteht ein neues Paar nach dem letzten
Gehen, mit der fehlenden Pause davor. Dann workMinutes immer angeben. Ein offenes Kommen am Tag muss vorher mit
stamp oder add_time_entry geschlossen werden.“ Der Satz „der Tag darf noch keine Buchungen haben“ entfällt.

Beispiele für den Agent:

| Der User sagt dem Agent                                 | Aufrufe des Agents                                                         |
|---------------------------------------------------------|----------------------------------------------------------------------------|
| „Buche mir heute noch 2 h.“ (heute 08:00–12:00)         | `add_time_entry_day {day: <heute>, workMinutes: 120}` → 12:01–14:01        |
| „Gestern nach Feierabend noch 1,5 h für Alpha.“ (gestern 08:00–14:00, 14:30–16:30) | `list_projects` → `add_time_entry_day {day: <gestern>, workMinutes: 90, projectId: <Alpha>}` → 16:45–18:15 |
| „Buche mir heute noch 2 h.“ (heute Kommen 08:00 offen)  | Fehler: Erst das Gehen um 08:00 buchen. Der Agent fragt, wann der User gegangen ist |

# Abgrenzung
- Ein Zeitraum wird nur nach dem letzten Gehen des Tages gebucht, nicht in eine Lücke zwischen zwei Paaren und nicht
  vor dem ersten Kommen.
- Die Ruhezeit zwischen zwei Arbeitstagen (11 h) wird nicht geprüft.
- Stempeln, Nachtragen eines Zeitstempels, Ändern und Löschen bleiben unverändert.

# Umsetzung nach der Architektur
Umgesetzt wird nach dem Skill `architecture` (`../../.claude/skills/architecture`).

| Baustein   | Datei                                                                  | Inhalt |
|------------|------------------------------------------------------------------------|--------|
| Service    | `../../shared/time-rules.ts`                                           | `planWorkDay(existing, day, workMinutes, start?)` (Ergebnis `{bookings, pauseMinutes}`) und `checkWorkDay(existing, day, workMinutes, start?)` bekommen die vorhandenen Buchungen und den optionalen Beginn. Am leeren Tag wie bisher (Beginn `WORK_DAY_START`), sonst nach den Regeln 1 bis 8. Neu `earliestStart(existing, day, workMinutes): Date \| null` für den Platzhalter in der UI und die Meldung „Beginn frühestens um“. Die Prüfung „Nur ein leerer Tag“ entfällt. |
| Schema     | `../../shared/time-entry.ts`                                           | `start` in `TimeEntryDayCreateSchema` wird optional. |
| Store      | `../../netlify/functions/lib/time-entries-store.ts`                    | `createDay` ruft `planWorkDay` und `checkWorkDay` mit den gesperrten Buchungen aus `lockBookings` auf, damit der Platz am Tag in der Transaktion berechnet wird. Ergebnis `{entries, pauseMinutes}`, die REST-API liefert weiter nur `entries`. |
| Function   | `../../netlify/functions/time-entries.ts`                              | unverändert. |
| Use Case   | `../../src/features/reports/use-cases/use-add-time-entry-day.ts`       | `problem`, `preview` und neu `earliestStart` mit den Buchungen aus `useTimeEntries`. `start` ist optional. |
| Komponente | `../../src/features/reports/components/time-entry-create-dialog.tsx`   | Modus „Zeitraum“ statt „Ganzer Tag“, Vorgaben je nach Tag, Platzhalter für den Beginn, Pause in der Vorschau. |
| MCP-Tool   | `../../netlify/functions/lib/mcp-tools/time-entries.ts`                | Vorgaben nicht mehr im Tool setzen, sondern `start` und `workMinutes` an `createDay` weitergeben. `workMinutes` fehlt an einem Tag mit Buchungen → Tool-Fehler „Bitte workMinutes angeben“. Beschreibung wie oben. |
| View       | `../../netlify/functions/lib/mcp-tools/view.ts`                        | `workDayText` nennt nur die neuen Buchungen und die Pause davor, z. B. „am Mo., 26.10.: 12:30–15:30 (3 Std Arbeit, 30 Min Pause)“. |
| Tests      | `../../shared/time-rules.test.ts`                                      | die Beispiele oben als Tests für `planWorkDay`, `checkWorkDay` und `earliestStart`, dazu die Grenzen genau 6 h, 9 h und 10 h am Tag. Die Tests für „Nur ein leerer Tag“ entfallen. |
| Tests      | `../../netlify/functions/lib/mcp-tools/view.test.ts`                   | `workDayText` für ein Paar nach vorhandenen Buchungen. |
| Walkthrough | `../../scripts/api-walkthrough.sh`                                    | Der Schritt „Denselben Tag noch einmal“ wird zu „1 h nach dem ganzen Tag“ → 16:31–17:31. Dazu: 2 h mehr am selben Tag → „höchstens 10 Stunden“, offenes Kommen → Fehler. |
| Doku       | `../use-case/time-stamp.md`                                            | Abschnitt zum ganzen Tag wird „Zeitraum nachtragen“ mit den Regeln und Beispielen oben, Zeile „Nur ein leerer Tag“ entfällt. |
| Doku       | `../boundaries/mcp-enable.md`                                          | Eingabe von `add_time_entry_day` (`start?` ohne feste Vorgabe), Beispiel „Buche mir heute noch 2 h.“. |

# Fertig, wenn
- Die Beispiele oben laufen als Tests durch, Lint und Typen sind ohne Fehler.
- Der Walkthrough gegen `dev:test` läuft vollständig durch.
- Im Dialog zeigt ein Tag mit Buchungen den frühestmöglichen Beginn und die eingeplante Pause in der Vorschau.
