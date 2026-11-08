---
name: common-skills
description: Kopiert alle Skills aus .claude/skills in das Repository common-skills, formuliert
  sie dort ohne Bezug auf den time-manager (Beispiel Todo-Liste) und lässt im time-manager
  unter <skill>-timemanager nur die projektspezifischen Ergänzungen stehen.
type: setup
epics: entwicklung
state: resolved
---

# Common Skills

Die Skills im time-manager lassen sich in mehreren Projekten verwenden. Dazu werden sie in das
Repository common-skills kopiert und dort allgemein formuliert. Was nur für den time-manager gilt,
bleibt im time-manager stehen und ergänzt den allgemeinen Skill.

Alle Skills werden in einem Durchgang übernommen, damit die Verweise zwischen den Skills auf
beiden Seiten zusammenpassen.

## Begriffe und Orte

- **common-skills**: das Repository `wzolleis/common-skills`, lokal unter `~/IdeaProjects/common-skills`.
  Wenn der Ordner dort nicht liegt, frag nach.
- **Allgemeiner Skill**: `common-skills/<skill>/SKILL.md`, Name `<skill>`, z. B. `commit`.
- **Projekt-Skill**: `time-manager/.claude/skills/<skill>-timemanager/SKILL.md`, Name
  `<skill>-timemanager`, z. B. `commit-timemanager`.
- `common-skills/link.sh` verlinkt jeden allgemeinen Skill nach `~/.claude/skills/<skill>`. Damit ist er
  in allen Projekten verfügbar.

Die Namen müssen sich unterscheiden. Bei gleichem Namen verdeckt der persönliche Skill unter
`~/.claude/skills/` den Skill aus dem Projekt, und die Ergänzungen des time-managers würden nicht
mehr geladen.

## Welche Skills

Alle Skills unter `.claude/skills/`: `architecture` (mit allen Dateien im Ordner), `authentication`,
`authorization`, `backend-modules`, `clean-code`, `commit`, `handoff`, `overview`, `performance`,
`pull-request`, `shared-modules`, `shot`, `ui-modules`, `ui-styling`.

Kommt bis zur Umsetzung ein Skill dazu, wird er genauso übernommen.

## Regeln für den allgemeinen Skill

- **Kein Bezug auf den time-manager.** Keine Namen, Pfade, Tabellen, Features oder Beispiele aus dem
  time-manager. Als Beispiel dient eine Todo-Liste (siehe unten).
- **Unabhängig von Datenbank und Backend.** Konkrete Technik wie Netlify Functions oder MariaDB gehört
  in den Projekt-Skill. Wo eine Regel von der Technik abhängt, steht im allgemeinen Skill, was gilt,
  und dazu der Hinweis: „Die konkrete Umsetzung beschreibt der Projekt-Skill.“
- **Allgemeine Konzepte allgemein formulieren**, z. B. bei `authentication` und `authorization`. Wenn
  etwas in unseren Anwendungen meist gleich umgesetzt wird, darf der allgemeine Skill es als Standard
  beschreiben. Das ist ein Vorteil, kein Bezug auf den time-manager.
- **Verweise per Skill-Name**, z. B. „Details im Skill `authorization`“. Keine relativen Pfade auf andere
  Skills, denn die liegen im Projekt nicht mehr daneben. Pfade auf Dateien im eigenen Skill-Ordner,
  z. B. `use-case.md` in `architecture`, bleiben erlaubt.
- **Neutrale `description` im Frontmatter.** Nach ihr entscheidet Claude, wann der Skill geladen wird.
- **Kein Wissen über Projekt-Skills.** Der allgemeine Skill nennt keine `-timemanager`-Skills. Dass es
  Ergänzungen gibt, steht in der `CLAUDE.md` des Projekts.

## Regeln für den Projekt-Skill

- Der Ordner wird von `<skill>` nach `<skill>-timemanager` umbenannt, auch das `name` im Frontmatter.
- Er beginnt mit: „Lade zuerst den Skill `<skill>`. Hier steht nur, was im time-manager zusätzlich gilt.“
- **Jede Regel steht an genau einer Stelle.** Was im allgemeinen Skill steht, wird gelöscht und nicht
  wiederholt. Übrig bleiben die konkrete Umsetzung (Technik, Pfade, Befehle) und Beispiele aus dem
  time-manager.
- Die `description` grenzt sich vom allgemeinen Skill ab, z. B. „Wie der time-manager … umsetzt
  (Netlify Functions, MariaDB). Ergänzt den Skill `<skill>`.“
- Bleibt nichts Projektspezifisches übrig, entfällt der Projekt-Skill. Dann gilt nur der allgemeine.
- Verweise im time-manager auf den alten Namen werden angepasst: in anderen Skills und unter `features/`
  (viele Use Cases nennen Skills, z. B. `features/use-case/holiday.md`).

## CLAUDE.md im time-manager

`CLAUDE.md` liegt im Wurzelverzeichnis des time-managers und wird in jeder Session geladen. Sie
verbindet die allgemeinen Skills mit den Projekt-Skills und beschreibt den Stack an einer Stelle.

- **Inhalt:**
  - Zu jedem Skill `<skill>` gibt es Ergänzungen im Skill `<skill>-timemanager`. Wird einer von beiden
    geladen, wird der andere auch geladen.
  - Der Stack des time-managers: Netlify Functions, MariaDB und die Hauptverzeichnisse (`src/`,
    `shared/`, `netlify/`, `db/`, `scripts/`, `features/`). Dazu die wichtigsten `npm`-Befehle.
  - Kurz, was der time-manager ist.
- **Kurz halten**, höchstens etwa 50 Zeilen. Regeln und Abläufe stehen in den Skills, `CLAUDE.md`
  verweist nur auf sie.
- Was zum Stack in der `CLAUDE.md` steht, wird in den Projekt-Skills nicht wiederholt.

## Beispiel Todo-Liste

Die Todo-Liste ist eine typische CRUD-Anwendung. Todo-Einträge werden angelegt, bearbeitet und
gelöscht, und für die Anzeige werden sie gelesen. Beim Kopieren werden Beispiele und Verweise auf
den time-manager durch ein ausgedachtes Feature dieser Todo-Liste ersetzt.

Damit alle Skills dieselben Beispiele verwenden:
- Entität `todo` mit `id`, `title`, `done`, `dueDate`, gehört einem Benutzer.
- Feature `todos` mit den Use Cases „Todo anlegen“, „Todo bearbeiten“, „Todo erledigen“,
  „Todo löschen“ und der Ansicht „Todo-Liste“.
- Rollen für `authorization`: `user` (eigene Todos) und `admin` (Benutzer verwalten).

Passt kein Beispiel aus der Todo-Liste, mach einen Vorschlag und frag nach.

## Umsetzung

1. Alle Skills nach `~/IdeaProjects/common-skills/<skill>/` kopieren, ohne sie im time-manager zu löschen.
2. Die allgemeinen Skills nach den Regeln oben überarbeiten.
3. Im time-manager die Skills nach `<skill>-timemanager` umbenennen und auf die Ergänzungen kürzen.
   Verweise auf die alten Namen anpassen.
4. `CLAUDE.md` im time-manager anlegen.
5. In common-skills `./link.sh` ausführen und prüfen, dass unter `~/.claude/skills/` für jeden Skill ein Link liegt.
6. common-skills committen und pushen. Dort gibt es keine Tests und keinen Lint, deshalb nicht mit
   dem Skill `commit`, sondern direkt als Conventional Commit mit deutscher Beschreibung.
7. Die Änderungen im time-manager mit dem Skill `commit` committen.

## Fertig, wenn

Pro Skill:
- [x] Der Skill liegt in common-skills und ist nach `~/.claude/skills/` verlinkt.
- [x] Der allgemeine Skill verweist auf andere Skills nur per Name.
- [x] Der Projekt-Skill heißt `<skill>-timemanager`, verweist auf `<skill>` und enthält nur Ergänzungen,
      oder er entfällt, weil es keine gibt.

Für das Feature:
- [x] Alle Skills aus „Welche Skills“ sind übernommen.
- [x] `grep -riE 'time-?manager|zeiteintr|stempel|überstunden|netlify|mariadb' ~/IdeaProjects/common-skills --exclude-dir=.git`
      findet nichts.
- [x] Im time-manager verweist nichts mehr auf die alten Skill-Namen ohne `-timemanager`, außer auf
      die allgemeinen Skills.
- [x] `CLAUDE.md` im time-manager verbindet `<skill>` und `<skill>-timemanager` und beschreibt den Stack.
- [x] common-skills ist gepusht, der time-manager committet.
- [x] Das Feature steht auf `resolved`.
