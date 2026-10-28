---
name: user-dashboard
description: Das Dashboard (/dashboard, ebenso /user) zeigt die wichtigsten Aktionen als Karten. Drei Karten führen zum Tagesbericht, zum Wochenbericht und zu den Einstellungen, eine Karte meldet den User nach Bestätigung ab.
type: story
epics: navigation
state: resolved
---

# User Dashboard

„Der User kann die wichtigsten Use Cases direkt über das Dashboard ausführen.“

Das User Dashboard ist heute leer (Change `../changes/navigation-refactoring-1.md`). Es bekommt vier Karten
mit den Aktionen, die der User am häufigsten braucht. Später legt der User in seinen Einstellungen selbst
fest, welche Aktionen er sehen möchte. Dafür gibt es ein eigenes Feature, hier sind die Aktionen fest
vorgegeben.

Umgesetzt wird nach den Skills `architecture` (`../../.claude/skills/architecture`, zuerst
`../../.claude/skills/architecture/use-case.md` lesen) und `ui-modules`.

## Wo das Dashboard erscheint

Unter dem Menüeintrag „Dashboard“, Route `/dashboard` (`../../src/routes/dashboard.tsx`), Komponente
`Dashboard` in `../../src/features/dashboard/components/dashboard-page.tsx`. Die Seite zeigt direkt die Karten
des User Dashboards. Die früheren Karten „User Dashboard“ und „Administrator Dashboard“ gibt es dort nicht mehr.
Das Administrator Dashboard erreicht der Administrator über das Administrator-Menü oben rechts
(`admin-dashboard.md`).

Die Route `/user` (`../../src/routes/user/index.tsx`, `UserDashboard`) bleibt und zeigt dieselben Karten unter
der Überschrift „User Dashboard“.

Die Karten zeigt `ActionCardDashboard` aus `../../src/components/dashboard-action/action-card-dashboard.tsx`,
jede Karte ist eine `ActionCard` (`action-card.tsx`) mit Icon, Titel, Beschreibung und Button. Die Arten
einer Aktion stehen in `types.ts`: `link` springt zu einer Seite, `confirm` fragt vorher nach.

## Karten

In dieser Reihenfolge:

| Karte         | Art     | Icon            | Beschreibung                                  | Button                  | Ziel                   |
|---------------|---------|-----------------|-----------------------------------------------|-------------------------|------------------------|
| Heute         | link    | `CalendarClock` | „Stempeln und deine Buchungen von heute“      | „Zum Tagesbericht“      | `/user/reports/daily`  |
| Woche         | link    | `CalendarDays`  | „Deine Arbeitszeit in dieser Woche“           | „Zum Wochenbericht“     | `/user/reports/weekly` |
| Einstellungen | link    | `Settings`      | „Soll pro Tag und Urlaubstage pro Jahr“       | „Zu den Einstellungen“  | `/user/settings`       |
| Abmelden      | confirm | `LogOut`        | „Beendet deine Sitzung auf diesem Gerät“      | „Abmelden“              | –                      |

Die Icons sind dieselben wie in der Navigation (`../../src/application/navigation/nav-items.ts`).
Wochenbericht und Tagesbericht werden ohne Zeitraum verlinkt und zeigen so die aktuelle Woche und den
heutigen Tag (Change `../changes/report-links.md`).

## Karte „Abmelden“

1. Ein Klick auf „Abmelden“ öffnet die Bestätigung mit dem Titel „Abmelden?“ und dem Text „Du wirst auf
   diesem Gerät abgemeldet.“. Der Button in der Bestätigung heißt „Abmelden“, nicht „Löschen“.
   `ActionCard` hat den Text „Löschen“ heute fest im Code. `ConfirmAction` bekommt dafür ein Feld
   `confirmLabel`.
2. Nach der Bestätigung läuft derselbe Ablauf wie im Avatar-Menü: `handleLogout` in
   `../../src/application/layout/header.tsx` (`logout()`, danach auch bei Fehler `clearUserData()` und
   `ME_QUERY_KEY` auf `null`). Der Ablauf liegt dafür im Hook `useLogout`
   (`../../src/components/login/use-logout.ts`, neben der Anmeldung), den Header und Dashboard beide nutzen.
3. Danach sieht der User die Anmeldung wie nach dem Abmelden über das Avatar-Menü.

Die Karten stehen in `../../src/features/dashboard/actions/user-dashboard-actions.ts`. `handleConfirm` in
`Dashboard` ruft für die ID der Abmelde-Karte (`LOGOUT_ACTION_ID`) den Logout auf. Das `console.log`
entfällt.

## Nicht Teil dieses Use Case

- Der User kann die Karten nicht auswählen oder sortieren (eigenes Feature).
- Auf dem Dashboard wird nicht gestempelt. Kommen und Gehen bleiben im Tagesbericht.

## Tests

In `../../src/tests/` nach dem Muster von `dashboard.test.tsx` (Route rendern, API mit `fetch` mocken):

- `/dashboard` zeigt die Karten des User Dashboards, auch dem Administrator keine Karten zu den Dashboards.
- `/user` zeigt die vier Karten in der Reihenfolge der Tabelle. Die Links haben die Ziele aus der Tabelle.
- „Abmelden“ fragt nach. „Abbrechen“ ruft `/api/auth/logout` nicht auf, „Abmelden“ ruft es auf.
- Der Eintrag `"/user": "User Dashboard"` in `routes.test.tsx` bleibt grün.
