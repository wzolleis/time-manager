---
name: time-stamp
description: Beschreibt die Use Cases zur Zeiterfassung. Der User stempelt Kommen und Gehen, ordnet beim Kommen ein Projekt zu, trägt vergessene Buchungen oder einen ganzen Tag nach, ändert und löscht sie. Enthält die Regeln für die Abfolge von Kommen und Gehen (Buchungspaar am selben Tag, keine zwei gleichen Buchungen hintereinander).
type: story
epics: zeiterfassung
state: resolved
---

# Zeiterfassung

„Der User stempelt seine Arbeitszeit.“

Der User erfasst, wann er kommt und wann er geht. Beim Kommen kann er die folgende Arbeitszeit einem Projekt
zuordnen. Vergessene Buchungen trägt er nach, falsche ändert oder löscht er. Die Regeln für die Abfolge
gelten bei jeder dieser Aktionen und werden im Client und auf dem Server geprüft.

Der Use Case ist umgesetzt. Diese Beschreibung hält fest, wie er sich verhält, damit Änderungen daran die
Regeln nicht verletzen. Wo gestempelt wird und wie die Buchungen angezeigt werden, steht in
`today-report.md`. Code:

- Komponenten `../../src/features/reports/components/` (`stamp-card.tsx`, `time-entry-create-dialog.tsx`,
  `time-entry-actions.tsx`, `time-entry-delete.tsx`)
- Use Cases `../../src/features/reports/use-cases/`
- Services `../../shared/time-rules.ts`, Schema `../../shared/time-entry.ts`, Function
  `../../netlify/functions/time-entries.ts`, Store `../../netlify/functions/lib/time-entries-store.ts`

Geändert wird nach dem Skill `architecture` (`../../.claude/skills/architecture`), zuerst
`../../.claude/skills/architecture/use-case.md` lesen.

## Begriffe

| Begriff        | Bedeutung                                                                                   | Im Code                         |
|----------------|---------------------------------------------------------------------------------------------|---------------------------------|
| Buchung        | Ein Zeitpunkt, zu dem der User kommt oder geht                                              | `TimeEntry`, `Booking`          |
| Kommen / Gehen | Typ einer Buchung                                                                           | `type: "kommen" \| "gehen"`     |
| Buchungspaar   | Ein Kommen und das darauf folgende Gehen, dazwischen liegt Arbeitszeit                      |                                 |
| Gegenstück     | Zum Kommen das folgende Gehen, zum Gehen das Kommen davor                                   | `findPartner`                   |
| Pause          | Zeit zwischen einem Gehen und dem nächsten Kommen am selben Tag                             | `buildPeriods`                  |
| Tag            | Kalendertag in der Zeitzone `Europe/Berlin`, als `JJJJ-MM-TT`                               | `localDay`                      |

## Use Cases

| Use Case                                   | Hook                 | Komponente                  |
|--------------------------------------------|----------------------|-----------------------------|
| Der User stempelt Kommen oder Gehen.       | `useStampTime`       | `StampCard`                 |
| Der User trägt eine Buchung nach.          | `useAddTimeEntry`    | `TimeEntryCreateDialog`     |
| Der User trägt einen ganzen Tag nach.      | `useAddTimeEntryDay` | `TimeEntryCreateDialog`     |
| Der User ändert eine Buchung.              | `useChangeTimeEntry` | `EntryActions`              |
| Der User löscht eine Buchung.              | `useDeleteTimeEntry` | `TimeEntryDelete`           |

### Stempeln

Gestempelt wird immer mit der aktuellen Zeit. Die letzte Buchung bestimmt, was als Nächstes dran ist:
nach einem Kommen ein Gehen, sonst ein Kommen. Beim Kommen wählt der User optional ein Projekt, beim Gehen
gibt es keine Auswahl. Fehlt zu einem Kommen eines früheren Tages das Gehen, kann der User nicht stempeln,
die Stempelkarte bietet stattdessen „Gehen nachtragen“ für diesen Tag an (Regel 4).

### Nachtragen

Der User trägt eine Buchung für einen beliebigen Tag nach und wählt Typ, Tag und Uhrzeit, beim Kommen auch
das Projekt. Für heute ist die aktuelle Uhrzeit vorbelegt. Die Abfolge wird schon während der Eingabe
geprüft, Speichern ist erst möglich, wenn sie stimmt.

Statt eines Zeitstempels kann der User einen ganzen Tag nachtragen. Er gibt Tag, Beginn (vorbelegt mit 08:00),
Arbeitszeit (vorbelegt mit 08:00, also 8 Stunden) und optional ein Projekt an, der Dialog zeigt die Buchungen, die
daraus entstehen. Die Vorgaben stehen als `WORK_DAY_START` und `WORK_DAY_MINUTES` in `../../shared/time-rules.ts` und
gelten auch für das MCP-Tool `add_time_entry_day` (`../boundaries/mcp-enable.md`). Der Server berechnet die Buchungen
selbst (`planWorkDay`) und legt sie in einer Transaktion an, alle oder keine (`createDay`):

- **Pause** nach 6 h Arbeit: bis 6 h keine, über 6 h bis 9 h 30 min, über 9 h 45 min (`breakMinutes`). Mit Pause
  entstehen zwei Buchungspaare.
- **Höchstens 10 h** Arbeitszeit, das letzte Gehen liegt am selben Tag (Regel 3).
- **Nur ein leerer Tag.** Hat der Tag schon Buchungen, trägt der User einzelne Zeitstempel nach.
- Das Projekt gilt für jedes Kommen des Tages (Regel 6). Geprüft wird mit `checkWorkDay`.

### Ändern

Der User ändert die Uhrzeit einer Buchung und, bei einem Kommen, das Projekt. Typ und Tag bleiben
unverändert, ein anderer Typ würde die Abfolge zerstören (Regel 2). Wird die Uhrzeit nicht geändert, bleibt
die ursprüngliche Zeit mit Sekunden erhalten.

### Löschen

Der User löscht eine Buchung allein („Nur diese“) oder zusammen mit ihrem Gegenstück („Mit Gegenstück“),
egal an welchem Tag, auch heute. Er soll seine Daten bewusst frei korrigieren können, die einzige Grenze
ist, dass die Abfolge danach noch stimmt. Eine Option, die die Abfolge verletzen würde, ist gesperrt und der
Grund wird angezeigt.

## Daten

| Feld        | Typ                       | Inhalt                                      |
|-------------|---------------------------|---------------------------------------------|
| `id`        | UUID                      |                                             |
| `userId`    | UUID                      | der User, dem die Buchung gehört            |
| `type`      | `"kommen"` \| `"gehen"`   |                                             |
| `bookedAt`  | Zeitpunkt (UTC)           | wann gekommen oder gegangen wurde           |
| `projectId` | UUID, optional            | nur bei einem Kommen, per Join geliefert    |

Tabelle `time_entries`, im Code `TimeEntry`. Das Projekt steht in der Zuordnungstabelle
`time_entry_projects`, höchstens ein Projekt pro Buchung. Weil nur ein Kommen ein Projekt hat, gilt das
Projekt für das ganze Buchungspaar.

## Regeln

1. **Erst Kommen.** Die erste Buchung eines Users ist ein Kommen.
2. **Abwechselnd.** Auf ein Kommen folgt ein Gehen und umgekehrt. Es gibt keine zwei gleichen Buchungen
   hintereinander (`checkSequence`).
3. **Buchungspaar am selben Tag.** Kommen und Gehen eines Paares liegen am selben Tag, ein Paar geht nicht
   über Mitternacht.
4. **Fehlendes Gehen zuerst nachtragen.** Hat der User an einem früheren Tag kein Gehen gebucht, trägt er
   es für diesen Tag nach, an jedem späteren Tag. Vorher kann er nicht stempeln (`findMissingGehen`).
5. **Keine zwei Buchungen zur selben Zeit.**
6. **Projekt nur beim Kommen.** Beim Gehen wird kein Projekt gespeichert, auch nicht beim Nachtragen oder
   Ändern. Die UI bietet die Auswahl beim Gehen nicht an, die API lehnt ein Gehen mit Projekt ab
   (`checkProject`).
7. **Pausen** ergeben sich aus Gehen und dem nächsten Kommen am selben Tag. Zwischen zwei Tagen gibt es
   keine Pause.
8. **Krankheitstage.** Buchungen an einem Krankheitstag sind möglich, die UI weist darauf hin, dass sie
   nicht zählen (`sick-leave.md`).
9. **Zugriff.** Jeder User sieht und ändert nur seine eigenen Buchungen, ein Administrator die aller User
   (`ensureAccess`).

## Beispiele

| Buchungen                                                   | Ergebnis                                         |
|-------------------------------------------------------------|--------------------------------------------------|
| Kommen 08:00, Gehen 12:00, Kommen 13:00, Gehen 17:00        | gültig, 8 h Arbeit, 12–13 Uhr Pause              |
| Kommen 08:00, Gehen 12:00, Kommen 13:00 (heute)             | gültig, die zweite Arbeitszeit läuft noch        |
| Gehen 08:00 als erste Buchung                               | Fehler: vorher fehlt ein Kommen (Regel 1)        |
| Kommen 08:00, Kommen 09:00                                  | Fehler: vorher fehlt ein Gehen (Regel 2)         |
| Kommen Mo 22:00, Gehen Di 01:00                             | Fehler: nicht am selben Tag (Regel 3)            |
| Kommen gestern 08:00, kein Gehen, heute stempeln            | nicht möglich, erst Gehen für gestern nachtragen |
| Kommen 08:00, Gehen 08:00                                   | Fehler: zwei Buchungen zur selben Zeit (Regel 5) |
| Aus 08–12, 13–17 nur Gehen 12:00 löschen                    | Fehler: Kommen 08:00 und Kommen 13:00 folgen aufeinander |
| Aus 08–12, 13–17 Gehen 12:00 mit Gegenstück löschen         | gültig, übrig bleibt 13–17                       |
| Ganzer Tag ab 08:00, 6:00 h                                 | Kommen 08:00, Gehen 14:00                        |
| Ganzer Tag ab 08:00, 8:00 h                                 | 08:00–14:00, 14:30–16:30                         |
| Ganzer Tag ab 08:00, 10:00 h                                | 08:00–14:00, 14:45–18:45                         |
| Ganzer Tag ab 08:00, 10:30 h                                | Fehler: mehr als 10 h                            |
| Ganzer Tag ab 15:00, 10:00 h                                | Fehler: Gehen 01:45 am nächsten Tag (Regel 3)    |
| Ganzer Tag an einem Tag mit Kommen 08:00                    | Fehler: Tag hat schon Buchungen                  |
