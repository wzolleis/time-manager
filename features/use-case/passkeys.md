---
name: passkeys
description: Der User meldet sich mit einem Passkey (WebAuthn) statt mit E-Mail und Passwort an. Er trägt seine Passkeys auf der Seite „Passkeys“ ein, sieht und löscht sie dort. Enthält Tabellen, Endpoints, Ablauf der Prüfung, Regeln und UI. Umgesetzt mit @simplewebauthn/server und @simplewebauthn/browser, ohne externen Anmeldedienst.
type: story
epics: anmeldung, berechtigungen
state: resolved
---

# Passkeys

„Der User meldet sich mit seinem Passkey an, ohne ein Passwort einzugeben.“

Ein Passkey ist ein Schlüsselpaar, das auf dem Gerät des Users liegt (iCloud-Schlüsselbund, Google-Konto,
Windows Hello, Passwortmanager, Sicherheitsschlüssel). Der Server speichert nur den öffentlichen Schlüssel.
Beim Anmelden signiert das Gerät eine zufällige Challenge des Servers, nachdem der User sich mit
Fingerabdruck, Gesicht oder Geräte-PIN ausgewiesen hat. Danach gibt es dieselbe Session wie nach dem
Login mit Passwort.

Das Passwort bleibt bestehen. Passkeys sind ein zweiter Weg, sich anzumelden, kein Ersatz.

Technische Grundlage: Skill `authentication` (Sessions) in `../../.claude/skills/`. Code:

- Function `../../netlify/functions/auth.ts` (Anmelden, Eintragen), `../../netlify/functions/passkeys.ts`
  (Liste, Löschen), Hilfen `../../netlify/functions/lib/passkey.ts`
- Schemas `../../shared/passkey.ts`
- Seite `../../src/features/passkeys/components/passkeys-page.tsx`, Use Cases
  `../../src/features/passkeys/use-cases/`
- Login-Seite `../../src/components/login/login-page.tsx`

## Use Cases

| Use Case                                   | Hook                | Seite          |
|--------------------------------------------|---------------------|----------------|
| Der User meldet sich mit einem Passkey an. | (Login-Seite)       | `LoginPage`    |
| Der User sieht seine Passkeys.             | `useShowPasskeys`   | `PasskeysPage` |
| Der User trägt einen Passkey ein.          | `useAddPasskey`     | `PasskeysPage` |
| Der User löscht einen Passkey.             | `useDeletePasskey`  | `PasskeysPage` |

### Ablauf

1. Der User meldet sich wie bisher mit E-Mail und Passwort an und öffnet im User-Bereich die Seite
   „Passkeys“.
2. „Passkey hinzufügen“ fragt nach einem Namen, z. B. „MacBook“, und startet den Dialog des Browsers.
   Nach Fingerabdruck oder PIN steht der Passkey in der Liste.
3. Beim nächsten Mal klickt der User auf der Login-Seite auf „Mit Passkey anmelden“. Der Browser bietet
   die Passkeys für diese Seite an, eine E-Mail muss er nicht eingeben.
4. Geht ein Gerät verloren, meldet sich der User auf einem anderen Gerät an und löscht dessen Passkey.

## Daten

Tabelle `passkeys`, im Code `Passkey`:

| Feld            | Typ                    | Inhalt                                                        |
|-----------------|------------------------|---------------------------------------------------------------|
| `id`            | UUID                   | zum Anzeigen und Löschen                                      |
| `userId`        | UUID                   | Besitzer; `onDelete: cascade`                                 |
| `name`          | Text, 1–100 Zeichen    | vom User vergeben                                             |
| `credentialId`  | Text (base64url), eindeutig | ID des Passkeys, wie das Gerät sie beim Anmelden schickt |
| `publicKey`     | Text (base64url)       | öffentlicher Schlüssel (COSE)                                 |
| `counter`       | Zahl                   | Signaturzähler des Geräts, bei Passkeys meist 0               |
| `transports`    | Text, optional         | z. B. `internal,hybrid`, Hinweis für den Browser              |
| `backedUp`      | ja/nein                | wird der Passkey über ein Konto synchronisiert (iCloud usw.)  |
| `createdAt`     | Zeitpunkt              |                                                               |
| `lastUsedAt`    | Zeitpunkt, optional    | letzte Anmeldung mit diesem Passkey                           |

Tabelle `passkey_challenges` für die Challenges, die der Server ausgegeben hat. Netlify Functions halten
keinen Zustand, deshalb steht die Challenge zwischen den beiden Aufrufen in der Datenbank:

| Feld        | Typ                                  | Inhalt                                         |
|-------------|--------------------------------------|------------------------------------------------|
| `challenge` | Text (base64url), Primärschlüssel    | 32 zufällige Bytes                             |
| `purpose`   | `registration` \| `authentication`   | wofür die Challenge ausgegeben wurde           |
| `userId`    | UUID, optional                       | beim Eintragen der angemeldete User, sonst null |
| `expiresAt` | Zeitpunkt                            | 5 Minuten nach dem Ausgeben                    |

## Regeln

1. **Relying Party.** Ein Passkey gilt nur für die Domain, für die er eingetragen wurde. Die Domain (RP-ID)
   und der Origin kommen aus `PASSKEY_RP_ID` und `PASSKEY_ORIGIN`, ohne diese Variablen aus der URL der
   Anfrage. In der Produktion werden beide gesetzt, damit ein Passkey nicht an eine Deploy-Preview
   gebunden wird. Wechselt die Domain, sind alle Passkeys ungültig.
2. **Nur mit Bestätigung am Gerät.** Der Passkey ist der einzige Faktor der Anmeldung, deshalb verlangt der
   Server User Verification (Fingerabdruck, Gesicht, PIN), beim Eintragen und beim Anmelden.
3. **Auffindbare Passkeys.** Beim Eintragen wird ein auffindbarer Passkey (Resident Key) verlangt. So muss
   der User beim Anmelden keine E-Mail eingeben, der Server erkennt ihn an der `credentialId`.
4. **Challenge nur einmal.** Jede Challenge gilt 5 Minuten und nur für ihren Zweck. Die Prüfung löscht sie,
   eine zweite Prüfung mit derselben Challenge scheitert. Eine Challenge zum Eintragen gilt nur für den
   User, der sie angefordert hat. Abgelaufene Challenges werden beim nächsten Anfordern gelöscht.
5. **Gleiche Meldung.** Unbekannter Passkey und gescheiterte Prüfung beim Anmelden ergeben dieselbe
   Meldung „Anmeldung mit Passkey fehlgeschlagen“ (`401`).
6. **Ein Gerät, ein Passkey.** Beim Eintragen schickt der Server die vorhandenen Passkeys des Users mit
   (`excludeCredentials`). Hat das Gerät schon einen, lehnt der Browser ab und die UI meldet das.
   Kommt dieselbe `credentialId` trotzdem zweimal an, antwortet der Server mit `409`.
7. **Nur eigene Passkeys.** Ein User sieht und löscht nur seine eigenen Passkeys. Ein fremder oder unbekannter
   ist „nicht gefunden“ (`410`). Auch ein Administrator trägt keine Passkeys für andere ein.
8. **Passwort.** Ändert der User sein Passwort, bleiben die Passkeys gültig. Setzt der Administrator das
   Passwort zurück, werden zusammen mit den Sessions auch alle Passkeys des Users gelöscht: Ein Reset
   bedeutet, dass der Zugang neu vergeben wird, ein Passkey eines Angreifers soll ihn nicht überleben.
   Wird der User gelöscht, verschwinden seine Passkeys (cascade).
9. **Zähler.** Meldet ein Gerät einen Signaturzähler, muss er bei jeder Anmeldung steigen, sonst wird die
   Anmeldung abgelehnt (Hinweis auf einen kopierten Schlüssel). Synchronisierte Passkeys melden immer 0.

## Endpoints

| Endpoint                                  | Session | Zweck                                                              |
|-------------------------------------------|---------|--------------------------------------------------------------------|
| `POST /api/auth/passkey-login-options`    | nein    | Optionen mit neuer Challenge für `navigator.credentials.get`       |
| `POST /api/auth/passkey-login`            | nein    | `{response}` prüfen, setzt das Session-Cookie, liefert den User    |
| `POST /api/auth/passkey-register-options` | ja      | Optionen mit neuer Challenge für `navigator.credentials.create`    |
| `POST /api/auth/passkey-register`         | ja      | `{name, response}` prüfen und speichern, `201` mit dem Passkey     |
| `GET /api/passkeys`                       | ja      | eigene Passkeys ohne Schlüssel, Zähler und `credentialId`          |
| `DELETE /api/passkeys/:id`                | ja      | eigenen Passkey löschen, `204`; fremder oder unbekannter `410`     |

Keiner der Endpoints hat einen Eintrag in `endpoint_roles`. `/api/passkeys` gilt für die Rolle „User“
(`withSession`), die Aktionen unter `/api/auth/:action` laufen wie Login und Passwortänderung ohne
Rollenprüfung.

## UI

- **Login-Seite:** unter dem Formular „Mit Passkey anmelden“, nur wenn der Browser WebAuthn kann. Bricht
  der User den Dialog des Browsers ab, steht „Anmeldung mit Passkey abgebrochen“ da.
- **Seite „Passkeys“** im User-Bereich (`/user/passkeys`, Menüeintrag nach „Agent-Zugang“): Liste mit Name,
  „Synchronisiert“ (ja/nein), Erstellung, letzter Nutzung und „Löschen“ mit Rückfrage. „Passkey
  hinzufügen“ öffnet einen Dialog mit dem Namen und startet danach den Dialog des Browsers.

## Tests

- **Unit-Test** `netlify/functions/lib/passkey.test.ts`: RP-ID und Origin aus der Anfrage und aus den
  Variablen.
- **Ende zu Ende** von Hand in Chromium mit virtuellem Authenticator (CDP `WebAuthn.addVirtualAuthenticator`):
  eintragen, zweites Eintragen auf demselben Gerät abgelehnt, ohne Session mit Passkey anmelden, löschen,
  danach scheitert die Anmeldung.
- **Komponententests:** Login mit Passkey setzt den User, Abbruch zeigt die Meldung; Passkey hinzufügen
  schickt Namen und Antwort des Browsers, Löschen fragt nach. Der Browser (`@simplewebauthn/browser`) ist
  dabei gemockt, jsdom kann kein WebAuthn.
- **`scripts/api-walkthrough.sh`:** Optionen ohne Session für das Anmelden, ohne Session kein Eintragen
  (`401`), Antwort zu einer unbekannten Challenge (`400`), unbekannter Passkey beim Anmelden (`401`), Löschen eines
  unbekannten Passkeys (`410`). Eine
  echte Signatur braucht ein Gerät, das prüft der Walkthrough nicht.

## Nicht Teil dieser Version

- Anmelden über die Autofill-Liste des E-Mail-Felds (Conditional UI)
- Passkey umbenennen
- Passkeys anderer User im Administrationsbereich sehen
- Anmelden nur mit Passkey, ohne Passwort
