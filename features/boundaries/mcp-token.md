---
name: mcp-token
description: Beschreibt die API-Tokens, mit denen sich ein Agent am MCP-Server (/api/mcp) als User ausweist. Der User erzeugt, sieht und widerruft seine Tokens auf der Seite „Agent-Zugang“ und wählt beim Erzeugen die Gültigkeit, ein Administrator sieht und widerruft die Tokens aller User auf der Seite „Agent-Zugänge“. Enthält Tabelle, Endpoints, UI, Prüfung mit withToken und die Schritte der Umsetzung.
type: story
epics: mcp, berechtigungen
---

# Agent-Tokens

„Der User erlaubt einem Agent, in seinem Namen zu arbeiten.“

Ein Agent kann sich nicht mit E-Mail und Passwort anmelden und hält kein Session-Cookie. Er weist sich
deshalb mit einem persönlichen API-Token aus, das er bei jedem Aufruf von `/api/mcp` als
`Authorization: Bearer …` mitschickt. Der User erzeugt das Token in der UI und kann es jederzeit
widerrufen, ein Administrator kann die Tokens aller User widerrufen.

Der Use Case ist umgesetzt, `/api/mcp` nutzt die Tokens (`mcp-enable.md`). Diese Beschreibung hält
fest, wie sich die Tokens verhalten. Code:

- Seiten `../../src/features/api-tokens/components/` (`api-tokens-page.tsx`, `admin-api-tokens-page.tsx`)
- Use Cases `../../src/features/api-tokens/use-cases/`
- Services `../../shared/api-token-rules.ts`, Schema `../../shared/api-token.ts`
- Function `../../netlify/functions/api-tokens.ts`, Prüfung `withToken` in
  `../../netlify/functions/lib/api-token.ts`

Technische Grundlage: Skills `authentication` (Sessions) und `authorization` (`endpoint_roles`,
`ensureAccess`) in `../../agents/.agents/skills/`, Vorbild für die Prüfung ist `withSession` in
`../../netlify/functions/lib/session.ts`.

Umgesetzt wird nach dem Skill `architecture` (`../../agents/.agents/skills/architecture`), zuerst
`../../agents/.agents/skills/architecture/use-case.md` lesen.

## Use Cases

| Use Case                                             | Hook                   | Seite                |
|------------------------------------------------------|------------------------|----------------------|
| Der User sieht seine Agent-Tokens.                   | `useShowApiTokens`     | `ApiTokensPage`      |
| Der User erzeugt ein Agent-Token.                    | `useCreateApiToken`    | `ApiTokensPage`      |
| Der User widerruft ein Agent-Token.                  | `useRevokeApiToken`    | `ApiTokensPage`      |
| Der Administrator sieht die Agent-Tokens aller User. | `useShowAllApiTokens`  | `AdminApiTokensPage` |
| Der Administrator widerruft ein Agent-Token.         | `useRevokeAnyApiToken` | `AdminApiTokensPage` |

### Ablauf

1. Der User öffnet die Seite „Agent-Zugang“ und erzeugt ein Token mit einem Namen, z. B. „Claude Code
   Laptop“, und einer Gültigkeit (30 Tage, 90 Tage, 1 Jahr oder kein Ablauf). Das Token wird **einmal**
   angezeigt, zusammen mit dem Befehl für die Konfiguration des Agents:
   ```bash
   claude mcp add --transport http time-manager https://<host>/api/mcp \
     --header "Authorization: Bearer tm_…"
   ```
2. Der User sieht auf der Seite seine Tokens mit Name, Erstellung, letzter Nutzung und Ablauf und
   widerruft sie dort. Ein widerrufenes Token wird sofort abgelehnt.
3. Ein Administrator sieht auf der Seite „Agent-Zugänge“ im Administrationsbereich die Tokens aller User
   und widerruft sie, z. B. wenn ein Laptop verloren ging oder ein Mitarbeiter ausscheidet.

## Daten

Tabelle `api_tokens`, im Code `ApiToken`, aufgebaut wie `sessions`:

| Feld         | Typ                   | Inhalt                                                    |
|--------------|-----------------------|-----------------------------------------------------------|
| `id`         | UUID                  | zum Anzeigen und Widerrufen                               |
| `userId`     | UUID                  | der User, als der das Token handelt; `onDelete: cascade`  |
| `name`       | Text, 1–100 Zeichen   | vom User vergeben                                         |
| `tokenHash`  | `char(64)`, eindeutig | SHA-256 des Tokens; das Token selbst wird nie gespeichert |
| `createdAt`  | Zeitpunkt             |                                                           |
| `lastUsedAt` | Zeitpunkt, optional   | höchstens einmal pro Minute aktualisiert, wie die Session |
| `expiresAt`  | Zeitpunkt, optional   | vom User beim Erzeugen gewählt; `null` = kein Ablauf      |

Schema in `shared/api-token.ts`, Migration mit `npm run db:generate`.

## Regeln

1. **Aufbau:** Präfix `tm_` und 32 zufällige Bytes als base64url (`randomBytes`). Am Präfix erkennt man
   das Token, z. B. bei einer Suche nach versehentlich eingecheckten Geheimnissen.
2. **Nur einmal sichtbar:** Das Token steht nur in der Antwort auf das Erzeugen, danach nie wieder. Keine
   Antwort enthält den Hash.
3. **Gültigkeit:** Der User wählt beim Erzeugen 30 Tage, 90 Tage, 1 Jahr oder kein Ablauf, vorausgewählt
   sind 90 Tage. Gespeichert wird der Zeitpunkt `expiresAt`, bei „kein Ablauf“ `null`. Die Gültigkeit
   lässt sich danach nicht ändern, der User erzeugt dann ein neues Token.
4. **Widerrufen** löscht die Zeile. Es gibt keinen Status „widerrufen“, ein gelöschtes Token ist unbekannt.
5. **Nur für `/api/mcp`:** Die übrigen Endpoints akzeptieren weiterhin nur das Session-Cookie, und
   `/api/mcp` akzeptiert kein Session-Cookie.
6. **Prüfung mit `withToken`:** `/api/mcp` antwortet ohne Header, mit anderem Schema als `Bearer`, mit
   unbekanntem oder abgelaufenem Token mit `401` und `WWW-Authenticate: Bearer`. Danach läuft
   `hasEndpointAccess` wie bei `withSession`, damit ein User ohne Rolle „User“ keinen Zugriff hat.
   `/api/mcp` hat keinen Eintrag in `endpoint_roles`, gilt also für die Rolle „User“.
7. **Nur eigene Tokens:** Ein User sieht und widerruft nur seine eigenen Tokens. Ein Administrator sieht
   und widerruft alle, erzeugt aber keine Tokens für andere User.
8. **Passwort und Löschen:** Ändert der User sein Passwort oder setzt ein Administrator es zurück,
   bleiben die Tokens gültig. Wird der User gelöscht, verschwinden sie (cascade).

## Endpoints

Mit Session-Cookie, also aus der UI, wie jeder andere Endpoint mit `withSession`. Alle in einer Function
`netlify/functions/api-tokens.ts`.

| Endpoint                           | Rolle         | Zweck                                                                    |
|------------------------------------|---------------|--------------------------------------------------------------------------|
| `GET /api/api-tokens`              | User          | eigene Tokens: `id`, `name`, `createdAt`, `lastUsedAt`, `expiresAt`      |
| `POST /api/api-tokens`             | User          | `{name, expiresInDays: 30 \| 90 \| 365 \| null}` → `201` mit den Feldern oben und einmalig `token` |
| `DELETE /api/api-tokens/:id`       | User          | widerruft ein eigenes Token, `204`; fremdes oder unbekanntes `410`       |
| `GET /api/admin/api-tokens`        | Administrator | Tokens aller User, zusätzlich `userId` und `userName`                    |
| `DELETE /api/admin/api-tokens/:id` | Administrator | widerruft ein beliebiges Token, `204`; unbekanntes `410`                 |

„Nicht gefunden“ ist wie überall `410`, nicht `404` (`notFound` in `lib/id.ts`). Die beiden Admin-Endpoints
bekommen per Migration einen Eintrag mit der Rolle Administrator in
`endpoint_roles` (Skill `authorization`).

## UI

Feature `src/features/api-tokens/` mit zwei Seiten:

| Seite                                     | Route               | Komponente           |
|-------------------------------------------|---------------------|----------------------|
| „Agent-Zugang“ im User-Bereich            | `/user/api-tokens`  | `ApiTokensPage`      |
| „Agent-Zugänge“ im Administrationsbereich | `/admin/api-tokens` | `AdminApiTokensPage` |

- Beide Seiten zeigen eine Liste mit Name, Erstellung, letzter Nutzung, Ablauf („kein Ablauf“ bzw. das
  Datum, abgelaufene markiert) und „Widerrufen“ mit Rückfrage. Die Admin-Seite zeigt zusätzlich den User.
- „Token erzeugen“ öffnet einen Dialog mit Name und Gültigkeit. Danach zeigt er das Token mit
  „Kopieren“, dem Befehl `claude mcp add …` von oben und dem Hinweis, dass es nicht noch einmal angezeigt
  wird.
- Menüeinträge „Agent-Zugang“ und „Agent-Zugänge“ jeweils am Ende des Bereichs.

## Umsetzung

Reihenfolge, jeder Schritt ist ein eigener Commit mit Tests:

1. **Tabelle `api_tokens`** in `db/schema.ts`, Migration, Schema in `shared/api-token.ts`.
2. **`withToken(handler)`** in `netlify/functions/lib/api-token.ts`, analog zu `withSession`: liest den
   Bearer-Header, prüft Hash und Ablauf, aktualisiert `lastUsedAt`, prüft `hasEndpointAccess` und übergibt
   dem Handler `{user}` wie die `Session`.
3. **Endpoints** `/api/api-tokens` und `/api/admin/api-tokens` mit der Migration für `endpoint_roles`.
4. **Seiten** „Agent-Zugang“ und „Agent-Zugänge“ mit den Use Cases.
5. **Doku:** Abschnitt „API-Token“ im Skill `authentication`, die Admin-Endpoints im Skill
   `authorization`.

## Tests

Nach dem Skill `architecture` (`testing.md`): Functions haben keine Unit-Tests, weil sie die DB brauchen.

- **Unit-Tests in `netlify/functions/lib/`:** Bearer-Header lesen (kein Header, anderes Schema, fehlendes
  Präfix), Token erzeugen (Präfix, Länge) und hashen, `expiresAt` aus `expiresInDays` berechnen, auch
  `null`.
- **Komponententests** der Seiten: Token wird nach dem Erzeugen einmal angezeigt, Widerrufen fragt nach,
  abgelaufene Tokens sind markiert.
- **`scripts/api-walkthrough.sh`** gegen `netlify dev`:
  - Token erzeugen, Liste enthält es ohne Hash und ohne Token
  - `DELETE` auf das Token eines anderen Users als User → `410`
  - User ruft `GET /api/admin/api-tokens` auf → `403`
  - Administrator widerruft das Token eines Users
  - `/api/mcp` ohne Token, mit Session-Cookie statt Token, mit falschem und mit widerrufenem Token →
    `401`. Ein abgelaufenes Token lässt sich über die API nicht erzeugen, den Ablauf prüft der Unit-Test
    von `isTokenExpired`.

## Nicht Teil dieser Version

- Rechte pro Token (z. B. nur lesen); ein Token kann alles, was die Tools des MCP-Servers anbieten
- OAuth
- Gültigkeit eines Tokens nachträglich ändern oder ein Token umbenennen
