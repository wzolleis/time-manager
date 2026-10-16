---
name: architektur
description: Wie wir die Software aufbauen. Datenmodelle, lesender und schreibender Datenzugriff, Caching. Die Anzeige der Daten und die Eingabe der Daten in der UI
---

# Architektur

Die Architektur beschreibt den Aufbau der Software und wie wir die Daten lesen und schreiben.
Ausserdem betrachten wir die Eingabe und Anzeige der Daten.
Der Einsatz der Frameworks für das Routing und Laden bzw. Caching der Daten wird beschrieben.

## Use cases first

Das Definieren der Use Cases ist der Kern der Anwendung und definiert wie alles andere zusammen arbeiten kann.
Analysiere genau in der Sprache der Domain, wer möchte was erledigen und definiere
die Komponenten entsprechend er Antwort auf diese Frage.
Wenn die Use Cases sauber definiert sind, ist alles andere nur noch mechanische Codierung durch das Befolgen der Regeln.

Each question about a use case has one component that answers it:

```text
Who wants to do what?                    → use case (Hook)                  useArchiveAbsence
In which states may it happen?           → narrowing find, input state      findActiveAbsenceById, ActiveAbsence
Who may do it?                           → actor flag, who-acts policy      mayEditOthersAbsences
What else must hold? (time, values)      → policy, value constructor        cannotArchiveWhileOngoingPolicy, createPeriod
What must we load to check it?           → required input field             assigneeIsOrganizationMember
What can go wrong?                       → typed domain error, HTTP status  AbsenceOngoingError, 409
What is true afterwards?                 → event and its fields             AbsenceArchivedEvent
Who sees the result?                     → view, visibility rule            AbsenceView, absenceVisibilityFromReader
```

### Rechte und Rollen

Es gibt den Administrationsbereich, die Aktionen dort dürfen nur von Usern in der Rolle "Administrator" durchgeführt
werden.
Es gibt den User-Bereich, die Aktionen dort dürfen von den Usern in der Rolle "User" durchgeführt werden.
Geprüft wird auf dem Server, Details im Skill `authorization`.

## Layout

```text
shared/                 Geteilt zwischen Client und Netlify Functions
├ <thema>.ts            Zod-Schemas und Typen eines Aggregats, z. B. vacation.ts
├ <thema>-rules.ts      Services: Regeln und Berechnungen (siehe service.md)
└ <thema>-report.ts     Services: Auswertungen für Berichte

src/
├ api/                  Ein File pro Aggregat, ohne React: fetch… für die View, create/update/delete… für das
│                       Repository (siehe views.md, repository.md). http.ts enthält request und ApiError.
├ views/                Ein File pro Aggregat mit den lesenden Hooks, z. B. useVacations (siehe views.md)
├ features/             Fachliche Bereiche, siehe unten
├ routes/               Routen für das file-basierte Routing von tanstack-router. Eine Route bindet
│                       nur die Seite aus features/…/pages ein. routeTree.gen.ts wird erzeugt, nicht bearbeiten.
├ application/          Layout, Navigationsmenü und Breadcrumb
├ components/           Fachlich neutrale Komponenten; ui/ enthält die shadcn-Komponenten
├ lib/                  Hilfsfunktionen für Frameworks und Bibliotheken (format, use-now, user-context)
├ tests/                Tests, die zu keiner einzelnen Komponente gehören. routes.test.tsx prüft, dass
│                       jede Route eine Ansicht hat und diese angezeigt werden kann.
└ query-client.ts       QueryClient, Persistenz im localStorage, globale Fehlerbehandlung (401)

src/features/
├ admin/<aggregat>/     Administrationsbereich, nur Rolle "Administrator"
├ user/<aggregat>/      User-Bereich, Rolle "User"
├ holidays/             von Admin- und User-Bereich gemeinsam verwendet
├ auth/                 Anmeldung und Passwort
└ dashboard/            Startseite

src/features/user/vacations/          Aufbau eines Aggregats, jeder Ordner nur bei Bedarf
├ use-cases/            Ein Hook pro Use Case (siehe use-case.md)
├ components/           Komponenten für die Ansichten des Aggregats, Tests daneben (*.test.tsx)
├ pages/                Seiten, die eine Route aus src/routes einbindet
└ actions/              Actions, die auf dem Dashboard erscheinen

netlify/functions/      Ein File pro Aggregat mit den Endpoints unter /api/<aggregat>
└ lib/                  Session, Rollen, DB-Verbindung, RuleError
db/
├ schema.ts             Drizzle-Schema aller Tabellen
└ migrations/           Erzeugt mit drizzle-kit generate, angewendet mit npm run db:migrate
scripts/                Skripte für die Kommandozeile, z. B. grant-admin.ts, api-walkthrough.sh
```

Import-Aliase (`tsconfig.app.json`): `@/` → `src/`, `@shared/` → `shared/`, `@features/` → `src/features/`,
`@user/` → `src/features/user/`.

## References

- [use-case.md](use-case.md): Was ein Use Case ist, wo er liegt und wie er die anderen Bausteine verwendet. Zuerst
  lesen.
- [views.md](views.md): Daten lesen, ein Hook pro Aggregat in `src/views/`
- [repository.md](repository.md): Daten schreiben, API-Funktionen in `src/api/` und `useMutation`, Query Keys invalidieren
- [service.md](service.md): Werte berechnen und Regeln prüfen, als reine Funktionen in `shared/`
- [testing.md](testing.md): Wann sich ein Test lohnt, auf welcher Ebene er liegt und wie er geschrieben wird


