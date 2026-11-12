---
name: user-settings-tables
description: Die Einstellungsseite zeigt die Einstellungen ohne Historie in einer gemeinsamen Tabelle „Allgemein“ und jede Einstellung mit Historie in einer eigenen Tabelle mit Name und Beschreibung als Überschrift. Nur die Ansicht ändert sich, die Daten bleiben.
type: change
changes: user-settings
epics: einstellungen
state: resolved
---

# Einstellungen in getrennten Tabellen

„Der User findet sich auf der Einstellungsseite schnell zurecht.“

Heute zeigt `/user/settings` eine einzige Tabelle mit den Spalten Name, Wert, gültig ab, Status und
Beschreibung. Darin stehen die Werte von Soll und Urlaubstage mit ihrer Historie und die eine Zeile von
`Action Bar`. Bei einer Einstellung ohne Historie sagen „gültig ab“ und Status nichts aus, bei einer
mit Historie wiederholen sich Name und Beschreibung in jeder Zeile. Mit jeder neuen Einstellung wird das
unübersichtlicher.

Beschreibung der Einstellungen: `../use-case/user-settings.md`.

## Verhalten

1. **Abschnitt „Allgemein“ oben:** eine Tabelle mit allen Einstellungen ohne Historie
   (`valid_from_unit = immediately`), eine Zeile je Einstellung. Spalten: Name, Wert, Beschreibung und die
   Aktionen. „gültig ab“ und Status entfallen. Gibt es keine solche Einstellung, entfällt der Abschnitt.
2. **Je Einstellung mit Historie ein eigener Abschnitt** darunter, nach Namen sortiert. Überschrift ist der
   Name, darunter die Beschreibung. Die Tabelle hat die Spalten Wert, gültig ab, Status und die Aktionen,
   je Wert eine Zeile wie bisher (Default zuerst, dann die eigenen Werte nach „gültig ab“).
3. **Seitenkopf:** „Einstellungen“ mit dem Namen des Users. Der Satz „Jeder Wert gilt ab einem Tag, ältere
   Werte gelten für die Vergangenheit weiter.“ steht nicht mehr im Seitenkopf, sondern unter der
   Beschreibung jeder Einstellung mit Historie, weil er nur für sie gilt.
4. Aktionen, Dialoge und Regeln bleiben unverändert.

## Daten

Keine Änderung an Datenbank, API und MCP.

## Umsetzung

| Art | Datei | Änderung |
|-----|-------|----------|
| Use Case | `../../src/features/user-settings/use-cases/use-show-user-settings.ts` | liefert die Zeilen gruppiert: `immediate` (eine Zeile je Einstellung ohne Historie) und `histories` (je Einstellung mit Historie die Einstellung und ihre Zeilen) |
| Komponenten | `../../src/features/user-settings/components/` | `user-settings-table.tsx` zeigt den Abschnitt „Allgemein“ und je Einstellung mit Historie einen Abschnitt, jeweils mit eigenen Spalten |

## Fertig, wenn

- **Komponenten-Test** in `../../src/features/user-settings/components/user-settings.test.tsx`: Die Seite zeigt
  die Abschnitte „Allgemein“, „Soll“ und „Urlaubstage“. `Action Bar` steht in „Allgemein“ ohne Status und
  ohne „gültig ab“, die Werte von Soll stehen in der Tabelle „Soll“, die Beschreibung von Soll erscheint einmal.
- `../use-case/user-settings.md` beschreibt die Ansicht mit den getrennten Tabellen.
- Typprüfung, Lint und `npx vitest run` laufen durch.
