---
name: admin-dashboard
description: Das Administrator Dashboard (/admin) zeigt je eine Karte für Einstellungen, Benutzer verwalten, Feiertage und Agent-Zugänge. Das Administrator-Menü oben rechts hat nur noch den Eintrag „Administration“, der auf das Administrator Dashboard führt.
type: story
epics: navigation
state: resolved
---

# Administrator Dashboard

„Der Administrator erreicht alle Aufgaben der Administration von einer Seite aus.“

Bisher stand auf `/dashboard` für den Administrator eine Karte zum Administrator Dashboard, und das
Administrator Dashboard war leer (Change `../changes/navigation-refactoring-1.md`). Jetzt zeigt `/dashboard`
das User Dashboard (`user-dashboard.md`), und das Administrator Dashboard bekommt Inhalt.

## Wo das Dashboard erscheint

Route `/admin` (`../../src/routes/admin/index.tsx`), Komponente `AdminDashboard` in
`../../src/features/dashboard/components/admin-dashboard-page.tsx`. Der Administrator öffnet es über den
Eintrag „Administration“ im Administrator-Menü oben rechts (Zahnrad, nur mit Rolle Administrator). Der Eintrag
steht schon in `../../src/application/navigation/nav-items.ts` (`id: "admin"`, `menu: "admin"`).

Das Administrator-Menü hat nur noch diesen einen Eintrag. Die übrigen Seiten unter `/admin` erreicht der
Administrator nur über die Karten. Ihre Einträge bleiben in `nav-items.ts`, damit die Breadcrumb sie kennt,
stehen aber mit `menu: "admin-dashboard"` in keinem Menü.

## Karten

Je eine Karte für die Einträge mit `menu: "admin-dashboard"`, in derselben Reihenfolge. Alle Karten sind Links
(`kind: "link"`), die Icons sind dieselben wie in `nav-items.ts`. Die Karten stehen in
`../../src/features/dashboard/actions/admin-dashboard-actions.ts`.

| Karte              | Icon           | Beschreibung                                               | Button                  | Ziel                |
|--------------------|----------------|------------------------------------------------------------|-------------------------|---------------------|
| Einstellungen      | `Settings`     | „Einstellungen, die für alle User gelten“                  | „Zu den Einstellungen“  | `/admin/settings`   |
| Benutzer verwalten | `User`         | „User anlegen, Rollen zuordnen und Passwörter zurücksetzen“ | „Zur Benutzerverwaltung“ | `/admin/users`      |
| Feiertage          | `CalendarHeart`| „Feiertage für alle User pflegen“                          | „Zu den Feiertagen“     | `/admin/holidays`   |
| Agent-Zugänge      | `KeyRound`     | „Agent-Zugänge aller User einsehen und widerrufen“         | „Zu den Agent-Zugängen“ | `/admin/api-tokens` |

Kommt eine Seite unter `/admin` dazu, bekommt sie einen Eintrag mit `menu: "admin-dashboard"` und eine Karte.

## Tests

- `../../src/tests/dashboard.test.tsx`: `/admin` zeigt die vier Links mit den Zielen aus der Tabelle.
- `../../src/application/navigation/nav-utils.test.ts`: Das Administrator-Menü führt nur zu `/admin`.
