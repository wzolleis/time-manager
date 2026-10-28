---
name: navigation-refactoring-1
description: Die Navigation soll für den User vereinfacht werden.
type: change
changes: user-settings, version, holiday, passkeys, sick-leave, overtime, today-report, weekly-report, monthly-report, yearly-report, mcp-token
epics: navigation
state: resolved
---

# Vereinfachung der Navigation

„Der User kann einfach auf die wichtigsten Funktionen zugreifen, das Administrator-Menü ist nicht mehr im Weg“

Das ist erst der erste Schritt für den Umbau der Navigation. Die weiteren Schritte folgen noch.

# Vereinfachung Administrator-Navigation
Wenn ein eingeloggter User die Rolle Administrator hat, 
dann soll das Administrator-Menü nicht mehr in der Navigationsleiste links angezeigt werden.
Stattdessen gibt es das Administrator-Menü eigens, neben dem avator vom User in der Leiste oben rechts.
Unterhalb sind dann die Einträge, die jetzt in der Navigationsleiste sichtbar sind.
Wenn der eingeloggte User die Administrations-Rolle nicht hat, ist das Menü nicht sichtbar.

# Vereinfachung User-Navigation
die Menüpunkte unterhalb von User sind dann direkt in der Navigationsleiste sichtbar, der Punkt "User" ist 
in der Navigationsleiste nicht mehr notwendig.
Dadurch entfällt schon mal eine Ebene im Navigationsbaum.

# Dashboards
Ganz oben gibt es einen Punkt "Dashboard" in der Navigation. Das Dashboard ist aktuell leer. 
Wenn der User die Rolle "Administrator" hat, dann wird eine Karte mit einem Link auf das Admin-Dashboard angezeigt.
Es wird immer eine Karte mit dem Link auf das User-Dashboard angezeigt, da jeder eingeloggte User die User-Rolle hat.

Aktuell sind die jeweiligen User- und Admin-Dashboards noch leer, das wird sich noch ändern.

# Entscheidungen und Details

## Rollen im Client
Der Client kennt die Rollen des angemeldeten Users bisher nicht: `GET /api/auth/me` liefert nur
`id`, `name`, `email` und `avatarUrl` (`../../netlify/functions/auth.ts`), der `UserContext`
(`../../src/lib/user-context.ts`) hat keine Rollen. `/me` liefert deshalb zusätzlich die Rollen des Users
(z. B. `roleIds`), der Client erkennt den Administrator an `ADMIN_ROLE_ID` (`../../shared/role.ts`).

## Administrator-Menü
- Auslöser ist ein Icon-Button mit Zahnrad links neben dem Avatar oben rechts, mit Tooltip „Administration“.
- Einträge: „Administration“ (`/admin`, Admin-Dashboard), „Einstellungen“ (`/admin/settings`),
  „Benutzer verwalten“, „Feiertage“, „Agent-Zugänge“.
- Ohne Rolle Administrator ist der Button nicht da. Die Routen unter `/admin` werden in diesem Schritt
  nicht gesperrt, die API antwortet ohne Rolle ohnehin mit `403`.
- Auch im Hamburger-Menü auf schmalen Bildschirmen stehen die Admin-Einträge nicht mehr, der Zahnrad-Button
  oben rechts bleibt sichtbar.

## Avatar-Menü
Der Eintrag „Einstellungen“ zeigt auf die Einstellungen des Users (`/user/settings`, `user-settings`).
Bisher zeigte er auf `/admin/settings`. Die Einstellungen des Users stehen dafür nicht mehr in der
Navigationsleiste links.

## Navigationsleiste
Der Eintrag „User“ (`/user`) entfällt, seine Kinder stehen auf der obersten Ebene. Reihenfolge (vorläufig,
ändert sich in den nächsten Schritten):

1. Dashboard
2. Report (Heute, Woche, Monat, Jahr, Überstunden)
3. Urlaube
4. Krankmeldungen
5. Feiertage
6. Projekte
7. Agent-Zugang
8. Passkeys

Der Navigationsbaum wird bisher aus den Pfaden gebaut (`buildNavTree` in
`../../src/application/navigation/nav-utils.ts`, oberste Ebene = Pfadtiefe ≤ 1). Ohne den Eintrag „User“
würden die Einträge unter `/user/...` dadurch ganz verschwinden. Jeder Eintrag in `nav-items.ts` bekommt
deshalb einen Bereich (Navigationsleiste, Administrator-Menü, Avatar-Menü), und der Baum der Leiste wird nur
aus den Einträgen ihres Bereichs gebaut.

## Breadcrumb
Die Breadcrumb nutzt weiter alle Einträge: `/admin/users` zeigt „Administration › Benutzer verwalten“.
Unter `/user/...` fehlt „User“, z. B. `/user/reports/weekly` zeigt „Report › Woche“.

## Dashboard
`/` und `/dashboard` zeigen das Dashboard. Die Karten verlinken auf `/user` (User-Dashboard, immer) und
`/admin` (Admin-Dashboard, nur mit Rolle Administrator). Beide Routen gibt es schon.

## Betroffene Use Cases
Nach der Umsetzung sind die Menü-Angaben in diesen Beschreibungen anzupassen: `user-settings` („Im Menü
unter ‚User‘“ → Avatar-Menü), `version` (Avatar-Menü), `holiday`, `passkeys`, `sick-leave`, `overtime`,
`today-report`, `weekly-report`, `monthly-report`, `yearly-report` (Menüeinträge und Reihenfolge) und
`../boundaries/mcp-token.md` (Agent-Zugang und Agent-Zugänge).


