---
name: commit-timemanager
description: Wie im time-manager committet wird, die Prüfbefehle (npm run test:run, lint, tsc, format:check), der Pre-commit-Hook und die Scopes der Aggregate. Ergänzt den Skill commit. Verwenden, wenn der User im time-manager den Arbeitsstand committen möchte.
---

# Committen im time-manager

Lade zuerst den Skill `commit`. Hier steht nur, was im time-manager zusätzlich gilt.

## Prüfungen

```sh
npm run test:run
npm run lint
npm run tsc
npm run format:check
```

Meldet nur `format:check` Abweichungen, mit `npm run format` formatieren und die Prüfungen wiederholen.

## Pre-commit-Hook

`lint-staged` formatiert die gestagten Dateien mit Prettier und korrigiert sie mit `eslint --fix`. Die Meldung
„lint-staged could not find any staged files matching configured tasks“ bei reiner Dokumentation ist kein Fehler.

## Scopes

Die Aggregate des time-managers: `time-entries`, `vacations`, `sick-leaves`, `holidays`, `overtime`,
`user-settings`, `projects`, `users`, `roles`, `api-tokens`, `passkeys`, `backups`. Dazu Themen wie `reports`,
`navigation`, `ui`, `mcp`, `skills`, `auth`, `db`.

```text
feat(roles): Rollen per ID statt per Name verknüpfen
docs(overtime): Use Case Überstunden beschreiben
```
