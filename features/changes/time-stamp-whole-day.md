---
name: time-stamp-whole-day
description: Beim Nachtragen wählt der User zwischen einem einzelnen Zeitstempel und einem ganzen Tag. Für einen
  ganzen Tag gibt er Beginn und Arbeitszeit an, daraus werden die Buchungspaare samt gesetzlicher Pause berechnet.
type: change
changes: time-stamp
epics: zeiterfassung
state: open
---

# Einen ganzen Tag nachtragen

„Der User trägt einen ganzen Tag mit seiner Arbeitszeit nach.“

# Was ist das Problem
Heute trägt der User jede Buchung einzeln nach (`TimeEntryCreateDialog`, `useAddTimeEntry`): erst das Kommen,
dann das Gehen, jeweils mit Uhrzeit. Für einen ganzen Tag ist es einfacher, nur die Arbeitszeit anzugeben.

# Was soll sich ändern
Beim Nachtragen wählt der User, ob er einen Zeitstempel oder einen ganzen Tag nachträgt.

- **Zeitstempel:** wie bisher (Abschnitt „Nachtragen“ in `../use-case/time-stamp.md`).
- **Ganzer Tag:** Der User gibt Tag, Beginn, Arbeitszeit und optional ein Projekt an. Daraus werden die
  Buchungspaare berechnet und zusammen gespeichert.

Regeln für den ganzen Tag:

1. **Beginn.** Das erste Kommen ist mit 08:00 vorbelegt, der User kann eine andere Uhrzeit wählen.
2. **Pause.** Die Pause liegt nach 6 h Arbeit, ihre Länge hängt von der Arbeitszeit ab:
   - bis einschließlich 6 h: keine Pause, ein Buchungspaar
   - über 6 h bis einschließlich 9 h: 30 min Pause, zwei Buchungspaare
   - über 9 h: 45 min Pause, zwei Buchungspaare
3. **Höchstens 10 h.** Eine Arbeitszeit über 10 h ist gesperrt.
4. **Am selben Tag.** Das letzte Gehen liegt vor Mitternacht (Regel 3 in `../use-case/time-stamp.md`), sonst
   ist Speichern gesperrt.
5. **Nur ein leerer Tag.** Hat der Tag schon Buchungen, ist der ganze Tag gesperrt. Der User trägt dann einzelne
   Zeitstempel nach.
6. **Projekt.** Das gewählte Projekt gilt für jedes Kommen des Tages (Regel 6).
7. **Jeder Tag.** Ein ganzer Tag ist für jeden Tag möglich, auch für heute.

Ist eine Regel verletzt, zeigt der Dialog den Grund an und Speichern ist gesperrt, wie beim Nachtragen eines
Zeitstempels. Die übrigen Regeln aus `../use-case/time-stamp.md` gelten unverändert, die Function prüft sie für
jede Buchung.

# Beispiele

| Eingabe                       | Buchungen                                         |
|-------------------------------|---------------------------------------------------|
| Beginn 08:00, 4:00 h          | Kommen 08:00, Gehen 12:00                         |
| Beginn 08:00, 6:00 h          | Kommen 08:00, Gehen 14:00                         |
| Beginn 08:00, 8:00 h          | Kommen 08:00, Gehen 14:00, Kommen 14:30, Gehen 16:30 |
| Beginn 08:00, 9:00 h          | Kommen 08:00, Gehen 14:00, Kommen 14:30, Gehen 17:30 |
| Beginn 08:00, 10:00 h         | Kommen 08:00, Gehen 14:00, Kommen 14:45, Gehen 18:45 |
| Beginn 08:00, 10:30 h         | Fehler: mehr als 10 h (Regel 3)                   |
| Beginn 15:00, 10:00 h         | Fehler: Gehen 01:45 am nächsten Tag (Regel 4)     |
| Tag hat schon Kommen 08:00    | Fehler: Tag hat schon Buchungen (Regel 5)         |

# Abgrenzung
- Das Nachtragen eines Zeitstempels, das Stempeln, Ändern und Löschen bleiben unverändert. Die Buchungen eines
  ganzen Tages sind danach normale Buchungen und werden einzeln geändert oder gelöscht.
- Der MCP-Server bekommt kein eigenes Tool für einen ganzen Tag, das wäre ein eigener Change.

# Umsetzung nach der Architektur
Umgesetzt wird nach dem Skill `architecture` (`../../.claude/skills/architecture`).

Ein ganzer Tag wird in einem Request und in einer Transaktion gespeichert: entweder alle Buchungen des Tages oder
keine. Die Buchungen berechnet der Server aus Tag, Beginn und Arbeitszeit selbst, denn nur seine Prüfung ist
verbindlich. Der Client berechnet sie mit demselben Service für die Prüfung während der Eingabe.

| Baustein   | Datei                                                                  | Inhalt |
|------------|------------------------------------------------------------------------|--------|
| Service    | `../../shared/time-rules.ts`                                           | `planWorkDay(day, start, workMinutes): Booking[]` berechnet die Buchungspaare nach Regel 1 und 2 (Pause nach 6 h, 30 bzw. 45 min). `checkWorkDay(existing, day, start, workMinutes): string \| null` prüft Regel 3 (höchstens 10 h), Regel 4 (letztes Gehen am selben Tag) und Regel 5 (Tag ohne Buchungen), danach `checkSequence` mit allen Buchungen. |
| Schema     | `../../shared/time-entry.ts`                                           | `TimeEntryDayCreateSchema` mit `day` (`JJJJ-MM-TT`), `start` (`HH:mm`), `workMinutes` (ganze Minuten > 0) und `projectId` (optional), dazu der Typ `TimeEntryDayCreate`. |
| Store      | `../../netlify/functions/lib/time-entries-store.ts`                    | `createDay(userId, input): Promise<StoredEntry[]>`: in einer Transaktion `lockBookings`, `checkWorkDay` (bei einem Problem `RuleError`), dann alle Buchungen aus `planWorkDay` einfügen und jedem Kommen das Projekt zuordnen (Regel 6). |
| Function   | `../../netlify/functions/time-entries.ts`                              | `POST /api/users/:userId/time-entries` nimmt auch einen ganzen Tag an: Hat der Body `workMinutes`, wird er mit `TimeEntryDayCreateSchema` geprüft und `createDay` aufgerufen, Antwort 201 mit allen angelegten Buchungen. Sonst wie bisher eine einzelne Buchung. Eine verletzte Regel ergibt wie bisher 422 über `RuleError`. |
| API        | `../../src/api/time-entries.ts`                                        | `createTimeEntryDay(userId, data: TimeEntryDayCreate)`, `POST` auf denselben Pfad, Ergebnis `TimeEntryDto[]`. |
| Use Case   | `../../src/features/reports/use-cases/use-add-time-entry-day.ts`       | neuer Hook `useAddTimeEntryDay` nach dem Muster von `useAddTimeEntry`: `problem({day, start, workMinutes})` mit `checkWorkDay` über die Buchungen aus `useTimeEntries`, `preview(...)` mit `planWorkDay` für die Anzeige der berechneten Buchungen, `sickNotice(day)`, `add` mit `createTimeEntryDay`, danach `["time-entries"]` invalidieren. |
| Komponente | `../../src/features/reports/components/time-entry-create-dialog.tsx`   | Oben ein `Select` „Nachtragen“ mit „Zeitstempel“ und „Ganzer Tag“, Standard ist „Zeitstempel“. Beim ganzen Tag statt Buchung und Uhrzeit die Felder Tag, Beginn (vorbelegt mit 08:00), Arbeitszeit (`HH:mm`) und Projekt. Darunter die berechneten Buchungen als Vorschau, z. B. „08:00–14:00, 14:30–16:30“. Fehler und Krankheitshinweis wie bisher, Speichern gesperrt, solange `problem` nicht null ist. Wird der Dialog zu groß, die Felder des ganzen Tages in eine eigene Komponente `time-entry-day-fields.tsx` im selben Ordner auslagern. |
| Tests      | `../../shared/time-rules.test.ts`                                      | `describe("planWorkDay")` und `describe("checkWorkDay")` mit den Beispielen oben, dazu die Grenzen 6:00 h und 6:01 h, 9:00 h und 9:01 h, 10:00 h und 10:01 h sowie ein Tag mit Umstellung der Sommerzeit. |
| Tests      | `../../shared/time-entry.test.ts`                                      | `TimeEntryDayCreateSchema`: gültige Eingabe, `start` ohne `HH:mm`, `workMinutes` 0 oder negativ. |
| Use Case   | `../use-case/time-stamp.md`                                            | Abschnitt „Nachtragen“ um den ganzen Tag mit den Regeln für Pause und Höchstdauer ergänzen, die Tabelle der Use Cases um `useAddTimeEntryDay` und die Beispiele um die Zeilen von oben. Beim Code die neuen Dateien nennen. |
