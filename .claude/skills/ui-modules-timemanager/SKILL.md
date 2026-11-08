---
name: ui-modules-timemanager
description: Die konkreten Unterordner und Beispiele der UI unter src/ im time-manager (components/, lib/, features/). Ergänzt den Skill ui-modules. Verwenden beim Umsetzen eines Features oder Changes im time-manager, beim Anlegen oder Verschieben von Dateien unter src/ und vor jedem Commit.
---

# UI-Module im time-manager

Lade zuerst den Skill `ui-modules`. Hier steht nur, was im time-manager zusätzlich gilt.

- **Backend:** Für `netlify/`, `db/` und `scripts/` gilt der Skill `backend-modules`.
- **`components/`**: genau die Unterordner `buttons`, `cards`, `dashboard-action`, `form`, `login`, `page`,
  `table`, `text`, `ui`, `utils`.
- **`lib/`**: z. B. `use-now`, `use-time-format`, `user-context`, `utils` mit `cn`, `notify`. Texte für Zeiten und
  Dauern stehen in `shared/format.ts`, weil auch der MCP-Server sie zeigt. Die CSS-Klasse für eine Differenz
  steht in `src/lib/format.ts`, weil nur die UI sie braucht.
- **Features:** `api-tokens`, `auth`, `backups`, `dashboard`, `holidays`, `passkeys`, `projects`, `reports`,
  `settings`, `sick-leaves`, `user-settings`, `users`, `vacations`, `version`.
