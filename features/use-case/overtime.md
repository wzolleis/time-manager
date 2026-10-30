---
name: overtime
description: Die Anzahl der Überstunden wird angezeigt und es kann auch angepasst werden
type: story
epics: zeiterfassung, report
state: resolved
---

# Überstunden
Es gibt für jeden Tag eine Sollzeit. Wenn die tatsächliche Zeit abweicht, so sind das allgemein Überstunden. 
Diese können auch negativ sein, das ist dann eine Fehlzeit.
Wenn man alle Überstunden der Zeiterfassung aufsummiert und mit dem aufsummierten Sollwert vergleicht, so kann
man die Überstunden bzw. die Fehlzeit insgesamt berechnen.

# Berechnung
Gespeichert wird nur die Korrektur (siehe unten), nicht die Summen der Arbeits- und Sollzeit.
Der Saldo der Überstunden wird bei jeder Anzeige berechnet:

Saldo = Korrekturwert + Σ (Arbeitszeit − Sollzeit) aller Tage ab dem Tag der Korrektur bis heute

Arbeitszeit, Sollzeit und Differenz eines Tages kommen aus den vorhandenen Services
(`shared/time-report.ts`, `shared/target-hours.ts`), also mit Urlaub, Feiertagen und Krankmeldungen
genau wie in den Berichten. Ändert sich eine Buchung, ein Urlaub, eine Krankmeldung oder ein Feiertag,
stimmt der Saldo deshalb automatisch wieder.
Ohne Korrektur ist der Korrekturwert 0 und gerechnet wird ab Beginn der Zeiterfassung.

Für heute gilt eine Ausnahme: Das Soll des heutigen Tages zählt erst, sobald heute ein „Gehen“ gebucht ist.
Vorher zählt nur die Arbeitszeit von heute, auch die laufende seit einem offenen Kommen. Vergangene Tage
zählen immer mit dem vollen Soll, auch ohne Gehen. Die Berichte rechnen heute weiter mit dem vollen Soll.

# Korrektur (Offset)
Die Überstunden müssen ab und zu korrigiert werden. Anfangs ist das notwendig, da die Zeiten nicht komplett
in dieser Anwendung erfasst wurden, sondern es schon einen Startwert gibt.
Später ist es notwendig, da es u. U. Abweichungen zwischen den Daten in der Anwendung und
der Zeiterfassung in der Firma geben kann.
Zusätzlich zum Wert wird das Datum der Korrektur gespeichert. Das ist der Zeitpunkt, an dem die Korrektur
in die Datenbank eingetragen wurde. Der Korrekturwert ist der Saldo bis einschließlich des Vortags,
ab dem Tag der Korrektur wird weitergerechnet.

# Daten
Die Korrektur steht in der Tabelle `overtime`. Je User gibt es höchstens einen Eintrag. Eine neue Korrektur
legt ihn beim ersten Mal an und aktualisiert ihn danach, alte Korrekturen werden nicht aufbewahrt.

| Spalte    | Typ                  | Inhalt                                                          |
|-----------|----------------------|-----------------------------------------------------------------|
| `user_id` | UUID, Primärschlüssel | der User, für den die Korrektur gilt, Fremdschlüssel auf `users` |
| `offset`  | Integer              | Korrekturwert in Minuten, positiv (Überstunden) oder negativ (Fehlzeit) |
| `created` | Zeitpunkt (UTC)      | wann die Korrektur eingetragen wurde                            |

# Zugriff
Jeder User sieht nur seine eigenen Überstunden und trägt nur für sich selbst eine Korrektur ein.
Der Server prüft das.

# Anzeige und Bearbeiten
Die Überstunden sind ein eigener Eintrag unterhalb der Reports, Route `/user/reports/overtime`
(wie `/user/reports/yearly`). Der Name des Menüs ist „Überstunden“.
Wenn der Anwender darauf klickt, werden die Überstunden als Karte (`MetricCard`) angezeigt. Die Karte enthält:
- den Saldo der Überstunden (siehe Berechnung), z. B. „+14:30 h“ oder „−2:15 h“,
- das Datum der Korrektur (`TT.MM.JJJJ`, Zeitzone Europe/Berlin) mit dem Korrekturwert, z. B.
  „Korrektur am 01.10.2026: +3:30 h“. Ohne Korrektur steht dort „Keine Korrektur“.

Zusätzlich gibt es einen Button „Bearbeiten“. Er öffnet einen Dialog, in dem der Anwender den Korrekturwert
absolut setzt (siehe Eingabe). Die Felder sind mit dem bisherigen Korrekturwert vorbelegt. Beim Speichern wird
der Eintrag in `overtime` angelegt oder überschrieben, `created` ist der Zeitpunkt des Speicherns.

Laden und Fehler wie in `.claude/skills/architecture/views.md`: „Lade…“, bei einem Fehler die Meldung
mit „Erneut versuchen“.

# Eingabe des Korrekturwerts
Der Dialog hat drei Auswahlfelder (`Select`) nebeneinander:

| Feld      | Werte   | Vorbelegung ohne Korrektur |
|-----------|---------|----------------------------|
| Vorzeichen | `+`, `−` | `+`                       |
| Stunden   | 0 bis 23 | 0                         |
| Minuten   | 0 bis 59 | 0                         |

Immer genau ein Wert je Feld ist ausgewählt, eine ungültige Eingabe ist in der UI also nicht möglich.
Gespeichert wird `offset = Vorzeichen × (Stunden × 60 + Minuten)`. Damit liegt der Korrekturwert zwischen
−23:59 h und +23:59 h. Der Server prüft diesen Bereich und antwortet bei einem Verstoß mit 422.

| Auswahl     | `offset` (Minuten) | Bedeutung                                                         |
|-------------|--------------------|-------------------------------------------------------------------|
| `+` 3 : 30  | 210                | 3 h 30 min werden auf die berechnete Anzahl (Ist − Soll) addiert  |
| `−` 0 : 10  | −10                | 10 Minuten werden von der berechneten Anzahl abgezogen            |
| `+` 0 : 00  | 0                  | keine Korrektur, gerechnet wird trotzdem ab dem Tag der Korrektur |
| `−` 0 : 00  | 0                  | wie oben, gespeichert wird 0                                      |

Beim Vorbelegen aus einem gespeicherten Wert: Vorzeichen `−` bei negativem `offset`, sonst `+`;
Stunden = `|offset| div 60`, Minuten = `|offset| mod 60`.

# Beispiele
Feiertage, Urlaub und Krankmeldungen gibt es im Beispiel nicht. Sollzeit 8 h je Arbeitstag.

- **Ohne Korrektur:** Die Zeiterfassung beginnt am Mo 05.10.2026. Bis Fr 09.10. sind 42 h gebucht, Soll 40 h.
  Am Sa 10.10. zeigt die Karte „+2:00 h“ und „Keine Korrektur“.
- **Mit Korrektur:** Am Mo 12.10.2026 um 09:00 trägt der User `+3:30` ein. Am Mo, Di und Mi bucht er je 9 h.
  Am Do 15.10. vor dem ersten Kommen zeigt die Karte 3:30 + 3 × 1:00 (das Soll von Do zählt noch nicht)
  = „+6:30 h“ und „Korrektur am 12.10.2026: +3:30 h“. Die Tage vor dem 12.10. zählen nicht mehr.
- **Nachträgliche Änderung:** Der User ändert danach das Gehen am Di 13.10., sodass dort nur 8 h stehen.
  Ohne neue Korrektur zeigt die Karte „+5:30 h“.

# Abgrenzung
Die Anzeige der Überstunden ist getrennt von der Anzeige der Sollzeit und der Überstunden in den bisher vorhandenen 
Reports (Tag, Woche, Monat, Jahr). Dort wird die Abweichung der geleisteten Arbeit von der Sollzeit angezeigt.
Das bleibt auch so. 
Die Überstunden sind ein aufsummierter Wert dieser Abweichungen, der auch korrigiert werden kann.

Überstunden werden nicht ausgezahlt und verfallen nicht. Ein Admin korrigiert die Überstunden eines Users nicht,
jeder User korrigiert nur seine eigenen. Eine Historie der Korrekturen gibt es nicht.

# MCP
Wie die Berichte gibt es die Überstunden auch als MCP-Tools für einen Agent
(`../../netlify/functions/lib/mcp-tools/`, `../boundaries/mcp-enable.md`):

- `get_overtime`: Saldo, Datum und Wert der Korrektur des Users, gerechnet mit denselben Services wie die UI.
  `readOnlyHint: true`.
- `set_overtime_offset`: setzt den Korrekturwert absolut, Eingabe `sign` (`+`/`-`), `hours` (0–23),
  `minutes` (0–59), wie im Dialog. Legt den Eintrag in `overtime` an oder überschreibt ihn, `created` ist jetzt.

# Use Cases
Umgesetzt wird nach dem Skill `architecture` (`../../.claude/skills/architecture`), zuerst
`../../.claude/skills/architecture/use-case.md` lesen. Vorbild für Bericht und Karte ist der
Jahresbericht (`use-show-yearly-report.ts`, `report-yearly-page.tsx`), für Function, API und View die
Krankmeldungen (`sick-leaves.ts`).

| Use Case                                   | Hook                 |
|--------------------------------------------|----------------------|
| Der User sieht seine Überstunden.          | `useShowOvertime`    |
| Der User korrigiert seine Überstunden.     | `useChangeOvertime`  |

# Fragen zum Use Case

| Frage                        | Antwort                                                                                                   |
|------------------------------|-----------------------------------------------------------------------------------------------------------|
| Wer möchte was?              | Der User sieht seine Überstunden und setzt den Korrekturwert (Hooks siehe oben)                           |
| Wer darf das?                | Jeder User für sich selbst, im User-Bereich. Der Server prüft.                                            |
| Welche Regeln gelten?        | Berechnung und Eingabe des Korrekturwerts, als Services in `../../shared/`. Die Function prüft die Eingabe noch einmal. |
| Welche Daten werden geladen? | Korrektur, Buchungen, Urlaube, Feiertage und Krankmeldungen des Users                                     |
| Was kann schiefgehen?        | Laden schlägt fehl: Meldung mit „Erneut versuchen“. Ungültiger Wert: 422 mit Meldung.                     |
| Was ist danach wahr?         | Der Eintrag in `overtime` ist angelegt oder überschrieben. Invalidiert wird `["overtime"]`.               |
| Wer sieht das Ergebnis?      | Nur der User selbst, auf der Seite „Überstunden“                                                          |

# Umsetzung nach der Architektur

| Baustein    | Datei                                                         | Inhalt                                                                                                                                                                                  |
|-------------|---------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Schema      | `../../db/schema.ts`, neue Migration in `../../db/migrations/` | neu: Tabelle `overtime` mit `user_id` (Primärschlüssel, Fremdschlüssel auf `users`), `offset` (int), `created` (Zeitpunkt)                                                              |
| Schema      | `../../shared/overtime.ts`                                    | neu: `Overtime`, `OvertimeUpdate` mit drizzle-zod, wie `../../shared/sick-leave.ts`                                                                                                     |
| Service     | `../../shared/overtime-rules.ts`                              | neu: `toOffset(sign, hours, minutes)` → Minuten, `fromOffset(minutes)` → `{sign, hours, minutes}`, `checkOffset(minutes)` (Bereich ±23:59), `formatOffset(minutes)` → „+3:30“, `overtimeBalanceMs(offset, entries, vacations, holidays, sickLeaves, today, now)` (Berechnung, Summe von `dayDiffMs` ab dem Tag der Korrektur bzw. ab `firstBookingDay`) |
| Service     | `../../shared/time-report.ts`, `../../shared/target-hours.ts` | unverändert, werden wiederverwendet                                                                                                                                                     |
| Function    | `../../netlify/functions/overtime.ts`                         | neu: `GET/PUT /api/users/:userId/overtime`, wie `sick-leaves.ts`. `PUT` legt an oder überschreibt (Upsert), setzt `created` auf jetzt und prüft den Wert. `GET` ohne Eintrag: `null`. |
| API         | `../../src/api/overtime.ts`                                   | neu: `fetchOvertime`, `saveOvertime`                                                                                                                                                    |
| View        | `../../src/views/overtime.ts`                                 | neu: `useOvertime(userId)`, Key `["overtime", userId]`                                                                                                                                  |
| Use Cases   | `../../src/features/reports/use-cases/`                       | neu: `use-show-overtime.ts` (lädt Korrektur, Buchungen, Urlaube, Feiertage, Krankmeldungen wie `use-show-yearly-report.ts`), `use-change-overtime.ts` (liefert `problem`, invalidiert `["overtime"]`) |
| Komponenten | `../../src/features/reports/components/`                      | neu: `report-overtime-page.tsx` (Karte und Button), `overtime-dialog.tsx` (Eingabefeld, Meldung, Speichern), zeigen nur an                                                              |
| Route       | `../../src/routes/user/reports/overtime/index.tsx`            | neu: `/user/reports/overtime`, bindet nur die Seite ein                                                                                                                                 |
| Menü        | `../../src/application/navigation/nav-items.ts`               | neue ID `reports-overtime`, Eintrag „Überstunden“ nach `reports-yearly`, Icon `RotateCcwClock` aus `lucide-react`                                                                       |
| MCP         | `../../netlify/functions/lib/mcp-tools/overtime.ts`, Registrierung in `index.ts` | neu: `get_overtime` und `set_overtime_offset` (siehe MCP), Daten über `loadReportData` und die Korrektur, Text und `structured` wie in `reports.ts`                     |
| Tests       | neben den Dateien, wie `*.test.ts`                            | Umrechnung `toOffset`/`fromOffset`, Bereich und Beispiele oben als Tests für `overtime-rules.ts`, Seite wie `report-yearly.test.tsx`, MCP-Tools wie `report-view.test.ts`               |

