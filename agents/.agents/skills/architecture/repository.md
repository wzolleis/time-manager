---
name: repository
description: Wie der Client Daten schreibt. API-Funktionen in src/api/, useMutation im Use Case und welche Query Keys danach ungültig werden. Lesen, wenn Daten angelegt, geändert oder gelöscht werden.
---

# Repository

Ein Repository schreibt die Daten eines Aggregats (z. B. Urlaube, Buchungen, Projekte) über die API
in die Datenbank. Es besteht aus zwei Teilen:

1. **API-Funktionen** in `src/api/<aggregat>.ts`: rufen den Endpoint auf, ohne React.
2. **`useMutation`** im Hook des [Use Case](use-case.md): ruft die API-Funktion auf und
   invalidiert danach die betroffenen Daten im Cache.

Ein Repository liest keine Daten zurück. Nach dem Schreiben markiert es die Daten im Cache als
ungültig. Jede [View](views.md), die sie gerade anzeigt, lädt sie dann neu.

## 1. API-Funktionen

Eine Datei pro Aggregat in `src/api/`, die gleiche Datei enthält auch die lesende `fetch…`-Funktion
der View. Alle Funktionen verwenden `request` aus `src/api/http.ts`. Die Typen kommen aus `shared/<aggregat>.ts`.

| Funktion             | HTTP                                   | Body                                      | Antwort                |
|----------------------|----------------------------------------|-------------------------------------------|------------------------|
| `create<Aggregat>`   | `POST /api/<aggregat>`                 | `<Aggregat>Create`                        | das angelegte Objekt   |
| `update<Aggregat>`   | `PATCH /api/<aggregat>/:id`            | `<Aggregat>Update` (nur geänderte Felder) | das geänderte Objekt   |
| `delete<Aggregat>`   | `DELETE /api/<aggregat>/:id`           | –                                         | 204, `void`            |
| `update…` für Mengen | `PUT …` (z. B. `/api/users/:id/roles`) | die vollständige neue Menge               | die gespeicherte Menge |

Daten, die einem User gehören (Buchungen, Urlaube, Krankmeldungen, eigene Feiertage), liegen unter
`/api/users/:userId/<aggregat>`. Die API-Funktionen bekommen dann die User-ID als ersten Parameter, der
Body enthält keine `userId`. Zum Ändern und Löschen nimmt der Use Case die `userId` des Datensatzes, nicht
die des angemeldeten Users, damit es auch in der Admin-Ansicht stimmt. Globale Feiertage bleiben unter
`/api/holidays`, `src/api/holidays.ts` wählt den Pfad mit `userId: null`.

```ts
// src/api/vacations.ts
import {request} from "./http";
import type {Vacation, VacationCreate, VacationUpdate} from "@shared/vacation";

const path = (userId: string) => `/api/users/${userId}/vacations`;

export const createVacation = (userId: string, data: VacationCreate) =>
    request<Vacation>(path(userId), {method: "POST", body: JSON.stringify(data)});

export const updateVacation = (userId: string, id: string, data: VacationUpdate) =>
    request<Vacation>(`${path(userId)}/${id}`, {method: "PATCH", body: JSON.stringify(data)});

export const deleteVacation = (userId: string, id: string) =>
    request<void>(`${path(userId)}/${id}`, {method: "DELETE"});
```

`request` wirft bei jeder Antwort außer 2xx einen `ApiError` mit `status` und einer lesbaren
Meldung (`error` oder `errors` aus dem Body des Servers). Die API-Funktion fängt ihn nicht ab.

## 2. useMutation im Use Case

```ts
// src/features/vacations/use-cases/use-delete-vacation.ts
export function useDeleteVacation() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({userId, id}: Pick<Vacation, "userId" | "id">) => deleteVacation(userId, id),
        onSuccess: () => qc.invalidateQueries({queryKey: ["vacations"]}),
    });
}
```

Regeln:

- **Nur bei Erfolg invalidieren**, also in `onSuccess`. Nach einem Fehler hat sich nichts geändert.
- **`await` vor dem Schließen.** Schließt sich danach ein Dialog, erst `await qc.invalidateQueries(…)`
  und dann schließen. Sonst sieht der Anwender kurz die alten Daten.
- **Fehler anzeigen, nicht abfangen.** Die Komponente zeigt `mutation.error.message` an (`role="alert"`). Beim erneuten
  Öffnen eines Dialogs ruft sie `mutation.reset()` auf, damit die
  alte Meldung verschwindet.
- **401 nicht selbst behandeln.** Das erledigt `onError` im `MutationCache` (`src/query-client.ts`)
  und zeigt die Anmeldung. 403, 409 und 422 kommen mit verständlicher Meldung vom Server und werden
  wie jeder andere Fehler angezeigt.

## Welche Query Keys invalidieren?

Query Keys beginnen immer mit dem Namen des Aggregats. Danach folgen Parameter, meist die User-ID:

| Aggregat           | Query Keys der Views                             | nach dem Schreiben invalidieren |
|--------------------|--------------------------------------------------|---------------------------------|
| Urlaube            | `["vacations", userId]`                          | `["vacations"]`                 |
| Krankmeldungen     | `["sick-leaves", userId]`                        | `["sick-leaves"]`               |
| Buchungen          | `["time-entries", userId]`                       | `["time-entries"]`              |
| Projekte           | `["projects"]`                                   | `["projects"]`                  |
| Feiertage          | `["holidays", userId]`, `["holidays", "global"]` | `["holidays"]`                  |
| User               | `["users"]`                                      | `["users"]`                     |
| Rollen eines Users | `["users", id, "roles"]`                         | `setQueryData` mit der Antwort  |
| Agent-Tokens       | `["api-tokens", userId]`, `["api-tokens", "all"]` | `["api-tokens"]`               |

- **Mit dem Präfix invalidieren**, also `["vacations"]` statt `["vacations", userId]`. tanstack/query
  trifft damit alle Keys, die so beginnen, auch die anderer User in der Admin-Ansicht.
- **Alle Aggregate, die sich ändern.** Ändert ein Endpoint mehrere Aggregate, werden alle
  betroffenen Präfixe invalidiert. Berechnete Werte (Berichte, Urlaubskonto) haben keinen eigenen
  Key, sie werden von den Services aus den Daten der Views berechnet und sind danach automatisch aktuell.
- **`setQueryData` statt invalidieren** nur, wenn die Antwort den vollständigen neuen Stand enthält
  und genau ein Key betroffen ist, wie bei `PUT /api/users/:id/roles`. Das spart eine Anfrage.
- **Neues Aggregat:** Neuen Präfix in diese Tabelle eintragen.

## Cache im localStorage

Der Cache wird im localStorage gespeichert (`persistOptions` in `src/query-client.ts`) und gilt
5 Minuten als frisch. Ändert sich das Format der Daten, die ein Endpoint liefert, muss `buster`
erhöht werden, sonst zeigt der Client alte Daten im alten Format an.

## Nicht im Repository

- **Regeln prüfen:** das macht der Use Case mit einem [Service](service.md) vor dem Absenden.
- **Rechte prüfen:** das macht der Server (Skill `authorization`).
- **An- und Abmelden:** `src/api/auth.ts` und `ME_QUERY_KEY` sind ein Sonderfall. Beim Abmelden
  entfernt `clearUserData()` alle Daten, beim Anmelden `removeQueries` in `login-page.tsx`. Einzelne
  Keys werden dort nicht invalidiert.
