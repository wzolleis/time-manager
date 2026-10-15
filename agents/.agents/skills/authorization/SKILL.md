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

# Rollen

Ein Benutzer kann eine oder mehrere Rollen besitzen.
Die Zuordnung Benutzer -> Rolle wird von einem Administrator in der Oberfläche gepflegt.

## Rolle "User"

Die Rolle "User" steht wie jede andere Rolle in der Tabelle `roles`.
Jeder neu angelegte Benutzer bekommt sie als normale Zuordnung in `user_roles`.
Im Code wird die Rolle "User" nicht als Sonderfall behandelt: Es zählt nur,
was in der Datenbank zugeordnet ist.

## Rolle "Administrator"

Ein Administrator darf jeden Endpoint mit jeder Methode aufrufen,
unabhängig davon, welche Rolle dort zugeordnet ist.

## Initialisierung / Bootstrap

- Die Rollen "Administrator" und "User" sind fest vorgegeben und können weder umbenannt noch gelöscht werden.
- Der erste Administrator wird manuell in der Datenbank eingetragen.
- Danach können alle Zuordnungen Benutzer -> Rolle in der Oberfläche geändert werden.
- Es muss immer mindestens ein Benutzer mit der Rolle "Administrator" existieren.
  Eine Änderung, die den letzten Administrator entfernen würde (Rolle entziehen
  oder Benutzer löschen), wird abgelehnt.

# Zuordnung Rollen -> Endpoints

Gesichert werden ausschließlich die Backend-Endpoints (`/api/...`), nicht die Seiten im Frontend.
Die Zuordnung steht in der Tabelle `endpoint_roles`.

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
Login, Logout und `/api/auth/me` funktionieren ohne Rollenprüfung.

# Durchsetzung

Die Berechtigung wird **nur im Backend** geprüft, bei jedem API-Aufruf.

| Situation                          | Antwort des Backends |
|------------------------------------|----------------------|
| nicht angemeldet                   | `401 Unauthorized`   |
| angemeldet, aber Rolle fehlt       | `403 Forbidden`      |
| Rolle vorhanden oder Administrator | normale Verarbeitung |

Das Frontend blendet nichts anhand von Rollen aus. Antwortet das Backend mit `403`,
zeigt die UI eine Fehlermeldung an, dass der Benutzer nicht die notwendigen Rechte hat.
