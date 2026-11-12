---
name: whole-minutes-per-day
description: Die Arbeitszeit eines Tages zählt nur in ganzen Minuten, abgerundet. Differenz, Summen und Saldo der Überstunden rechnen mit diesem Wert, damit sie zu den angezeigten Werten passen.
type: change
changes: today-report, industriezeit
epics: zeiterfassung
state: resolved
---

# Ganze Minuten je Tag

## Was ist das Problem

Am 02.11.2026 zeigte die Produktion eine Arbeitszeit von 7,95 h, ein Soll von 8,00 h und eine Differenz von
−0,03 h. Nach den angezeigten Werten müsste die Differenz −0,05 h sein.

Die Buchungen ergeben 7:57:18. Die Arbeitszeit wurde auf 7:57 abgerundet, die Differenz aber aus den
Millisekunden berechnet: 8:00 − 7:57:18 = 0:02:42. Auch dieser Betrag wurde abgerundet, auf 0:02. So gingen die
beiden Rundungen in verschiedene Richtungen. Die Anzeige in Stunden und Minuten hatte denselben Fehler
(7 Std 57 Min, Differenz −2 Min).

## Was ändert sich

- `periodTotals` in `../../shared/time-report.ts` rundet die Arbeitszeit eines Tages auf ganze Minuten ab
  (`wholeMinutesMs`). Daraus rechnen alle anderen Werte: Differenz des Tages, Summen von Woche, Monat und Jahr,
  der Saldo der Überstunden und die Ergebnisse der MCP-Tools.
- Die Summe der angezeigten Arbeitszeiten der Tage ist damit genau die Summe von Woche, Monat und Jahr.
  Arbeitszeit − Soll ist immer genau die Differenz.
- Die Pausen bleiben, wie sie sind.

## Auswirkung auf den Saldo

Der Saldo wird bei jedem Aufruf aus allen Tagen seit der letzten Korrektur neu berechnet. Weil die Sekunden
pro Tag wegfallen, sinkt er einmalig um bis zu 1 Minute je Tag seit der Korrektur. In der Produktion waren es
am 12.11.2026 3 Minuten: +8:47 h vorher, +8:44 h nachher (Korrektur vom 06.11.2026). Wer den alten Wert
behalten will, gleicht das einmal mit der Korrektur der Überstunden aus.

## Tests

- `describe("ganze Minuten je Tag")` in `../../shared/time-report.test.ts` mit den Buchungen vom 02.11.2026:
  Arbeitszeit 477 Minuten, Differenz −3 Minuten, auch in der Woche.
