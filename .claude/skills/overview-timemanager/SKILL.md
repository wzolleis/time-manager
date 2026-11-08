---
name: overview-timemanager
description: Das Skript, das im time-manager generated/overview.md erzeugt (npm run features:overview, scripts/features-overview.ts). Ergänzt den Skill overview. Verwenden, wenn im time-manager eine Beschreibung in features/ angelegt, gelöscht oder umbenannt wird oder sich name, type, epics oder state ändern.
---

# Übersicht im time-manager

Lade zuerst den Skill `overview`. Hier steht nur, was im time-manager zusätzlich gilt.

- Erzeugen: `npm run features:overview`. Das Skript ist `scripts/features-overview.ts`.
- Eine neue Beschreibung legt `npm run feature:new` an (`scripts/new-feature.ts`). Das Skript fragt Typ, Name, die
  geänderten Use Cases (nur bei einem Change), Epics und Beschreibung ab, prüft sie gegen die vorhandenen
  Beschreibungen und legt die Datei im passenden Ordner mit `state: open` und den üblichen Abschnitten an.
