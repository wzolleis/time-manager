---
name: user-settings
description: Der User passt das Verhalten der Anwendung mit seinen Einstellungen an (Soll pro Tag, Urlaubstage pro Jahr). Jeder Wert gilt ab einem Tag, ältere Werte gelten für die Vergangenheit weiter.
type: story
epics: zeiterfassung, einstellungen
state: resolved
---

# Einstellungen des Users
„Der User kann seine Einstellungen sehen und bearbeiten.“

## Einstellungen
Im Menü unter „User“ gibt es als ersten Eintrag „Einstellungen“ (Route `/user/settings`).
Ein Klick darauf zeigt die Einstellungsseite.
Dort steht eine Tabelle mit den Spalten „Name“, „Wert“, „gültig ab“, „Status“ und „Beschreibung“:
* Name = der Name der Einstellung
* Wert = der Wert der Einstellung mit Einheit, z. B. „8 Stunden“
* gültig ab = ab welchem Tag der Wert gilt. Es werden nur Tage ausgewählt, der Wert gilt ab 00:00 dieses
  Tages (Europe/Berlin).
* Status = „aktuell“, „geplant“ oder „abgelaufen“ (siehe [Regeln](#regeln))
* Beschreibung = zusätzliche Beschreibung der Einstellung

Pro Einstellung gibt es eine Zeile je Wert, also auch für ältere und geplante Werte.

## Einstellungsmöglichkeiten

| Name        | Typ    | Einheit | Default | gültig ab        | Erlaubte Werte    | Beschreibung                                                                 |
|-------------|--------|---------|---------|------------------|-------------------|------------------------------------------------------------------------------|
| Soll        | number | hour    | 8       | ein Tag          | ganze Zahl 1–10   | Die Anzahl der Stunden, die pro Tag gearbeitet wird. Das heißt auch Soll.   |
| Urlaubstage | number | day     | 30      | 1. Januar        | ganze Zahl ≥ 0    | Die Anzahl der Urlaubstage pro Jahr                                          |

Hat der User keine eigenen Werte eingetragen, wird der Default angezeigt. Der Default hat kein „gültig ab“, er gilt ab dem ersten Eintrag in der Zeiterfassung.

Der User kann einen neuen Wert eintragen, aber keine neuen Einstellungen anlegen. Dazu wählt er den Wert
und das Datum „gültig ab“. Beim Speichern wird ein neuer Eintrag angelegt und angezeigt. Der alte Wert
bleibt stehen und gilt bis zum Tag vor dem neuen „gültig ab“ weiter.

## Daten

Tabelle `user_settings` mit den definierten Einstellungen. Initial stehen dort die Einstellungen von oben.

| Spalte            | Typ                  | Inhalt                                                        |
|-------------------|----------------------|---------------------------------------------------------------|
| `id`              | UUID                 |                                                               |
| `name`            | Text, eindeutig      | z. B. `Soll`, `Urlaubstage`                                   |
| `description`     | Text                 | Beschreibung für die Tabelle                                  |
| `type`            | `number` \| `string` | Typ des Werts                                                 |
| `unit`            | `hour` \| `day`, nullable | Einheit des Werts                                        |
| `default_value`   | Text                 | Default als String, z. B. `8`                                 |
| `valid_from_unit` | `day` \| `year`      | `year`: „gültig ab“ muss ein 1. Januar sein (Urlaubstage)     |

Tabelle `user_setting_values` mit den Werten der User:

| Spalte       | Typ          | Inhalt                                          |
|--------------|--------------|-------------------------------------------------|
| `id`         | UUID         |                                                 |
| `user_id`    | UUID         | der User, für den der Wert gilt                 |
| `setting_id` | UUID         | Verweis auf `user_settings.id`                  |
| `value`      | Text         | Wert als String, wird nach `type` ausgewertet  |
| `valid_from` | Date         | erster Tag, an dem der Wert gilt                |

Eindeutig ist `(user_id, setting_id, valid_from)`.

## Regeln

1. **Wert zu einem Tag.** Für einen Tag gilt der Wert mit dem größten `valid_from`, das nicht nach diesem
   Tag liegt. Gibt es keinen, gilt der Default.
2. **Status.**
   - „aktuell“: der Wert, der heute nach Regel 1 gilt (auch der Default)
   - „geplant“: `valid_from` liegt nach heute
   - „abgelaufen“: es gibt einen neueren Wert, der heute schon gilt. Der Wert gilt aber für seinen Zeitraum
     in der Vergangenheit weiter, sonst würden z. B. Berichte über vergangene Jahre falsch.
3. **„gültig ab“ liegt in der Zukunft**, also frühestens morgen. Ausnahme: Hat der User für diese
   Einstellung noch keinen eigenen Wert, darf der erste Wert auch heute oder in der Vergangenheit gelten,
   z. B. beim ersten Einrichten. Sobald es einen eigenen Wert gibt, sind rückwirkende Werte nicht mehr möglich.
4. **Urlaubstage gelten immer ab Anfang eines Jahres.** `valid_from_unit = year`: „gültig ab“ ist ein
   1. Januar, frühestens der des nächsten Jahres. Für den ersten eigenen Wert gilt die Ausnahme aus
   Regel 3, er darf also auch ab dem 1. Januar eines vergangenen oder des laufenden Jahres gelten.
5. **Ein „gültig ab“ je Einstellung nur einmal.** Ein zweiter Wert mit demselben „gültig ab“ für dieselbe
   Einstellung wird abgelehnt.
6. **Gültige Werte.** Nur ganze Zahlen, keine Dezimalzahlen. Soll ist 1 bis 10, Urlaubstage sind nicht negativ.
7. **Ändern und Löschen.** Geplante Werte darf man ändern und löschen. Abgelaufene Werte darf man weder ändern noch löschen, sie gelten für die Vergangenheit weiter (Regel 2).
   Den aktuellen Wert ändert man nicht, man trägt einen neuen Wert mit späterem „gültig ab“ ein.
   Den Default kann man nicht löschen.
8. **Soll in den Berechnungen.** Das Soll ersetzt `DAILY_TARGET_MS` (`shared/target-hours.ts`), und zwar je
   Tag nach Regel 1. Davon hängen Tages-, Wochen-, Monats- und Jahresbericht und die Überstunden
   (`overtime.md`) ab. Wochenende, Feiertage, Krankheit und Urlaub bleiben Soll 0.
9. **Urlaubstage in der Urlaubsplanung.** Die Urlaubstage ersetzen `VACATION_DAYS_PER_YEAR`
   (`shared/vacation-rules.ts`). Bei den Urlauben (`/user/vacations`) gehen sie in die geplanten,
   verbrauchten und noch freien Tage und in die Jahresgrenze ein, je Jahr mit dem Wert, der am 1. Januar
   dieses Jahres gilt.
10. **Jeder User nur für sich.** Der Server prüft das und prüft die Regeln 3 bis 7 noch einmal.

## MCP

Der Agent kann die Einstellungen über MCP-Tools nutzen, mit denselben Regeln wie die UI:

| Tool                   | Inhalt                                                                  |
|------------------------|-------------------------------------------------------------------------|
| `list_user_settings`   | alle Einstellungen mit ihren Werten, „gültig ab“ und Status            |
| `set_user_setting`     | neuen Wert mit „gültig ab“ eintragen (Name der Einstellung, Wert, Tag) |
| `change_user_setting`  | geplanten Wert ändern (Regel 7)                                         |
| `delete_user_setting`  | geplanten Wert löschen (Regel 7)                                        |

Verstöße gegen eine Regel liefern die Meldung der Regel zurück.

## Akzeptanzkriterien

- Ohne eigene Werte zeigt die Seite Soll 8 und Urlaubstage 30 mit Status „aktuell“ und ohne „gültig ab“.
- Ein neues Soll ab morgen erscheint als „geplant“. Ab morgen ist es „aktuell“ und der alte Wert „abgelaufen“.
- Berichte vor dem neuen „gültig ab“ rechnen weiter mit dem alten Soll.
- Ohne eigenen Wert lässt sich ein erstes Soll ab einem Tag in der Vergangenheit eintragen. Die Berichte
  ab diesem Tag rechnen damit, davor gilt weiter der Default.
- Gibt es schon einen eigenen Wert, wird „gültig ab“ heute oder in der Vergangenheit abgelehnt.
- Urlaubstage nicht ab einem 1. Januar, Dezimalzahlen und Soll außerhalb von 1–10 werden abgelehnt.
- Zwei Werte mit demselben „gültig ab“ für dieselbe Einstellung werden abgelehnt.
- Abgelaufene Werte und der aktuelle Wert lassen sich weder ändern noch löschen.
