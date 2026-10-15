---
name: authorization
description: Wie wird der Anwender autorisiert, welche Rollen gibt es und wie werden sie Benutzern und API-Endpoints zugeordnet. Verwenden bei Arbeiten an Rollen, Rollenzuordnung, Absicherung von Endpoints oder der Admin-Oberfläche.
---

# Authentifizierung

Die Anmeldung ist im Skill `authentication` beschrieben (eigene Benutzerverwaltung mit Passwort).
Die Rollenprüfung setzt voraus, dass das Backend bei jedem API-Aufruf
den angemeldeten Benutzer aus `users` kennt.

# Datenbank

| Tabelle          | Inhalt                                                        |
|------------------|---------------------------------------------------------------|
| `roles`          | Rollen der Anwendung                                          |
| `user_roles`     | Zuordnung Benutzer -> Rolle (n:m)                             |
| `endpoint_roles` | Zuordnung Endpoint + HTTP-Methode -> Rolle (genau eine Rolle) |

`roles` hat eine `id` (UUID, Primärschlüssel) und einen eindeutigen `name`.
`user_roles.role_id` und `endpoint_roles.role_id` verweisen auf die `id`, nie auf den Namen.
Die festen Rollen haben feste IDs, die im Code in `shared/role.ts` stehen (`ADMIN_ROLE_ID`, `USER_ROLE_ID`). Der Code
verweist nur über diese IDs auf Rollen.
Die API liefert Rollen als `{id, name}`, `PUT /api/users/:id/roles` erwartet `{roleIds: [...]}`.

# Rollen

Ein Benutzer kann eine oder mehrere Rollen besitzen.
Die Zuordnung Benutzer -> Rolle wird von einem Administrator in der Oberfläche gepflegt.

## Rolle "User"

Die Rolle "User" steht wie jede andere Rolle in der Tabelle `roles`.
Jeder neu angelegte Benutzer bekommt sie als normale Zuordnung in `user_roles`
(`POST /api/users` trägt sie in derselben Transaktion ein).
Im Code wird die Rolle "User" nicht als Sonderfall behandelt: Es zählt nur,
was in der Datenbank zugeordnet ist.

## Rolle "Administrator"

Ein Administrator darf jeden Endpoint mit jeder Methode aufrufen,
unabhängig davon, welche Rolle dort zugeordnet ist.

## Initialisierung / Bootstrap

- Die Rollen "Administrator" und "User" sind fest vorgegeben und können weder umbenannt noch gelöscht werden.
- Der erste Administrator wird per Skript eingetragen: `node scripts/grant-admin.ts <email>`.
- Danach können alle Zuordnungen Benutzer -> Rolle in der Oberfläche geändert werden.
- Es muss immer mindestens ein Benutzer mit der Rolle "Administrator" existieren.
  Eine Änderung, die den letzten Administrator entfernen würde (Rolle entziehen
  oder Benutzer löschen), wird mit `409` abgelehnt. Dazu sperrt `lockAdmins` aus
  `netlify/functions/lib/roles.ts` die Administrator-Zeilen bis zum Ende der Transaktion,
  damit zwei gleichzeitige Änderungen nicht beide durchgehen.
- Die Zuordnung Benutzer -> Rolle pflegt der Administrator im Dialog "Rollen" der Benutzerverwaltung (`GET /api/roles`,
  `GET`/`PUT /api/users/:id/roles`).

# Zuordnung Rollen -> Endpoints

Gesichert werden ausschließlich die Backend-Endpoints (`/api/...`), nicht die Seiten im Frontend.
Die Zuordnung steht in der Tabelle `endpoint_roles` und wird **nur über Migrationen** gepflegt
(`npx drizzle-kit generate --custom --name <name>`, dann `INSERT`/`UPDATE`/`DELETE` in der SQL-Datei).
Es gibt dafür keine Oberfläche. Die Startwerte stehen in `db/migrations/0006_roles_seed.sql`
(damals noch mit Rollennamen, Umstellung auf IDs in 0007 und 0008). Neue Einträge verweisen
lesbar über den Namen auf die id:

```sql
INSERT INTO `endpoint_roles` (`path`, `method`, `role_id`)
SELECT '/api/holidays', 'POST', `id`
FROM `roles`
WHERE `name` = 'Administrator';
```

Wer einen neuen Endpoint baut, der nicht für alle User gedacht ist, legt die Einträge in derselben Änderung an.

- Ein Eintrag besteht aus Pfad, HTTP-Methode und genau einer Rolle.
- Methoden: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`.
- Der Pfad ist das Muster aus der `config.path` der Netlify Function, nicht die konkrete URL,
  z. B. `/api/vacations/:id` und nicht `/api/vacations/42`.
- Pro Kombination aus Pfad und Methode gibt es höchstens einen Eintrag.
- Gibt es für Pfad und Methode keinen Eintrag, gilt die Rolle "User".
- Zugriff hat, wer die zugeordnete Rolle besitzt, sowie jeder Administrator.

Beispiel:

| Pfad                | Methode  | Rolle                     |
|---------------------|----------|---------------------------|
| `/api/holidays`     | `POST`   | Administrator             |
| `/api/holidays/:id` | `DELETE` | Administrator             |
| `/api/holidays`     | `GET`    | (kein Eintrag, also User) |

Der Admin-Reset `POST /api/auth/reset-password` braucht unbedingt einen Eintrag mit der Rolle
Administrator, sonst kann jeder angemeldete User fremde Passwörter setzen.
Ausnahme vom Pfadmuster: `/api/auth/:action` umfasst auch Login, Logout, `/me` und die eigene
Passwortänderung, die ohne Rollenprüfung laufen. `auth.ts` prüft deshalb nur beim Reset, und zwar
mit dem konkreten Pfad `/api/auth/reset-password`.

# Durchsetzung

Die Berechtigung wird **nur im Backend** geprüft, bei jedem API-Aufruf.
Das übernimmt `withSession` aus `netlify/functions/lib/session.ts` zusammen mit
`netlify/functions/lib/roles.ts`: Erst die Session, dann die Rolle. Der konkrete Pfad der Anfrage
wird mit den Mustern aus `endpoint_roles` verglichen (`/api/users/42` passt zu `/api/users/:id`,
`:name` steht für genau ein Segment). Passen mehrere, gilt der genaueste mit den wenigsten
Parametern. Eine neue Function braucht dafür also nichts weiter als `withSession(handler)`.

Netlify wiederholt eine `403` wie eine `404` mit `.html`, `.htm`, `/index.html` und `/index.htm`
und gibt die Antwort der letzten Wiederholung zurück. Bei diesen Wiederholungen ist `context.params`
leer, deshalb verwendet die Prüfung nur den Pfad. `endpointPath` in `lib/roles.ts` entfernt die
Endungen, damit auch die Wiederholungen mit `403` beantwortet werden.
Wer eine Rollenprüfung außerhalb von `withSession` baut (wie in `auth.ts`), muss das auch beachten.

| Situation                          | Antwort des Backends |
|------------------------------------|----------------------|
| nicht angemeldet                   | `401 Unauthorized`   |
| angemeldet, aber Rolle fehlt       | `403 Forbidden`      |
| Rolle vorhanden oder Administrator | normale Verarbeitung |

Das Frontend blendet nichts anhand von Rollen aus. Antwortet das Backend mit `403`,
zeigt die UI eine Fehlermeldung an, dass der Benutzer nicht die notwendigen Rechte hat.
Der Text kommt vom Backend ("Dir fehlen die notwendigen Rechte für diese Aktion") und erscheint
dort, wo die Seite oder der Dialog ohnehin Fehler anzeigt. Bei `401` und `403` wiederholt React Query
eine Abfrage nicht (`retry` in `src/query-client.ts`).
