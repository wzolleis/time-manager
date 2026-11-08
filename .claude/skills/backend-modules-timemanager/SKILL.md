---
name: backend-modules-timemanager
description: Die Verzeichnisse des Backends im time-manager (netlify/functions, netlify/functions/lib, lib/mcp-tools, db, scripts), die Konventionen einer Netlify Function und die Hilfen in lib/. Ergänzt den Skill backend-modules. Verwenden beim Anlegen oder Verschieben von Backend-Dateien, beim Anlegen eines Endpoints oder MCP-Tools und vor jedem Commit mit neuen Backend-Dateien im time-manager.
---

# Backend-Module im time-manager

Lade zuerst den Skill `backend-modules`. Hier steht nur, was im time-manager zusätzlich gilt.

Das Backend sind die Netlify Functions unter `netlify/functions/`. Netlify Edge Functions werden nicht verwendet.
Es gibt kein `netlify/edge-functions/`.

## Wohin gehört eine Datei?

| Baustein        | Ort                                                                   |
|-----------------|-----------------------------------------------------------------------|
| Endpoint        | `netlify/functions/<aggregat>.ts`                                     |
| Hilfen          | `netlify/functions/lib/` (HTTP, Session, Rollen, IDs, DB-Verbindung)  |
| Store           | `netlify/functions/lib/<aggregat>-store.ts`, z. B. `time-entries-store.ts` |
| MCP-Tools       | `netlify/functions/lib/mcp-tools/`, auch die Formatierung ihrer Antwort |
| Datenbankschema | `db/schema.ts` (Drizzle)                                              |
| Migration       | `db/migrations/`, nur mit `npm run db:generate`, nie von Hand          |
| Skript          | `scripts/`, gemeinsame Hilfen in `scripts/lib/`                       |

Die Datenbankverbindung steht in `netlify/functions/lib/db.ts`. Nichts in `shared/` importiert sie.

## Konventionen einer Function

- Die Pfade stehen in `export const config: Config = {path: …}`.
- Export: `export default withTiming("<name>", withSession(handler))`. Ohne Session läuft nur `auth`, der
  MCP-Server meldet sich mit `withToken` an.
- Body mit `readBody(req)`, Fehler im `catch` mit `errorResponse(err)`, beide aus `lib/http.ts`.
  Datenbank-Fehler mit eigener Meldung (z. B. `ER_DUP_ENTRY`) prüft die Function vorher selbst.
- Fehlerklassen aus `lib/errors.ts` (`NotFoundError`, `UnknownUserError`), `RuleError` aus `lib/rule-error.ts`.
- Die Transaktion sperrt den User mit `lockUser(tx, userId)` aus `lib/lock-user.ts`.
- „Nicht gefunden“ ist 410, nicht 404. Die Begründung steht bei `notFound` in `lib/id.ts`.
