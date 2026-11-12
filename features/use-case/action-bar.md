---
name: action-bar
description: Die Action-Bar ist eine Leiste mit Buttons am unteren Bildschirmrand. Der User führt darüber einige Aktionen direkt aus (Heute, Woche, Einstellungen, Abmelden). Sie lässt sich in den Einstellungen ausblenden.
type: story
epics: navigation
state: resolved
---

# Warum gibt es eine Action-Bar
Der User kann eine Aktion sofort durch einen Klick auf einen Button ausführen
und muss nicht erst ein Menü öffnen. Das ist vor allem für mobile Geräte gedacht.

# Was ist die Action-Bar
Die Action-Bar ist eine Leiste mit Buttons. Die Buttons zeigen nur ein Icon, keinen Text.
Wenn der User einen Button anklickt, wird eine Aktion ausgeführt, die analog zu den Navigations-Menü-Items funktioniert.
Siehe api-user-pfade und navigation-refactoring-1.

- **Position:** ganz unten, sticky. Die Leiste bleibt beim Scrollen am unteren Rand stehen und nimmt die ganze
  Bildschirmbreite ein.
- **Platz für den Inhalt:** Die Leiste verdeckt kein Seitenende. Der Inhalt bekommt unten so viel Abstand wie die
  Leiste hoch ist, dazu den Abstand des Geräts (`env(safe-area-inset-bottom)`, z. B. am iPhone).
- **Buttons:** wie `IconButton` (`../../src/components/buttons/icon-button.tsx`), auf Touch-Geräten 44x44 px.
  Der Name der Aktion steht als Tooltip (`title`) und als `aria-label` am Button. Auf Geräten ohne Hover reicht das.
- **Keine Hervorhebung** der aktuellen Seite.
- Die Leiste gibt es nur für angemeldete User.

# Welche Aktionen stehen in der Action-Bar
Die Aktionen sind derzeit fest hinterlegt und können nicht geändert werden.
Es sind folgende Aktionen fest hinterlegt aufrufbar, in dieser Reihenfolge:

| Aktion        | Tooltip       | Ziel                  |
|---------------|---------------|-----------------------|
| Tagesreport   | Heute         | `/user/reports/daily` |
| Wochenreport  | Woche         | `/user/reports/weekly`|
| Einstellungen | Einstellungen | `/user/settings`      |
| Abmelden      | Abmelden      | meldet den User ab    |

# Was passiert wenn der User auf einen Button klickt ?
Die Aktion wird genauso ausgeführt, als wenn er die Aktion über das Menü bzw. das Dashboard ausführt.
Darum können auch nur bereits existierende Aktionen in der Action-Bar hinterlegt werden.

- Die Links sind echte Links (`<Link>` von TanStack Router).
- „Abmelden“ fragt wie auf dem Dashboard erst nach („Abmelden?“) und meldet dann mit `useLogout` ab.

# Konfiguration
Der User kann in den Einstellungen die Action-Bar einblenden oder ausblenden. Dafür
gibt es die Einstellung `Action Bar` (siehe user-settings.md und user-setting-action-bar.md).
Per Default ist die Action-Bar sichtbar.

Die Leiste erscheint erst, wenn die Einstellungen geladen sind. So blitzt sie bei einem User, der sie
ausgeschaltet hat, nicht kurz auf. Den Wert liefert `booleanSettingOf(data, SHOW_ACTION_BAR_SETTING_ID)`
(`../../shared/user-setting-rules.ts`) aus der View `useUserSettings`.

# Umsetzung
Die Umsetzung erfolgt mit einer eigenen Komponente, die shadcn-Komponenten verwendet. Dateien in
`../../src/components/ui/` werden nicht geändert.

- Die Leiste gehört zum Rahmen der Anwendung: `../../src/application/layout/action-bar.tsx`. Das Layout
  (`application-layout.tsx`) umgibt die Seite mit `ActionBarContainer`. Er prüft die Einstellung, zeigt die
  Leiste und hält unten Platz frei.
- Die Aktionen werden nicht neu definiert. Die Leiste verwendet die Aktionen des Dashboards
  (`userDashboardActions` in `../../src/features/dashboard/actions/user-dashboard-actions.ts`) mit Icon, Ziel
  und Bestätigung beim Abmelden. Als Tooltip dient der Titel der Aktion.
- Links zeigt `IconLink`, Abmelden `IconButton` (`../../src/components/buttons/icon-button.tsx`). Die Nachfrage
  zeigt `ConfirmActionDialog` (`../../src/components/dashboard-action/confirm-action-dialog.tsx`), denselben
  Dialog wie die Karte auf dem Dashboard.
- Tests: `../../src/tests/action-bar.test.tsx`.

# Wann ist das Feature umgesetzt ?
- Die Einstellung `Action Bar` ist vorhanden (erledigt mit user-setting-action-bar).
- Tests für die Action-Bar sind grün:
  - Ohne eigenen Wert ist die Leiste sichtbar, mit `Action Bar = false` nicht.
  - Solange die Einstellungen laden, ist die Leiste nicht zu sehen.
  - Ein Klick auf „Heute“ öffnet `/user/reports/daily`, „Woche“ `/user/reports/weekly`, „Einstellungen“
    `/user/settings`.
  - „Abmelden“ fragt nach und meldet nach der Bestätigung ab.
  - Jeder Button hat ein `aria-label`.
- Die Action-Bar ist sichtbar und die Aktionen darin werden durch einen Klick ausgeführt.
