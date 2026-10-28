---
name: overview
description: Erzeugt generated/overview.md, die Übersicht über alle Use Cases, Changes und Setups nach Status und nach Epic, neu aus dem Frontmatter der Beschreibungen in features/. Verwenden, wenn eine Beschreibung in features/ angelegt, gelöscht oder umbenannt wird, wenn sich ihr name, type, epics oder state ändert, oder wenn der User wissen möchte, woran als nächstes gearbeitet wird.
---

# Übersicht erzeugen

Die Übersicht hilft dem Entwickler zu entscheiden, woran als nächstes gearbeitet wird. Sie liegt in
`generated/overview.md` im Root des Projekts. Der Ordner `generated/` steht in `.gitignore`: Die Datei kommt nicht
ins Git, denn sie lässt sich jederzeit neu erzeugen.

Am Anfang der Datei steht ein Header mit dem Zeitpunkt, an dem sie erzeugt wurde, und dem Hinweis, dass sie nicht
von Hand bearbeitet wird. Danach zeigt sie alle Beschreibungen in `features/` in zwei Tabellen:

- **Nach Status:** Name, Status, Typ. Zuerst die offenen, dann die zurückgestellten (`later`), danach die
  erledigten, jeweils nach Name sortiert.
- **Nach Epic:** Epic, Name, Typ, Status. Nach Epic sortiert, innerhalb eines Epics die offenen zuerst, dann nach
  Name. Das Epic steht nur in der ersten Zeile seiner Gruppe, in den folgenden Zeilen bleibt die Zelle leer. So
  wirkt die Spalte wie zusammengefasst, denn Markdown kann keine Zellen verbinden. Eine Beschreibung mit mehreren
  Epics steht bei jedem ihrer Epics, eine ohne Epic unter „(ohne Epic)“.

## Ablauf

1. Die Übersicht neu erzeugen:
   ```sh
   npm run features:overview
   ```
   `generated/overview.md` wird nie von Hand bearbeitet. Soll die Übersicht anders aussehen, wird
   `scripts/features-overview.ts` geändert.
2. Bricht das Skript ab, weil in einer Beschreibung `name` oder `state` fehlt, das Frontmatter dieser
   Beschreibung ergänzen und das Skript erneut ausführen. Die Felder sind im Skill `architecture` unter
   [use-case.md](../architecture/use-case.md) beschrieben.
3. Die Übersicht nicht committen. Steht der Zeitpunkt im Header weit zurück, ist sie vermutlich veraltet und wird
   vor dem Lesen neu erzeugt.
4. Fragt der User, woran als nächstes gearbeitet wird, die offenen Einträge aus der Tabelle „Nach Status“
   nennen. Vorher die Übersicht neu erzeugen.
