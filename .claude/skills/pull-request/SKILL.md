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
7. Danach aufräumen (siehe „Branch löschen“ unten), dann den Merge-Commit mit
   `git log --oneline -2` melden, zusammen mit dem Link zum PR.

## Wann auf die Netlify-Checks gewartet wird

Die Netlify-Checks (`deploy/netlify`, Header rules, Redirect rules, Pages changed) kommen von der
Netlify-GitHub-App. In der Branch Protection von `main` sind sie nicht Pflicht, deshalb prüft der Agent sie selbst.

- **Mit Code-Änderung** (alles außer reiner Dokumentation): warten, bis die Checks fertig sind, und nur
  mergen, wenn sie grün sind.
  ```sh
  gh pr checks <nr> --watch --interval 15
  gh pr merge <nr> --squash
  ```
  Schlägt ein Check fehl, nicht mergen, sondern dem User den Check und den Link melden.
- **Ohne Code-Änderung**, z. B. nur Markdown unter `features/` oder `.claude/skills/`: nicht warten, sofort mergen.
  ```sh
  gh pr merge <nr> --squash
  ```

## Merge

Immer als Squash-Merge (`--squash`). Der Commit auf `main` heißt dann wie der PR mit der Nummer, z. B.
`docs(overtime): Use Case Überstunden beschreiben (#4)`.

## Branch löschen

Den Remote-Branch löscht GitHub nach dem Merge selbst („Automatically delete head branches“ ist an). Deshalb
nicht `--delete-branch` verwenden. Das Aufräumen darf keinen Fehler erzeugen, wenn der Branch schon weg ist:

```sh
git checkout main && git pull
git push origin --delete <branch> 2>/dev/null || true
git fetch --prune
git branch -D <branch> 2>/dev/null || true
```

`git fetch --prune` steht nach dem Löschen, weil GitHub den Branch erst kurz nach dem Merge entfernt. Ein
früheres Prune würde den lokalen Verweis `origin/<branch>` sonst stehen lassen.
