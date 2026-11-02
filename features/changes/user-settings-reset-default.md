---
name: user-settings-reset-default
description: Der User setzt Soll oder Urlaubstage ab einem Tag in der Zukunft auf den Default zurück. Gespeichert wird ein Wert „Default“ (value null), der immer dem aktuellen Default folgt. Vergangene Werte bleiben unverändert.
type: change
changes: user-settings
epics: einstellungen
state: resolved
---

# Einstellung auf den Default zurücksetzen

„Der User kehrt zu einem Tag in der Zukunft zum Default einer Einstellung zurück.“

Heute kann der User einen eigenen Wert nur durch einen anderen eigenen Wert ablösen. Wer zum Default
zurück will, trägt dessen Zahl ein, z. B. Soll 8. Das ist dann aber ein eigener Wert: Ändert sich später
der Default, bleibt der User auf 8 stehen.

Neu gibt es den Wert **„Default“**. Er wird wie jeder andere Wert mit einem „gültig ab“ eingetragen und
bedeutet: Ab diesem Tag gilt wieder der Default der Einstellung, wie bei einem User ohne eigene Werte.

Beschreibung der Einstellungen: `../use-case/user-settings.md`.

## Warum nicht alle eigenen Werte löschen?

Dann gälte der Default rückwirkend für die ganze Vergangenheit, und vergangene Berichte und der Saldo der
Überstunden würden sich ändern. Das verhindern Regel 2 und Regel 7 („abgelaufene Werte gelten für die
Vergangenheit weiter“). Das Zurücksetzen wirkt deshalb wie jeder neue Wert erst ab „gültig ab“.

## Verhalten

1. **Button „Auf Default zurücksetzen“** auf der Einstellungsseite (`/user/settings`), je Einstellung neben
   dem Eintragen eines neuen Werts. Er öffnet einen Dialog nur mit „gültig ab“. Vorgabe: morgen, bei
   Urlaubstagen der 1. Januar des nächsten Jahres.
2. **Es gelten dieselben Regeln wie für jeden neuen Wert:** „gültig ab“ in der Zukunft (Regel 3),
   Urlaubstage ab einem 1. Januar (Regel 4), ein „gültig ab“ je Einstellung nur einmal (Regel 5). Regel 6
   (ganze Zahl, Grenzen) entfällt für „Default“.
3. **Nur, wenn es etwas zurückzusetzen gibt.** Gilt am Tag vor „gültig ab“ schon der Default (kein eigener
   Wert oder schon „Default“), wird abgelehnt: „<Einstellung>: ab dem <Tag> gilt schon der Default“. Ohne
   eigene Werte ist der Button gesperrt.
4. **Anzeige in der Tabelle:** In der Spalte „Wert“ steht „Default (8 Stunden)“, mit dem aktuellen Default.
   Status wie bei jedem Wert: „geplant“, „aktuell“ oder „abgelaufen“.
5. **Ändern und Löschen** wie bei jedem Wert nur, solange er „geplant“ ist (Regel 7). Beim Ändern lässt sich
   „gültig ab“ verschieben oder statt „Default“ eine Zahl eintragen, und umgekehrt.
6. **Berechnungen:** Ab „gültig ab“ rechnen Berichte, Überstunden und Urlaubsplanung mit dem Default. Ändert
   sich der Default in `user_settings.default_value`, gilt der neue Default auch für diesen User.

## Daten

- `user_setting_values.value` wird nullable. `null` bedeutet „Default“. Neue Migration in `../../db/migrations/`
  (nach `0015_passkeys.sql`), `../../db/schema.ts` anpassen.
- Bestehende Werte bleiben, wie sie sind. Ein eigener Wert mit derselben Zahl wie der Default wird **nicht**
  in „Default“ umgewandelt, denn der User hat ihn bewusst als Zahl eingetragen.
- Ändert sich das Format, das `GET /api/users/:id/settings` liefert (`value: string | null`), muss `buster`
  in `../../src/query-client.ts` erhöht werden (`../../.claude/skills/architecture/repository.md`, „Cache im
  localStorage“).

## Umsetzung

| Art | Datei | Änderung |
|-----|-------|----------|
| Schema | `../../shared/user-setting.ts` | `value` in Create und Update: `string \| null` |
| Service | `../../shared/user-setting-rules.ts` | `SettingPoint.value: number \| null`; `historyOf` übernimmt `null`. `valueOn` bleibt `pointOn(…)?.value ?? defaultValue` und liefert damit für „Default“ schon den Default. `checkSettingValue` prüft Regel 6 nur bei einer Zahl und lehnt „Default“ nach Verhalten 3 ab. |
| Backend | `../../netlify/functions/user-settings.ts`, `../../netlify/functions/lib/user-settings-store.ts` | `null` durchreichen, die Prüfung macht `checkSettingValue` |
| MCP | `../../netlify/functions/lib/mcp-tools/user-settings.ts` | `set_user_setting` und `change_user_setting`: `value` als `number \| null`, in der Beschreibung „null: ab validFrom gilt wieder der Default“. `list_user_settings` zeigt „Default (8)“. |
| Use Case | `../../src/features/user-settings/use-cases/` | `use-show-user-settings.ts`: `valueText` für `null` → „Default (<Default mit Einheit>)“. Neu: `use-reset-user-setting.ts` (Zurücksetzen ab einem Tag); `use-change-user-setting.ts` akzeptiert `null`. |
| Komponenten | `../../src/features/user-settings/components/` | Button und Dialog „Auf Default zurücksetzen“; im Dialog zum Ändern eines geplanten Werts eine Auswahl „Zahl“ oder „Default“ |

Die Rechnungen (`../../shared/target-hours.ts`, `../../shared/vacation-rules.ts`, Überstunden) laufen über
`valueOn` und bleiben unverändert.

Geändert wird nach dem Skill `architecture` (`../../.claude/skills/architecture`), zuerst
`../../.claude/skills/architecture/use-case.md` lesen. Neue Dateien nach den Skills `ui-modules`,
`shared-modules` und `backend-modules`.

## Fertig, wenn

- **Service-Tests** in `../../shared/user-setting-rules.test.ts`:
  - `valueOn` liefert ab einem „Default“ den Default, davor den eigenen Wert, danach wieder einen späteren
    eigenen Wert.
  - Ein geänderter Default wirkt ab „Default“ sofort.
  - „Default“ ohne eigenen Wert davor, mit „gültig ab“ heute oder in der Vergangenheit und bei Urlaubstagen
    nicht am 1. Januar wird abgelehnt.
  - Zwei „Default“ hintereinander werden abgelehnt.
- **Komponenten-Test** in `../../src/features/user-settings/components/user-settings.test.tsx`: Zurücksetzen ab
  morgen zeigt die Zeile „Default (8 Stunden)“ mit Status „geplant“; ohne eigenen Wert ist der Button gesperrt.
- **MCP-Test:** `set_user_setting` mit `value: null` legt „Default“ an, `list_user_settings` zeigt ihn.
- `../use-case/user-settings.md` beschreibt den Wert „Default“: Regel 1 (ein „Default“ gilt wie kein eigener
  Wert), Regel 6, die Tabelle `user_setting_values` (`value` nullable), die MCP-Tools und neue
  Akzeptanzkriterien.
- Typprüfung, Lint und `npx vitest run` laufen durch.
