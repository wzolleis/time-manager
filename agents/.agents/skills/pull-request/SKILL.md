---
name: pull-request
description: Erstellt aus dem Arbeitsstand einen Branch, committet, pusht, öffnet einen Pull Request gegen main und merged ihn. Bei Code-Änderungen erst nach grünen Netlify-Checks, bei reiner Dokumentation sofort. Verwenden, wenn der User „PR“, „Pull Request“ oder „commit, PR und merge“ sagt.
---

# Pull Request erstellen und mergen

1. Den Arbeitsstand ansehen mit `git status --short` und `git log --oneline -5`.
2. Steht man auf `main`, zuerst einen Branch anlegen: `git checkout -b <type>/<thema>`, z. B.
   `docs/overtime-use-case` oder `feat/version-menu`. Der `type` ist derselbe wie in der Commit-Nachricht.
3. Committen nach dem Skill `commit` (`../commit/SKILL.md`), also mit Prüfungen, Format und den Regeln,
   was nie ins Git kommt.
4. Pushen: `git push -u origin <branch>`.
5. Den PR öffnen mit `gh pr create --base main`:
   - **Titel:** wie die Commit-Nachricht, `<type>(<scope>): <Beschreibung>` auf Deutsch.
   - **Beschreibung:** Abschnitt `## Zusammenfassung` mit einer kurzen Liste der Änderungen. Ändert der PR
     keinen Code, steht dort zusätzlich „Nur Dokumentation, kein Code.“
6. Mergen, abhängig davon, ob der PR Code ändert (siehe unten).
7. Danach lokal aufräumen: `git checkout main && git pull`, dann den Merge-Commit mit
   `git log --oneline -2` melden, zusammen mit dem Link zum PR.

## Wann auf die Netlify-Checks gewartet wird

Die Netlify-Checks (`deploy/netlify`, Header rules, Redirect rules, Pages changed) kommen von der
Netlify-GitHub-App. In der Branch Protection von `main` sind sie nicht Pflicht, deshalb prüft der Agent sie selbst.

- **Mit Code-Änderung** (alles außer reiner Dokumentation): warten, bis die Checks fertig sind, und nur
  mergen, wenn sie grün sind.
  ```sh
  gh pr checks <nr> --watch --interval 15
  gh pr merge <nr> --squash --delete-branch
  ```
  Schlägt ein Check fehl, nicht mergen, sondern dem User den Check und den Link melden.
- **Ohne Code-Änderung**, z. B. nur Markdown unter `features/` oder `agents/`: nicht warten, sofort mergen.
  ```sh
  gh pr merge <nr> --squash --delete-branch
  ```

## Merge

Immer als Squash-Merge (`--squash`), der Branch wird dabei gelöscht (`--delete-branch`). Der Commit auf
`main` heißt dann wie der PR mit der Nummer, z. B. `docs(overtime): Use Case Überstunden beschreiben (#4)`.
