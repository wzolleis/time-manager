---
name: overtime-time-calc-with-feierabend
description: Im Saldo der Überstunden zählt das Soll des heutigen Tages erst ab dem ersten „Gehen“ des Tages, 
  nicht schon ab 00:00. Vergangene Tage und die Berichte bleiben unverändert.
type: change
changes: overtime
epics: zeitberechnung
state: resolved
---

# Überstunden ab dem ersten Feierabend des Tages

„Der User sieht seine Überstunden vom Vortag, bis er heute zum ersten Mal ‚Gehen‘ bucht.“

# Was ist das Problem
Heute zählt der heutige Tag im Saldo der Überstunden schon ab 00:00 mit dem vollen Soll
(`overtimeBalanceMs` in `../../shared/overtime-rules.ts`, über `dayDiffMs`). Um 00:00 wird also
automatisch das Soll des neuen Tages abgezogen. Bei 8h Soll werden so aus 5 Überstunden
3 Minusstunden (5 h − 8 h = −3 h), obwohl der User noch gar nicht angefangen hat.

# Was soll sich ändern
Regeln für den Saldo der Überstunden:

1. **Heute vor dem ersten Gehen:** Das Soll des heutigen Tages zählt noch nicht. Die Arbeitszeit des
   heutigen Tages zählt wie bisher, auch die laufende Zeit seit einem offenen Kommen (wie heute in
   `dayTotals` mit `now`).
2. **Heute ab dem ersten Gehen:** Sobald heute ein „Gehen“ gebucht ist, zählt der heutige Tag mit dem
   vollen Soll und der Arbeitszeit, wie bisher. Ein späteres Kommen und Gehen am selben Tag ändert nur
   die Arbeitszeit.
3. **Vergangene Tage:** Sie zählen unverändert mit dem vollen Soll, auch wenn an dem Tag kein Gehen
   gebucht ist (vergessenes Ausstempeln, Abwesenheit ohne Urlaub).
4. **Urlaub, Feiertag, Krankheit, Wochenende:** Das Soll ist dort 0, es ändert sich nichts.
5. **Korrektur:** Am Tag der Korrektur gelten dieselben Regeln. Der Korrekturwert bleibt der Saldo bis
   einschließlich des Vortags.

Die Regeln gelten für den Saldo überall, wo er angezeigt wird: Seite „Überstunden“ und MCP-Tool
`get_overtime`. Beide verwenden dieselbe Berechnung (`overtimeBalanceMs`).

# Beispiel
Sollzeit 8 h je Arbeitstag, keine Korrektur. Am Di 27.10.2026 abends beträgt der Saldo +5:00 h.

| Zeitpunkt              | Buchung                          | Saldo     | Rechnung                                         |
|------------------------|----------------------------------|-----------|--------------------------------------------------|
| Mi 28.10.2026, 00:00   | –                                | +5:00 h   | Soll von Mi zählt noch nicht                     |
| Mi 28.10.2026, 08:00   | Kommen                           | +5:00 h   |                                                  |
| Mi 28.10.2026, 10:00   | – (läuft seit 08:00)             | +7:00 h   | 5 h + 2 h laufende Arbeitszeit                   |
| Mi 28.10.2026, 12:00   | Gehen                            | +1:00 h   | 5 h + 4 h − 8 h Soll                             |
| Mi 28.10.2026, 13:00   | Kommen                           | +1:00 h   |                                                  |
| Mi 28.10.2026, 14:00   | – (läuft seit 13:00)             | +2:00 h   | 5 h + 5 h − 8 h                                  |
| Mi 28.10.2026, 16:00   | Gehen                            | +4:00 h   | 5 h + 7 h − 8 h                                  |
| Do 29.10.2026, 00:00   | –                                | +4:00 h   | Soll von Do zählt noch nicht                     |
| Do 29.10.2026, 18:00   | keine Buchung an diesem Tag      | +4:00 h   | ohne Gehen zählt das Soll von Do noch nicht      |
| Fr 30.10.2026, 00:00   | –                                | −4:00 h   | Do ist vergangen: 4 h − 8 h Soll (Regel 3)       |

# Abgrenzung
Die Berichte (Tag, Woche, Monat, Jahr) ändern sich nicht. Dort zählt der heutige Tag weiter mit dem
vollen Soll, `dayDiffMs` und `dayTotals` in `../../shared/time-report.ts` bleiben unverändert.

# Umsetzung nach der Architektur
Umgesetzt wird nach dem Skill `architecture` (`../../.claude/skills/architecture`).

| Baustein  | Datei                                         | Inhalt                                                                                                                                                                                 |
|-----------|-----------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Service   | `../../shared/overtime-rules.ts`              | `overtimeBalanceMs`: für `day === today` das Soll nur zählen, wenn heute eine Buchung mit `type === "gehen"` liegt, sonst Soll 0. Vergangene Tage unverändert. Kommentar der Funktion anpassen („heute also mit dem vollen Soll“ stimmt dann nicht mehr). |
| Service   | `../../shared/time-report.ts`                 | unverändert                                                                                                                                                                            |
| Aufrufer  | `../../src/features/reports/use-cases/use-show-overtime.ts`, `../../netlify/functions/lib/mcp-tools/overtime-view.ts` | unverändert, sie bekommen die neue Berechnung über `overtimeBalanceMs`. Prüfen, ob Texte dort die alte Regel beschreiben.                                    |
| Tests     | `../../shared/overtime-rules.test.ts`         | das Beispiel oben als Tests (je Zeile ein `now`), dazu die Regeln 3 bis 5. Bestehende Tests, die heute mit vollem Soll vor dem ersten Gehen rechnen, an die neue Regel anpassen.      |
| Use Case  | `../use-case/overtime.md`                     | Abschnitt „Berechnung“ um die Regel für heute ergänzen. Beispiel „Mit Korrektur“ neu rechnen: Am Do 15.10. vor dem ersten Kommen zeigt die Karte 3:30 + 3 × 1:00 = „+6:30 h“, weil das Soll von Do noch nicht zählt. Das Beispiel „Nachträgliche Änderung“ entsprechend („+5:30 h“). |
