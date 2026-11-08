# time-manager

Zeiterfassung für mehrere Anwender: Stempeln, Buchungen, Urlaub, Krankmeldungen, Feiertage, Überstunden und
Berichte (Tag, Woche, Monat, Jahr). Admin- und User-Bereich, dazu ein MCP-Server für Agents.

## Skills

Die allgemeinen Skills liegen im Repository common-skills (`~/IdeaProjects/common-skills`, verlinkt nach
`~/.claude/skills/`). Die Skills im Projekt ergänzen sie:

- Zu jedem Skill `<skill>` gibt es Ergänzungen im Skill `<skill>-timemanager`, z. B. `commit` und
  `commit-timemanager`. **Wird einer von beiden geladen, wird der andere auch geladen.**
- Gibt es keinen `-timemanager`-Skill (z. B. `shot`, `handoff`), gilt nur der allgemeine.
- Was allgemein gilt, steht nur in common-skills, im Projekt-Skill steht nur die Umsetzung im time-manager.
- Ein neuer Skill nur für dieses Projekt entsteht mit `npm run skill:new`.

## Stack

- **Frontend:** React, Vite, tanstack-router (file-basiert), tanstack-query mit Persistenz im localStorage,
  Tailwind und shadcn (`radix-ui`), Zod, Temporal (`temporal-polyfill`), Sonner für Toasts.
- **Backend:** Netlify Functions (keine Edge Functions), MariaDB über `mysql2` und Drizzle (`drizzle-orm`,
  `drizzle-zod`), bcrypt, WebAuthn mit `@simplewebauthn`, MCP-Server mit `@modelcontextprotocol/sdk`.
- **Tests:** vitest, Testing Library, `scripts/api-walkthrough.sh` gegen die Testdatenbank, `shot` für die Oberfläche.

## Verzeichnisse

| Verzeichnis          | Inhalt                                                        | Skill            |
|----------------------|---------------------------------------------------------------|------------------|
| `src/`               | UI                                                            | `ui-modules`     |
| `shared/`            | Schemas, Regeln und Berechnungen für Client und Server        | `shared-modules` |
| `netlify/functions/` | Endpoints unter `/api/…`, Hilfen in `lib/`, MCP-Tools in `lib/mcp-tools/` | `backend-modules` |
| `db/`                | Drizzle-Schema und Migrationen                                | `backend-modules` |
| `scripts/`           | Skripte für die Kommandozeile                                 | `backend-modules` |
| `features/`          | Beschreibungen: `use-case/`, `changes/`, `boundaries/`        | `architecture`   |

## Befehle

| Befehl                                   | Zweck                                                   |
|------------------------------------------|---------------------------------------------------------|
| `npx netlify dev`                        | App auf Port 8888 mit der lokalen Datenbank             |
| `npm run dev:test`                       | App auf Port 8889 mit der Testdatenbank                 |
| `npm run test:run`, `lint`, `tsc`, `format:check` | Prüfungen vor dem Commit                       |
| `npm run db:generate`, `db:migrate:local` | Migration erzeugen und lokal anwenden                  |
| `npm run feature:new`, `features:overview` | Beschreibung anlegen, Übersicht erzeugen              |

Die lokale Umgebung beschreibt `README.md` und `features/boundaries/local-environment.md`. Nie gegen die
Produktion arbeiten, außer der User verlangt es ausdrücklich.
