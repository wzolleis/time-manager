---
name: backend-modules
description: Beschreibt die Verzeichnisse des Backends (netlify/functions, netlify/functions/lib, 
  lib/mcp-tools, shared, db, scripts), was wohin gehört und wer wen importieren darf. 
  Verwenden beim Anlegen oder Verschieben von Dateien in diesen Verzeichnissen, 
  beim Anlegen eines neuen Endpoints oder MCP-Tools und vor jedem Commit mit neuen Backend-Dateien.
---

# Aufbau der Module im Backend

Das Backend sind die Netlify Functions unter `netlify/functions/`. Sie laufen nur auf dem Server.
Dazu gehören die Datenbank (`db/`) und die Skripte (`scripts/`). `shared/` läuft auf Server und Client:
dort stehen die Schemas und Regeln, die beide Seiten verwenden.

Netlify Edge Functions werden nicht verwendet. Es gibt kein `netlify/edge-functions/`.

Für die UI unter `src/` gilt der Skill `ui-modules`. Wie Services und Repositories aufgebaut sind, beschreibt
der Skill `architecture`.

# Wohin gehört eine Datei?

| Die Datei …                                                       | gehört nach                                      |
|-------------------------------------------------------------------|--------------------------------------------------|
| nimmt die Requests eines Aggregats an (`/api/<aggregat>`)         | `netlify/functions/<aggregat>.ts`                |
| ist eine Hilfe für mehrere Functions (HTTP, Session, Rollen, IDs) | `netlify/functions/lib/`                         |
| liest und schreibt ein Aggregat für REST und MCP gemeinsam        | `netlify/functions/lib/<aggregat>-store.ts`      |
| ist ein Tool des MCP-Servers oder formatiert dessen Antwort       | `netlify/functions/lib/mcp-tools/`               |
| ist ein Zod-Schema oder Typ eines Aggregats                       | `shared/<aggregat>.ts`                           |
| ist eine Regel oder Berechnung für Client und Server              | `shared/<thema>-rules.ts` bzw. `shared/<thema>.ts` |
| beschreibt Tabellen                                               | `db/schema.ts`                                   |
| ist eine Migration                                                | `db/migrations/`, nur mit `npm run db:generate`, nie von Hand |
| wird per Hand oder über `npm run` gestartet (Seed, Migration, Admin, Passwort, Prüfungen) | `scripts/`, gemeinsame Hilfen in `scripts/lib/` |
| ist ein Test                                                      | neben der getesteten Datei als `<name>.test.ts`  |

# Wer darf wen importieren?

- `netlify/functions/*.ts` → `lib/`, `@shared/`, `db/schema`. Eine Function importiert keine andere Function.
- `netlify/functions/lib/` → `@shared/`, `db/`, nie eine Function.
- `shared/` → `shared/`, Bibliotheken und `db/schema` (die Schemas entstehen mit `drizzle-zod` aus den
  Tabellen). Nie `netlify/`, `src/` oder die Verbindung in `netlify/functions/lib/db.ts`.
- `db/schema.ts` → nur Typen aus `shared/`.
- Nichts im Backend importiert aus `src/`.

# Konventionen einer Function

- Eine Datei pro Aggregat, die Pfade in `export const config: Config = {path: …}`.
- Export: `export default withTiming("<name>", withSession(handler))`. Ohne Session läuft nur `auth`
  (dort findet die Anmeldung statt), der MCP-Server meldet sich mit `withToken` an.
- Body mit `readBody(req)`, Fehler im `catch` mit `errorResponse(err)`, beide aus `lib/http.ts`.
  Datenbank-Fehler mit eigener Meldung (z. B. `ER_DUP_ENTRY`) prüft die Function vorher selbst.
- Fehlerklassen aus `lib/errors.ts` (`NotFoundError`, `UnknownUserError`), `RuleError` aus `lib/rule-error.ts`.
- Änderungen an den Daten eines Users laufen in einer Transaktion mit `lockUser(tx, userId)` aus
  `lib/lock-user.ts`.
- „Nicht gefunden“ ist 410, nicht 404. Die Begründung steht bei `notFound` in `lib/id.ts`.
- Die Regeln aus `shared/` prüft der Server noch einmal, siehe `architecture/service.md`.

# Prüfung vor dem Commit

Neue und verschobene Backend-Dateien gegen die Tabelle und die Import-Regeln prüfen. Bei einem Verstoß wird
nicht committet. Stattdessen dem User die Datei, die verletzte Regel und den richtigen Ort nennen.
