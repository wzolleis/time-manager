---
name: user-setting-action-bar
description: Neue Einstellung show_action_bar (boolean, Default true), mit der der User die Action-Bar ein- und ausblendet. Sie hat keine Historie und kein „gültig ab“, ein neuer Wert gilt sofort (valid_from_unit immediately).
type: change
changes: user-settings
epics: einstellungen, navigation
state: resolved
---

# Einstellung „Action-Bar anzeigen“

„Der User blendet die Action-Bar in seinen Einstellungen ein oder aus.“

Die Action-Bar (`../use-case/action-bar.md`) soll sich abschalten lassen. Dafür gibt es eine neue
Einstellung auf der Einstellungsseite (`/user/settings`):

| Name              | Typ     | Einheit | Default | gültig ab | Erlaubte Werte  | Beschreibung              |
|-------------------|---------|---------|---------|-----------|-----------------|---------------------------|
| `show_action_bar` | boolean | –       | true    | sofort    | `true`, `false` | Zeige die Action-Bar an   |

Beschreibung der Einstellungen: `../use-case/user-settings.md`.

## Warum ohne Historie?

Soll und Urlaubstage gehen in Berichte und Überstunden ein. Deshalb gilt jeder Wert ab einem Tag, und
alte Werte gelten für die Vergangenheit weiter (Regeln 2 und 7). Ob die Action-Bar angezeigt wird, betrifft
nur die Oberfläche von jetzt an, keine Berechnung. Einen Wert für die Vergangenheit oder einen geplanten
Wert braucht es nicht. Der User erwartet, dass die Action-Bar sofort verschwindet, wenn er sie ausschaltet.

## Verhalten

1. **Neue Art von „gültig ab“: sofort** (`valid_from_unit = immediately`). Ein neuer Wert ersetzt den
   bisherigen und gilt ab sofort. Es gibt keine geplanten und keine abgelaufenen Werte.
2. **Pro User höchstens ein eigener Wert.** Beim Speichern wird der vorhandene Wert überschrieben, sonst
   ein neuer angelegt. `valid_from` ist der Tag der letzten Änderung (Europe/Berlin), er wird nur angezeigt
   und nicht geprüft.
3. **Für diese Einstellung entfallen** Regel 3 („gültig ab“ in der Zukunft), Regel 4 und Regel 5. Regel 7
   wird ersetzt: Der aktuelle Wert lässt sich direkt ändern.
4. **Gültige Werte (Regel 6):** nur `true` oder `false`, sonst „show_action_bar: bitte true oder false
   angeben“. Oder „Default“ (`null`): Dann gilt sofort wieder der Default. Gilt schon der Default, ist
   „Auf Default zurücksetzen“ gesperrt und wird vom Server abgelehnt
   („show_action_bar: es gilt schon der Default“).
5. **Anzeige in der Tabelle:** genau eine Zeile für die Einstellung, nicht Default und eigene Werte
   getrennt.
   - Wert: „Ja“ oder „Nein“, bei „Default“ „Default (Ja)“
   - gültig ab: der Tag der letzten Änderung, ohne eigenen Wert leer
   - Status: immer „aktuell“
6. **Aktionen:** „Ändern“ öffnet den Dialog mit einer Auswahl „Ja“ / „Nein“ und **ohne** „gültig ab“.
   „Auf Default zurücksetzen“ setzt ohne Datum sofort auf den Default. „Bearbeiten“ und „Löschen“ gibt es
   nicht, weil es keine geplanten Werte gibt.
7. **Auswertung:** Gilt `true` (eigener Wert oder Default), zeigt die Anwendung die Action-Bar, bei `false`
   nicht. Solange die Einstellungen noch nicht geladen sind, gilt der Default aus
   `../../shared/user-setting.ts` (`true`).

## Daten

Neue Migration `0017_user_setting_show_action_bar.sql` in `../../db/migrations/` (nach
`0016_user_setting_value_default.sql`), `../../db/schema.ts` anpassen:

- `user_settings.type` bekommt den Wert `boolean`: `enum('number','string','boolean')`.
- `user_settings.valid_from_unit` bekommt den Wert `immediately`: `enum('day','year','immediately')`.
- Neue Zeile in `user_settings`:

  | Spalte            | Wert                                    |
  |-------------------|-----------------------------------------|
  | `id`              | `e2e48edb-c612-466e-a886-03c72466e4f3`  |
  | `name`            | `Action Bar`                            |
  | `description`     | `Zeige die Action-Bar an`               |
  | `type`            | `boolean`                               |
  | `unit`            | `NULL`                                  |
  | `default_value`   | `true`                                  |
  | `valid_from_unit` | `immediately`                           |

- `user_setting_values` bleibt unverändert. Der Wert steht als `"true"` oder `"false"` in `value`,
  `null` ist „Default“.
- Ändert sich das Format, das `GET /api/users/:id/settings` liefert (neue Werte in `type` und
  `validFromUnit`), muss `buster` in `../../src/query-client.ts` erhöht werden
  (`../../.claude/skills/architecture/repository.md`, „Cache im localStorage“).

## Umsetzung

| Art | Datei | Änderung |
|-----|-------|----------|
| Schema | `../../shared/user-setting.ts` | `SHOW_ACTION_BAR_SETTING_ID` und `DEFAULT_SHOW_ACTION_BAR = true`. `validFrom` in Create optional, für `immediately` setzt der Server den Tag. |
| Service | `../../shared/user-setting-rules.ts` | `checkSettingValue` prüft für `boolean` nur `true`/`false` und für `immediately` nicht die Regeln 3 bis 5, bei „Default“ nur, ob schon der Default gilt. Neu: `booleanSettingOf(data, settingId)` liefert den aktuellen Wert (eigener Wert oder Default), ohne `historyOf`, das nur Zahlen kennt. `historyOf` und `valueOn` bleiben für Soll und Urlaubstage unverändert. |
| Backend | `../../netlify/functions/lib/user-settings-store.ts` | `addSettingValue`: bei `immediately` den vorhandenen Wert des Users überschreiben oder neu anlegen, `validFrom` = heute, in der Transaktion mit `lockUser`. `changeSettingValue` und `deleteSettingValue` lehnen Werte dieser Einstellung ab („show_action_bar: bitte einen neuen Wert eintragen“). |
| MCP | `../../netlify/functions/lib/mcp-tools/user-settings.ts`, `user-settings-view.ts` | `set_user_setting`: `value` als `number \| boolean \| null`, `validFrom` optional, in `RULES` die Einstellung `show_action_bar` (sofort gültig, `true`/`false`). `list_user_settings` zeigt sie mit „Ja“/„Nein“. |
| Use Case | `../../src/features/user-settings/use-cases/` | `use-show-user-settings.ts`: für `immediately` eine Zeile statt Default und eigene Werte, `valueText` für `boolean` „Ja“/„Nein“. `use-add-user-setting.ts` speichert ohne „gültig ab“. |
| Komponenten | `../../src/features/user-settings/components/` | `user-setting-dialog.tsx`: bei `boolean` Auswahl „Ja“/„Nein“ mit dem vorhandenen `Select` statt `Input`, bei `immediately` kein Feld „gültig ab“. `user-setting-actions.tsx`: „Auf Default zurücksetzen“ speichert sofort, ohne Dialog mit Datum. |
| Use Case Action-Bar | – | Liest die Einstellung über `booleanSettingOf(…, SHOW_ACTION_BAR_SETTING_ID)`. Die Action-Bar selbst gehört zu `../use-case/action-bar.md`, nicht zu diesem Change. |

Hinweise:

- Keine neue Komponente aus shadcn (z. B. Switch) nötig, `Select` ist vorhanden. Dateien in
  `../../src/components/ui/` werden nicht geändert.
- Regeln prüft der Service in `shared/`, die Komponente zeigt nur seine Meldung.

Geändert wird nach dem Skill `architecture` (`../../.claude/skills/architecture`), zuerst
`../../.claude/skills/architecture/use-case.md` lesen. Neue Dateien nach den Skills `ui-modules`,
`shared-modules` und `backend-modules`.

## Fertig, wenn

- **Service-Tests** in `../../shared/user-setting-rules.test.ts`:
  - `show_action_bar` mit `true`, `false` und „Default“ ist erlaubt, `ja`, `1` und leer werden abgelehnt.
  - „gültig ab“ heute oder in der Vergangenheit wird für `immediately` nicht abgelehnt, auch wenn es schon
    einen eigenen Wert gibt.
  - „Default“, wenn schon der Default gilt, wird abgelehnt.
  - `booleanSettingOf` liefert ohne Daten und ohne eigenen Wert `true`, mit eigenem Wert diesen, nach
    „Default“ wieder den Default.
- **Komponenten-Test** in `../../src/features/user-settings/components/user-settings.test.tsx`: Die Tabelle
  zeigt „show_action_bar“ mit „Ja“ und Status „aktuell“. Ändern auf „Nein“ ohne „gültig ab“ zeigt sofort
  „Nein“ in derselben Zeile; „Auf Default zurücksetzen“ zeigt „Default (Ja)“.
- **MCP-Test:** `set_user_setting` mit `name: "show_action_bar"`, `value: false` ohne `validFrom` speichert,
  ein zweiter Aufruf mit `true` überschreibt den Wert, `list_user_settings` zeigt einen Wert.
- `../use-case/user-settings.md` beschreibt die neue Einstellung: Tabelle der Einstellungsmöglichkeiten,
  `type` `boolean`, `valid_from_unit` `immediately`, die Ausnahmen bei den Regeln 3 bis 7 und neue
  Akzeptanzkriterien.
- Typprüfung, Lint und `npx vitest run` laufen durch.
