---
name: industriezeit
description: Der User stellt die Anzeige aller Dauern auf Industriezeit um (8,50 h statt 8 Std 30 Min). Die Einstellung liegt im Browser, Eingaben bleiben in Stunden und Minuten.
type: story
epics: zeiterfassung, einstellungen
state: resolved
---

# Industriezeit

„Der User sieht seine Zeiten in Industriezeit.“

## Was ist die Industriezeit

Industrieminuten teilen eine Stunde in 100 statt in 60 Minuten. Die Zeit wird also als Dezimalzahl in Stunden
angegeben:

```text
Industriezeit (h) = Stunden + Minuten / 60
```

| Zeitangabe | Rechnung    | Industriezeit |
|------------|-------------|---------------|
| 0:15       | 15 / 60     | 0,25 h        |
| 0:30       | 30 / 60     | 0,50 h        |
| 7:45       | 7 + 45 / 60 | 7,75 h        |
| 8:20       | 8 + 20 / 60 | 8,33 h        |

## Was ist das Problem

Die Zeiterfassung beim Arbeitgeber zeigt die Zeiten in Industriezeit. Der User vergleicht die hier erfassten
Zeiten leichter damit, wenn sie ebenfalls in Industriezeit angezeigt werden.

Normalerweise sieht der User die Zeiten in Stunden und Minuten. Er schaltet nur kurz auf Industriezeit um, um
die Zeiten zu vergleichen, und danach wieder zurück. Der Schalter dafür muss deshalb schnell erreichbar sein.
Welche Anzeige gerade gilt, muss nicht jederzeit sichtbar sein: Man erkennt es an den Dauern und am Häkchen im
Benutzermenü.

## Was soll geändert werden

Der User kann die Anzeige auf Industriezeit umstellen. Die Einstellung betrifft nur die Anzeige: Sie gilt für
alle Dauern, die irgendwo in der UI angezeigt werden, für alle Tage, auch für die Vergangenheit. Berechnungen
und gespeicherte Daten ändern sich nicht.

## Einstellung

- Im Benutzermenü (Avatar oben rechts) steht der Eintrag „Industriezeit“ mit Häkchen, wenn sie an ist. Ein
  Klick schaltet um. Früher stand dafür ein eigener Button „60 min/h“ im Kopf. Er ist ins Menü gewandert, damit
  die Breadcrumb auf schmalen Bildschirmen Platz hat (Change `../changes/breadcrumb-dropdown.md`).
- Default: aus, also Stunden und Minuten wie bisher.
- Die Einstellung gilt pro User. Sie wird im `localStorage` des Browsers gespeichert, nicht auf dem
  Server, unter einem Schlüssel mit der id des Users. Wechselt der User im selben Browser, gilt die
  Einstellung des neuen Users, ohne eigene Einstellung der Default. Sie hat kein „gültig ab“, ist keine
  Einstellung aus `user-settings.md` und erscheint nicht in der Tabelle der Einstellungen.
- Die Umstellung wirkt sofort auf allen Seiten, ohne Neuladen.
- Ist der `localStorage` nicht verfügbar (z. B. privates Fenster mit gesperrten Daten), gilt der Default. Der
  Button funktioniert dann nur bis zum Neuladen.

## Regeln

1. **Nur Dauern.** Umgestellt werden Dauern: Arbeitszeit, Pausen, Soll, Differenz, „bis heute“-Soll, die
   laufende Arbeitszeit in der Stempelkarte, der Saldo und die Korrektur der Überstunden. Uhrzeiten
   („08:00 Uhr“), Tage und die Werte der Einstellungen („8 Stunden“) bleiben, wie sie sind.
2. **Format.** Zwei Nachkommastellen mit Komma und der Einheit „h“, z. B. „8,50 h“, „0,25 h“, „0,00 h“.
3. **Differenz und Saldo** mit Vorzeichen wie bisher: „+0,50 h“, „−1,25 h“ (Minus als „−“, U+2212). Unter
   einer Minute „±0,00 h“. Der Saldo der Überstunden ist ohne Minuten „+0,00 h“ wie bisher „+0:00 h“.
4. **Rundung.** Wie bisher zählen ganze Minuten, der Betrag wird abgerundet. Die Minuten werden dann in
   Stunden umgerechnet und auf zwei Stellen gerundet (ab 5 aufrunden): 8:20 → 8,33 h, 0:01 → 0,02 h,
   0:59 → 0,98 h.
5. **Summen** werden wie bisher aus den Millisekunden berechnet und erst bei der Anzeige umgerechnet. Die
   Summe der angezeigten Tageswerte kann deshalb um 0,01 h von der angezeigten Summe abweichen.
6. **Eingaben bleiben in Stunden und Minuten.** Formulare, z. B. Buchungen nachtragen oder der Korrekturwert
   der Überstunden, sind von der Einstellung nicht betroffen.
7. **Nur die UI.** Die MCP-Tools laufen auf dem Server und kennen die Einstellung im Browser nicht. Ihre
   Ergebnisse bleiben unverändert. Wer mit einem Agenten arbeitet, fordert die Industriezeit dort
   ausdrücklich an. Der Agent rechnet sie dann aus den Feldern in Minuten (z. B. `workMinutes`,
   `diffMinutes`, `balanceMinutes`) nach Regel 4 um.
8. **Wo bisher „–“ steht** (kein Wert), steht weiter „–“.

## Beispiele

| Dauer (bisher)  | Art       | Industriezeit |
|-----------------|-----------|---------------|
| 8 Std 30 Min    | Dauer     | 8,50 h        |
| 8 Std           | Dauer     | 8,00 h        |
| 45 Min          | Dauer     | 0,75 h        |
| 0 Min           | Dauer     | 0,00 h        |
| 2 Std 20 Min    | Dauer     | 2,33 h        |
| +30 Min         | Differenz | +0,50 h       |
| −1 Std 15 Min   | Differenz | −1,25 h       |
| ±0 Min          | Differenz | ±0,00 h       |
| +3:30 h         | Saldo     | +3,50 h       |
| −0:10 h         | Saldo     | −0,17 h       |

## Akzeptanzkriterien

- Ohne Einstellung zeigen alle Seiten die Dauern wie bisher in Stunden und Minuten.
- Der Eintrag „Industriezeit“ im Benutzermenü zeigt mit dem Häkchen den Zustand und schaltet mit einem Klick um.
- Nach dem Einschalten zeigen Tages-, Wochen-, Monats- und Jahresbericht, die Stempelkarte und die Überstunden
  alle Dauern in Industriezeit, ohne Neuladen.
- Nach dem Neuladen des Browsers ist die Einstellung noch aktiv.
- Wechselt der User im selben Browser, gilt dessen eigene Einstellung, ohne eigene Einstellung der Default.
- Uhrzeiten, Tage, Eingabeformulare und die Werte der Einstellungen bleiben unverändert.
- Die Ergebnisse der MCP-Tools bleiben unverändert, auch bei eingeschalteter Industriezeit im Browser.

## Fragen zum Use Case

| Frage                        | Antwort                                                                     |
|------------------------------|-----------------------------------------------------------------------------|
| Wer möchte was?              | Der User stellt die Anzeige der Dauern auf Industriezeit um                 |
| Wer darf das?                | Jeder User für sich selbst. Der Server ist nicht beteiligt                  |
| Welche Regeln gelten?        | Regeln 1 bis 8 oben, das Format als Service in `../../shared/format.ts`     |
| Welche Daten werden geladen? | Keine, nur der Wert des Users aus dem `localStorage`                        |
| Was kann schiefgehen?        | `localStorage` nicht verfügbar: es gilt der Default                         |
| Was ist danach wahr?         | Alle Dauern in der UI werden für diesen User im gewählten Format angezeigt  |
| Wer sieht das Ergebnis?      | Nur der User selbst                                                         |

## Umsetzung

- Die Formate stehen in `../../shared/format.ts`: `formatDuration` und `formatDifference` mit dem Parameter
  `TimeFormat` (`"minutes"` oder `"industrial"`). Der Saldo der Überstunden steht in `formatOffset` in
  `../../shared/overtime-rules.ts`. Ohne Parameter gilt `"minutes"`, deshalb bleiben die MCP-Tools unverändert.
- Der Hook `useTimeFormat` in `../../src/lib/use-time-format.ts` liefert das Format des angemeldeten Users.
  `useIndustrialTime` schaltet um. Die Komponenten übergeben das Format nur an die Formate.
- Der Schalter ist ein `DropdownMenuCheckboxItem` in `UserDropdown`
  (`../../src/features/users/components/user-dropdown.tsx`).

## Tests

- **Service-Tests:** `describe("Industriezeit")` in `../../shared/format.test.ts` mit den Beispielen oben,
  `formatOffset` in `../../shared/overtime-rules.test.ts`
- **Komponenten-Test:** `../../src/tests/industrial-time.test.tsx` schaltet im Benutzermenü um, prüft
  Tagesbericht und Häkchen des Eintrags, schaltet zurück und prüft, dass die Einstellung nach erneutem
  Rendern erhalten bleibt.
