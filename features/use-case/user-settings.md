---
name: user-settings
description: Der User passt das Verhalten der Anwendung mit seinen Einstellungen an (Soll pro Tag, Urlaubstage pro Jahr, Action-Bar anzeigen). Jeder Wert gilt ab einem Tag, ältere Werte gelten für die Vergangenheit weiter. Einstellungen ohne Historie gelten sofort.
type: story
epics: zeiterfassung, einstellungen
state: resolved
---

# Einstellungen des Users
„Der User kann seine Einstellungen sehen und bearbeiten.“

## Einstellungen
Im Avatar-Menü oben rechts gibt es den Eintrag „Einstellungen“ (Route `/user/settings`).
Ein Klick darauf zeigt die Einstellungsseite.
Dort steht eine Tabelle mit den Spalten „Name“, „Wert“, „gültig ab“, „Status“ und „Beschreibung“:
* Name = der Name der Einstellung
* Wert = der Wert der Einstellung mit Einheit, z. B. „8 Stunden“, oder „Default (8 Stunden)“ (siehe
  [Auf den Default zurücksetzen](#auf-den-default-zurücksetzen))
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
| show_action_bar | boolean | –   | true    | sofort           | `true`, `false`   | Zeige die Action-Bar an (`action-bar.md`)                                    |

Hat der User keine eigenen Werte eingetragen, wird der Default angezeigt. Der Default hat kein „gültig ab“, er gilt ab dem ersten Eintrag in der Zeiterfassung.

Der User kann einen neuen Wert eintragen, aber keine neuen Einstellungen anlegen. Dazu wählt er den Wert
und das Datum „gültig ab“. Beim Speichern wird ein neuer Eintrag angelegt und angezeigt. Der alte Wert
bleibt stehen und gilt bis zum Tag vor dem neuen „gültig ab“ weiter.

## Einstellungen ohne Historie

Manche Einstellungen betreffen nur die Oberfläche von jetzt an, keine Berechnung, z. B. `show_action_bar`. Sie
haben keine Historie (`valid_from_unit = immediately`): Ein neuer Wert gilt sofort und ersetzt den bisherigen.

- Pro User höchstens ein eigener Wert. `valid_from` ist der Tag der letzten Änderung, er wird nur angezeigt.
- Die Tabelle zeigt eine Zeile je Einstellung: den eigenen Wert oder den Default, Status immer „aktuell“.
  Werte vom Typ `boolean` stehen als „Ja“ oder „Nein“ da.
- „Ändern“ öffnet den Dialog ohne „gültig ab“, bei `boolean` mit der Auswahl „Ja“ / „Nein“. „Auf Default
  zurücksetzen“ gilt sofort, ohne Dialog. „Bearbeiten“ und „Löschen“ gibt es nicht.
- Statt der Regeln 3, 4, 5 und 7 gilt nur: „Default“ geht nicht, wenn schon der Default gilt.

## Auf den Default zurücksetzen

Statt einer Zahl kann der User den Wert **„Default“** eintragen: Ab „gültig ab“ gilt wieder der Default
der Einstellung, wie bei einem User ohne eigene Werte. Ändert sich später der Default, gilt der neue
Default auch hier. Gespeichert wird „Default“ als `value = null`.

- In der Zeile des aktuellen Werts öffnet „Auf Default zurücksetzen“ den Dialog mit der Auswahl „Default“.
  Vorgabe für „gültig ab“: morgen, bei Urlaubstagen der 1. Januar des nächsten Jahres. Gilt schon der
  Default, ist der Button gesperrt.
- Im Dialog zum Ändern und Bearbeiten wählt der User unter „Art“ zwischen „Eigener Wert“ und „Default“.
- Die Tabelle zeigt „Default (8 Stunden)“ mit dem aktuellen Default.
- Vergangene Werte bleiben stehen: Das Zurücksetzen wirkt wie jeder neue Wert erst ab „gültig ab“.
  Bestehende eigene Werte, deren Zahl dem Default entspricht, bleiben Zahlen.

## Daten

Tabelle `user_settings` mit den definierten Einstellungen. Initial stehen dort die Einstellungen von oben.

| Spalte            | Typ                  | Inhalt                                                        |
|-------------------|----------------------|---------------------------------------------------------------|
| `id`              | UUID                 |                                                               |
| `name`            | Text, eindeutig      | z. B. `Soll`, `Urlaubstage`                                   |
| `description`     | Text                 | Beschreibung für die Tabelle                                  |
| `type`            | `number` \| `string` \| `boolean` | Typ des Werts, `boolean` als `true` oder `false`     |
| `unit`            | `hour` \| `day`, nullable | Einheit des Werts                                        |
| `default_value`   | Text                 | Default als String, z. B. `8`                                 |
| `valid_from_unit` | `day` \| `year` \| `immediately` | `year`: „gültig ab“ muss ein 1. Januar sein (Urlaubstage); `immediately`: ohne Historie, gilt sofort |

Tabelle `user_setting_values` mit den Werten der User:

| Spalte       | Typ          | Inhalt                                          |
|--------------|--------------|-------------------------------------------------|
| `id`         | UUID         |                                                 |
| `user_id`    | UUID         | der User, für den der Wert gilt                 |
| `setting_id` | UUID         | Verweis auf `user_settings.id`                  |
| `value`      | Text, nullable | Wert als String, wird nach `type` ausgewertet; `null`: „Default“ |
| `valid_from` | Date         | erster Tag, an dem der Wert gilt                |

Eindeutig ist `(user_id, setting_id, valid_from)`.

## Regeln

1. **Wert zu einem Tag.** Für einen Tag gilt der Wert mit dem größten `valid_from`, das nicht nach diesem
   Tag liegt. Gibt es keinen oder ist es „Default“, gilt der Default.
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
   Bei `boolean` nur `true` oder `false`.
   Oder „Default“: Das geht nur, wenn am Tag vor „gültig ab“ ein eigener Wert gilt, sonst gilt dort schon
   der Default („Soll: ab dem 27.10.2026 gilt schon der Default“).
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
| `set_user_setting`     | neuen Wert mit „gültig ab“ eintragen (Name der Einstellung, Wert, Tag); Wert `null`: „Default“. Bei Einstellungen ohne Historie ohne Tag, Wert bei `show_action_bar` `true` oder `false` |
| `change_user_setting`  | geplanten Wert ändern (Regel 7), auch auf `null`                        |
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
- „Auf Default zurücksetzen“ ab morgen legt den Wert „Default“ an, die Tabelle zeigt „Default (8 Stunden)“
  als „geplant“. Ab morgen rechnen Berichte und Urlaubsplanung mit dem Default, davor mit dem eigenen Wert.
- Ohne eigenen Wert ist „Auf Default zurücksetzen“ gesperrt; „Default“ ohne eigenen Wert am Tag davor wird
  abgelehnt.
- `show_action_bar` steht ohne eigenen Wert als „Ja“ in einer Zeile. Ändern auf „Nein“ braucht kein „gültig ab“,
  die Zeile zeigt sofort „Nein“; ein zweiter Wert überschreibt den ersten. Werte außer `true` und `false` werden
  abgelehnt.
