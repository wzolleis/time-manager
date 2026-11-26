---
name: time-stamp-merge-day
description: Gibt es an einem Tag mehr als zwei Buchungspaare, fasst der User sie zu zwei Buchungspaaren zusammen. Arbeitszeit und Beginn bleiben erhalten, die Pause liegt danach in einem Stück und erfüllt die Pausenregeln, mehr als 10 h Arbeitszeit werden verworfen.
type: change
changes: time-stamp
epics: zeiterfassung
state: open
---

# Buchungen eines Tages zusammenfassen

„Der User fasst die Buchungen eines Tages zu zwei Buchungspaaren zusammen.“

Heute bleibt jedes Kommen und Gehen einzeln stehen. Wer zwischendurch kurz geht (Arzt, Einkauf, Stempeln
vergessen und nachgetragen), hat am Ende des Tages drei, vier oder mehr Buchungspaare mit kleinen Pausen. Der
Tag ist schwer zu lesen, und ob die Pausenregeln eingehalten sind, sieht man nicht auf einen Blick. Der User
soll einen solchen Tag mit einer Aktion auf zwei Buchungspaare mit einer Pause dazwischen bringen, ohne
dass sich seine Arbeitszeit ändert.

Beschreibung des geänderten Use Case: `../use-case/time-stamp.md`.

## Begriffe

| Begriff        | Bedeutung                                                                          |
|----------------|------------------------------------------------------------------------------------|
| Arbeitszeit    | Summe der Arbeitszeit aller Buchungspaare des Tages, in ganzen Minuten             |
| Beginn, Ende   | Das erste Kommen und das letzte Gehen des Tages                                    |
| Gesamtpause    | Ende minus Beginn minus Arbeitszeit, also die Summe aller Pausen des Tages         |
| Pflichtpause   | Pause zur Arbeitszeit des Tages: bis 6 h keine, bis 9 h 30 min, darüber 45 min (`breakMinutes`) |

## Verhalten

1. **Angeboten ab drei Buchungspaaren.** Der Tagesbericht zeigt die Aktion „Zusammenfassen“, wenn der Tag
   mehr als zwei Buchungspaare hat. Bei einem oder zwei Paaren gibt es nichts zusammenzufassen.
2. **Nur ein abgeschlossener Tag.** Ist die letzte Buchung des Tages ein Kommen, ist die Aktion gesperrt
   („Erst das Gehen buchen“). Heute ist möglich, sobald der Tag kein offenes Kommen hat.
3. **Arbeitszeit bleibt, höchstens 10 h.** Die zwei neuen Buchungspaare haben zusammen genau die Arbeitszeit des
   Tages, Berichte, Soll und Überstunden ändern sich dadurch nicht. Ausnahme: Mehr als 10 h werden auf 10 h
   begrenzt, wie beim Nachtragen. Der Rest wird am Ende des zweiten Paares verworfen, der Dialog nennt ihn
   („15 min verworfen, mehr als 10 h Arbeitszeit“). Die Pflichtpause richtet sich nach der begrenzten
   Arbeitszeit.
4. **Beginn bleibt.** Das erste Kommen bleibt, wie es ist.
5. **Ende bleibt, wenn die Pause reicht.** Ist die Gesamtpause mindestens die Pflichtpause, bleibt auch das
   letzte Gehen. Die Pause zwischen den neuen Paaren ist die Gesamtpause. Wird Arbeitszeit verworfen
   (Verhalten 3), rückt das letzte Gehen um diese Zeit nach vorn.
6. **Zu kurze Pause wird verlängert.** Ist die Gesamtpause kürzer als die Pflichtpause, wird die Pause auf die
   Pflichtpause verlängert, nicht länger. Das zweite Kommen und das letzte Gehen rücken um den fehlenden Rest
   nach hinten, die Arbeitszeit bleibt. Der Dialog weist darauf hin („Pause auf 30 min verlängert, Ende
   verschiebt sich um 20 min auf 17:20“).
7. **Lage der Pause.** Die Pause liegt dort, wo heute die längste Pause des Tages beginnt (bei gleich langen die
   erste): Das erste Paar enthält die Arbeitszeit vor dieser Pause. So bleibt z. B. die Mittagspause an ihrer
   Stelle.
8. **Höchstens 6 h am Stück.** Wäre dadurch ein Paar länger als 6 h, wird die Pause verschoben, bis beide Paare
   höchstens 6 h lang sind. Bei höchstens 10 h Arbeitszeit geht das immer.
9. **Am selben Tag.** Das letzte Gehen liegt nach dem Zusammenfassen am selben Tag (Regel 3), sonst ist die
   Aktion gesperrt.
10. **Projekt.** Haben alle Kommen des Tages dasselbe Projekt oder keines, bekommen beide neuen Kommen dieses
    Projekt. Haben sie verschiedene Projekte, ist die Aktion gesperrt, denn die Zuordnung der Arbeitszeit zu
    den Projekten ginge verloren (Regel 6). Ein Kommen ohne Projekt zählt dabei wie ein eigenes Projekt.
11. **Vorschau und Bestätigung.** Der Dialog zeigt die Buchungen vorher und nachher, dazu Arbeitszeit und Pause.
    Erst nach „Zusammenfassen“ wird gespeichert.
12. **Alles oder nichts.** Der Server löscht die Buchungen des Tages und legt die vier neuen in einer Transaktion
    an. Er berechnet sie selbst, der Client nur für die Vorschau.
13. **Krankheitstage.** Wie beim Nachtragen möglich, der Dialog zeigt den Hinweis, dass die Buchungen nicht zählen
    (Regel 8).
14. **Zugriff.** Wie bei allen Buchungen: der User für sich, ein Administrator für jeden User (Regel 9).

## Beispiele

| Buchungen des Tages                                   | Arbeitszeit, Pause      | Ergebnis                                         |
|-------------------------------------------------------|-------------------------|--------------------------------------------------|
| 08:00–12:00, 13:00–17:00                              | 8:00 h, 1:00 h          | nicht angeboten, schon zwei Paare (1)            |
| 08:00–10:00, 10:15–12:00, 12:30–15:00, 15:10–17:00    | 8:05 h, 55 min          | 08:00–11:45, 12:40–17:00 (5, 7)                  |
| 07:00–09:00, 09:05–13:30, 13:35–14:00, 14:30–16:00    | 8:20 h, 40 min          | 07:00–13:00, 13:40–16:00, längste Pause erst nach 6:50 h (8) |
| 08:00–11:00, 11:05–14:00, 14:05–17:00                 | 8:50 h, 10 min          | 08:00–11:00, 11:30–17:20, Ende 20 min später (6) |
| 08:00–09:00, 09:30–10:00, 13:00–15:00                 | 3:30 h, 3:30 h          | 08:00–09:30, 13:00–15:00, keine Pflichtpause (5, 7) |
| 07:00–12:00, 12:30–15:00, 15:15–18:00                 | 10:15 h, 45 min         | 07:00–12:00, 12:45–17:45, 15 min verworfen (3)   |
| 15:00–20:00, 20:01–22:00, 22:01–23:55                 | 8:53 h, 2 min           | gesperrt: Gehen um 00:23 am nächsten Tag (9)     |
| 08:00–10:00, 10:15–12:00, 12:30 Kommen (offen)        |                         | gesperrt: erst das Gehen buchen (2)              |
| drei Paare, Projekt A, A, B                           |                         | gesperrt: verschiedene Projekte (10)             |
| drei Paare, Projekt A, A, ohne                        |                         | gesperrt: verschiedene Projekte (10)             |

## Abgrenzung

- Stempeln, Nachtragen, Ändern und Löschen bleiben unverändert. Die neuen Buchungen sind danach normale
  Buchungen und werden einzeln geändert oder gelöscht.
- Zusammengefasst wird immer ein ganzer Tag, nicht ein Ausschnitt und nicht mehrere Tage auf einmal.
- Kein MCP-Tool, das wäre ein eigener Change.
- Rückgängig machen gibt es nicht, die Vorschau ersetzt es.

## Umsetzung

Umgesetzt wird nach dem Skill `architecture` (`../../.claude/skills/architecture`), zuerst `use-case.md` lesen.

| Baustein   | Datei                                                              | Änderung |
|------------|--------------------------------------------------------------------|----------|
| Service    | `../../shared/time-rules.ts`                                       | `planMergeDay(existing, day)` berechnet die vier neuen Buchungen nach Verhalten 3 bis 9 und liefert sie mit Arbeitszeit, Pause, Verlängerung der Pause und verworfener Arbeitszeit für die Hinweise, oder ein Problem. Verwendet `buildPeriods` und `breakMinutes`. `checkMergeDay` prüft zusätzlich Verhalten 1, 2 und 10 und danach `checkSequence` mit allen Buchungen. |
| Store      | `../../netlify/functions/lib/time-entries-store.ts`                | `mergeDay(userId, day)`: in einer Transaktion `lockBookings`, `checkMergeDay` (Problem als `RuleError`), Buchungen des Tages löschen, die neuen einfügen und jedem Kommen das Projekt zuordnen. |
| Function   | `../../netlify/functions/time-entries.ts`                          | neuer Endpoint zum Zusammenfassen eines Tages unter `/api/users/:userId/time-entries`, Body mit `day`. Antwort mit den neuen Buchungen, verletzte Regel 422. Pfad und Methode beim Planen festlegen. |
| API        | `../../src/api/time-entries.ts`                                    | `mergeTimeEntryDay(userId, day)` |
| Use Case   | `../../src/features/reports/use-cases/`                            | neuer Hook `useMergeTimeEntryDay`: `problem(day)` und `preview(day)` über `useTimeEntries`, `sickNotice(day)`, `merge` mit Optimistic Write (`optimisticTimeEntries`, siehe Skill `architecture-timemanager`). |
| Komponente | `../../src/features/reports/components/report-daily-edit.tsx`      | Aktion „Zusammenfassen“ bei den Buchungen des Tages nach Verhalten 1, öffnet einen neuen Dialog im selben Ordner mit Vorschau vorher und nachher, Hinweise auf verlängerte Pause und verworfene Arbeitszeit, gesperrt mit Grund. Vorher die Bausteine im Skill `ui-styling-timemanager` prüfen. |
| Tests      | `../../shared/time-rules.test.ts`                                  | `describe("planMergeDay")` mit den Beispielen oben, dazu die Grenzen Pause genau Pflichtpause, Paar genau 6:00 h und 6:01 h, 10:00 h und 10:01 h Arbeitszeit, Buchungen mit Sekunden. Vorher `architecture/testing.md` lesen. |
| Tests      | `../../scripts/api-walkthrough.sh`                                 | Tag mit drei Paaren zusammenfassen, gesperrter Tag mit offenem Kommen ergibt 422. |
| Use Case   | `../use-case/time-stamp.md`                                        | Abschnitt „Zusammenfassen“, Zeile in der Tabelle der Use Cases, Beispiele. |

## Fertig, wenn

- [ ] Ein Tag mit mehr als zwei Buchungspaaren lässt sich im Tagesbericht nach Vorschau zu zwei Paaren zusammenfassen.
- [ ] Beginn bleibt, die Arbeitszeit auch, höchstens 10 h. Verworfene Zeit und verlängerte Pause nennt der Dialog.
- [ ] Die Pause erfüllt die Pflichtpause, kein Paar ist länger als 6 h.
- [ ] Gesperrte Fälle zeigen den Grund, der Server lehnt sie mit 422 ab.
- [ ] Der geänderte Use Case beschreibt den neuen Stand (time-stamp).
- [ ] `state` steht auf `resolved`.
