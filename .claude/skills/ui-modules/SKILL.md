---
name: ui-modules
description: Beschreibt die Verzeichnisse der UI unter src/ und was wohin gehört. Verwenden beim Anlegen oder Verschieben von Dateien unter src/ und vor jedem Commit, um zu prüfen, ob neue Dateien am richtigen Ort liegen.
---

# Aufbau der Module in der UI

Der Skill gilt nur für `src/`, nicht für die Verzeichnisse `features/`, `shared/` oder `netlify/` im Projekt-Root.
Pfad-Aliase: `@/*` → `src/*`, `@features/*` → `src/features/*`, `@shared/*` → `shared/*`.

# Wohin gehört eine Datei?

| Die Datei …                                                   | gehört nach                         |
|---------------------------------------------------------------|-------------------------------------|
| setzt einen HTTP-Request an das Backend ab                    | `api/`                              |
| ist eine Query (lesender Zugriff mit tanstack-query)          | `views/`                            |
| ist ein Hook für einen Use Case (schreibender Zugriff)        | `features/<feature>/use-cases/`     |
| ist eine Komponente, die nur ein Feature verwendet            | `features/<feature>/components/`    |
| ist eine Komponente, die mehrere Features verwenden           | `components/<art>/`                 |
| passt ein shadcn-Element an                                   | `components/<art>/`, nie `components/ui/` |
| ist eine Dashboard-Aktion eines Features                      | `features/<feature>/actions/`       |
| gehört zum Rahmen (Layout, Breadcrumb, Navigation, Not-Found) | `application/<bereich>/`            |
| ist eine fachunabhängige Hilfsfunktion oder ein Hook          | `lib/`                              |
| ist nur ein Typ, der überall gebraucht wird                   | `common/`                           |
| legt eine URL fest                                            | `routes/admin/` oder `routes/user/` |
| ist ein Test                                                  | neben der getesteten Datei          |

# Regeln je Verzeichnis

- **`src/`** direkt: nur `main.tsx`, `query-client.ts`, `index.css`, `vite-env.d.ts` und `routeTree.gen.ts`.
  `routeTree.gen.ts` wird von tanstack-router generiert und **nie von Hand geändert**.
- **`api/`**: eine Datei pro Aggregat. Keine Hooks, kein Caching.
- **`views/`**: eine Datei pro Aggregat. Nur lesende Zugriffe, ruft `api/` auf.
- **`application/`**: nur die Unterordner `breadcrumb`, `layout` (inkl. `not-found.tsx`) und `navigation`.
  In `navigation` liegen nur Definitionen der Navigations-Items, keine Komponenten.
- **`common/`**: nur Typen, kein ausführbarer Code.
- **`lib/`**: kennt keine fachlichen Features.
- **`components/`**: nur die Unterordner `buttons`, `cards`, `dashboard-action`, `form`, `login`, `page`, `table`, `text`, `ui`, `utils`.
  Keine Dateien direkt in `components/`.
- **`components/ui/`**: shadcn-Elemente, **nie von Hand ändern**, nur über shadcn. Anpassungen kommen in eine eigene
  Komponente in einem anderen Unterordner von `components/`.
- **`features/<feature>/`**: nur die Unterordner `components`, `use-cases` und `actions`. Kein `pages/`.
  - Die Einstiegskomponente für die Route heißt `<name>-page.tsx` und liegt in `components/`.
  - In `use-cases/` eine Datei pro Use Case, benannt `use-<use-case>.ts`.
  - Direkt im Feature-Verzeichnis liegt nur, was sich nicht eindeutig in einen Unterordner einsortieren lässt.
- **`routes/`**: die Verzeichnisstruktur legt die URLs fest (`admin/`, `user/`). Jede Datei legt mit
  `createFileRoute` eine Route an und zeigt die Einstiegskomponente eines Features. Keine Logik, keine eigenen
  Komponenten.
- **`tests/`**: nur Tests für die Routen. Alle anderen Tests liegen neben der getesteten Datei als
  `<name>.test.ts(x)`.

# Wer darf wen importieren?

- `routes` → `features`, `application`, `components`
- `application` → `features`, `components`, `lib`, `views`, `common`
- `features` → `components`, `lib`, `views`, `api`, `common`, `@shared`. Features importieren nicht aus anderen
  Features.
- `components`, `lib`, `views`, `api`, `common` importieren nie aus `features`, `application` oder `routes`.

# Prüfung vor dem Commit

Vor jedem Commit werden alle neuen und verschobenen Dateien unter `src/` gegen diesen Skill geprüft: Liegt die
Datei im richtigen Verzeichnis, heißt sie richtig und hält sie die Import-Regeln ein?

Gibt es einen Verstoß, wird nicht committet. Stattdessen dem User jeden Verstoß melden (Datei, Regel, Vorschlag für
den richtigen Ort) und nachfragen. Nur wenn der User ausdrücklich bestätigt, dass der Verstoß in Ordnung ist, darf
committet werden.
