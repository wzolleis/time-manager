---
name: commit
description: Committet alle gestagten, nicht gestagten und neuen Änderungen als einen oder mehrere zusammenhängende Conventional Commits mit deutscher Beschreibung. Prüft vorher Tests, Lint und Typen. Verwenden, wenn der User den Arbeitsstand committen möchte.
---

# Änderungen committen

1. Den gesamten Arbeitsstand ansehen mit `git status --short`, `git diff HEAD` und `git log --oneline -5`.
   Neue, noch nicht versionierte Dateien ebenfalls lesen.
2. Prüfen, bevor etwas committet wird:
   ```sh
   npm run test:run
   npm run lint
   npm run tsc
   npm run format:check
   ```
   Schlägt einer der Befehle fehl, wird nicht committet. Die Fehler dem User melden. Meldet nur
   `format:check` Abweichungen, mit `npm run format` formatieren und die Prüfungen wiederholen.
3. Die Änderungen nach ihrem Zweck gruppieren. Bilden sie eine einzige Änderung, gibt es einen Commit;
   voneinander unabhängige Arbeiten kommen in getrennte Commits.
4. Jede offene Änderung committen, auch Arbeit, die nichts mit dem aktuellen Gespräch zu tun hat.
   Änderungen niemals verwerfen oder umschreiben, damit sie in einen Commit passen.
5. Jede Gruppe mit konkreten Pfaden stagen und dann committen. Der Pre-commit-Hook (`lint-staged`)
   formatiert die gestagten Dateien mit Prettier und korrigiert sie mit `eslint --fix`. Schlägt er
   fehl, ist nichts committet: die Meldung lesen, den Fehler beheben und erneut committen. Den Hook
   nicht mit `--no-verify` umgehen.
6. Danach `git status --short` ausführen und die erstellten Commits melden.

## Was nie ins Git kommt

- Dateien, die in `.gitignore` stehen. Sie werden nicht gestagt, auch nicht mit `git add -f`.
- `.env` und alle Varianten mit weiteren Endungen, z. B. `.env.local` oder `.env.test`.
- Andere sensible Daten: Passwörter, Tokens, API-Schlüssel, Zugangsdaten zur Datenbank.

Taucht eine solche Datei in `git status` auf, wird sie nicht committet. Stattdessen den User darauf
hinweisen, damit sie in `.gitignore` aufgenommen wird.

## Format der Nachricht

`<type>(<scope>): <Beschreibung>`

- **type:** `feat`, `fix`, `refactor`, `test`, `docs`, `style`, `chore` oder `perf`
- **scope:** das Aggregat (`vacations`, `time-entries`, `projects`, `holidays`, `users`, `roles` …)
  oder das Thema der Änderung, z. B. `skills`, `auth`, `db`
- **Beschreibung:** auf Deutsch, nach den Regeln der deutschen Rechtschreibung (Substantive groß),
  im Imperativ, kürzer als 50 Zeichen, ohne Punkt am Ende

Beispiele:

```text
feat(roles): Rollen per ID statt per Name verknüpfen
fix(auth): Cookie nur über HTTPS als Secure setzen
docs(skills): Architektur-Skill überarbeiten
```

Kein `git add -A`, keine Emojis und keine Co-Author-Zeilen.
