---
name: breadcrumb-dropdown
description: Im Breadcrumb öffnet ein Klick auf ein Glied mit Unterseiten ein Dropdown mit diesen Unterseiten, z. B. bei „Report“ Heute, Woche, Monat, Jahr und Überstunden. So wechselt der User direkt zu einer anderen Unterseite.
type: change
changes: user-dashboard
epics: navigation
state: resolved
---

# Breadcrumb Dropdown

„Der User wechselt über die Breadcrumb direkt zu einer anderen Unterseite, ohne die Seitenleiste zu öffnen.“

Heute zeigt die Breadcrumb im Kopf der Seite den Pfad zur aktuellen Seite, z. B. auf `/user/reports/daily`
„Report › Heute“ (`../../src/application/breadcrumb/breadcrumb.tsx`). Jedes Glied außer dem letzten ist ein Link,
das letzte ist nur Text. Wer vom Tagesbericht zum Monatsbericht will, muss die Seitenleiste nutzen. Auf schmalen
Bildschirmen ist sie eingeklappt, dort braucht der Wechsel zwei Klicks mehr.

Der Pfad entsteht aus den Präfixen der Adresse und den Einträgen in
`../../src/application/navigation/nav-items.ts` (`useBreadcrumbTrail` in
`../../src/application/breadcrumb/use-breadcrumb-trail.tsx`). Die Unterseiten eines Eintrags kennt bereits der
Navigationsbaum der Seitenleiste: `buildNavTree` in `../../src/application/navigation/nav-utils.ts` hängt jedem
Eintrag die direkt darunter liegenden Einträge als `childItems` an.

Beschreibung des geänderten Use Case: `../use-case/user-dashboard.md`. Eine eigene Story zur Navigation gibt es
nicht, die Regeln der Breadcrumb kommen deshalb dorthin. Frühere Regeln zur Breadcrumb:
`navigation-refactoring-1.md` (Abschnitt „Breadcrumb“).

## Verhalten

1. **Welche Glieder ein Dropdown haben.** Jedes Glied, dessen Eintrag Unterseiten hat (`childItems` nicht leer),
   bekommt ein Dropdown. Heute sind das „Report“ (Heute, Woche, Monat, Jahr, Überstunden) und „Administration“
   (Einstellungen, Benutzer verwalten, Feiertage, Agent-Zugänge). Glieder ohne Unterseiten bleiben wie heute.
2. **Link und Dropdown getrennt.** Der Name des Glieds bleibt ein Link auf seine Seite, wie heute. Rechts daneben
   steht ein kleiner Button mit Pfeil nach unten (`ChevronDown`), der das Dropdown öffnet. So bleibt „Report“ als
   Sprung zur Übersicht erhalten, und die Bedienung entspricht der Seitenleiste (`sidebar-item.tsx`: Link und
   eigener Button zum Aufklappen). Der Button hat das `aria-label` „Unterseiten von <Name>“ und ist auf
   Touch-Geräten 44 px groß. Nach dem Button steht kein Pfeil nach rechts (›), der Pfeil nach unten trennt das
   Glied schon vom nächsten. So hat das letzte Glied auf dem Handy mehr Platz.
3. **Auch das letzte Glied.** Auf `/user/reports` ist „Report“ das letzte Glied und bekommt ebenfalls das Dropdown.
   Das letzte Glied bleibt Text, nicht Link. Auf Touch-Geräten ist auch der Link eines Glieds mindestens 44 px
   groß. Fehlt der Platz (z. B. „Report › Überstunden“ auf dem Handy), wird nur der Name des letzten Glieds
   mit „…“ gekürzt, alles davor nicht. Für den Platz wandert der Button „60 min/h“ für die Industriezeit aus dem Kopf ins Benutzermenü
   (`../use-case/industriezeit.md`).
4. **Inhalt des Dropdowns.** Die Unterseiten in der Reihenfolge von `nav-items.ts`, jede mit Icon und Name. Die
   Unterseite, die gerade angezeigt wird, ist markiert (Häkchen oder hervorgehoben) und bleibt anklickbar.
5. **Auswahl.** Ein Klick auf eine Unterseite navigiert dorthin und schließt das Dropdown. Escape oder ein Klick
   daneben schließt es ohne Navigation. Bedienung mit der Tastatur wie bei jedem Dropdown von shadcn (Pfeiltasten,
   Enter).
6. **Unterseiten mit Zeitraum.** Ein Bericht mit Zeitraum in der Adresse (`/user/reports/daily/2026-10-21`) zeigt
   „Report › Heute“. Die Unterseiten im Dropdown führen immer auf den aktuellen Zeitraum (`/user/reports/weekly`),
   nicht auf die Woche des angezeigten Tages.
7. **Rechte.** Das Dropdown zeigt nur Einträge aus `nav-items.ts`. Die Unterseiten von „Administration“ sieht nur,
   wer `/admin` überhaupt erreicht, also ein Administrator. Eine eigene Prüfung braucht das Dropdown nicht.

## Umsetzung

| Baustein   | Datei                                                            | Änderung                                                                                                                                                                         |
|------------|------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Navigation | `../../src/application/breadcrumb/use-breadcrumb-trail.tsx`      | liefert `NavNode[]` statt `NavItem[]`, also mit `childItems`. Dafür `buildNavTree` und `findBreadcrumbTrail` aus `nav-utils.ts` verwenden statt der eigenen Präfix-Suche, die dann entfällt. |
| Komponente | `../../src/application/breadcrumb/breadcrumb-dropdown.tsx` (neu) | Button mit `ChevronDown` als Trigger, Inhalt mit `DropdownMenu` aus `../../src/components/ui/dropdown-menu.tsx`, Einträge als `Link` (`asChild`), aktueller Eintrag markiert. |
| Komponente | `../../src/application/breadcrumb/breadcrumb.tsx`                | hängt bei einem Glied mit `childItems` das `BreadcrumbDropdown` an.                                                                                                              |
| Tests      | `../../src/application/navigation/nav-utils.test.ts`             | `findBreadcrumbTrail` liefert die `childItems` von „Report“ und „Administration“.                                                                                              |
| Tests      | `../../src/tests/navigation.test.tsx`                            | auf `/user/reports/daily` das Dropdown von „Report“ öffnen, alle fünf Unterseiten sehen, „Woche“ wählen und auf `/user/reports/weekly` landen. Ein Glied ohne Unterseiten (Urlaube) hat keinen Button. Der Test „zeigt in der Breadcrumb keinen Eintrag User“ bleibt grün. Radix öffnet ein Dropdown in jsdom über `keyDown` (Enter) auf dem Trigger. |
| Doku       | `../use-case/user-dashboard.md`                                  | neuer Abschnitt „Breadcrumb“ mit den Regeln 1 bis 7 in Kurzform.                                                                                                                |

Nach den Skills `ui-modules` (die neue Komponente gehört zum Rahmen, also nach `application/breadcrumb/`) und
`ui-styling` (Klassen nur in der Komponente, der Button nutzt `IconButton` oder dessen Größen für Touch).

## Fertig, wenn

- [x] „Report“ und „Administration“ haben in der Breadcrumb einen Button mit Pfeil, alle anderen Glieder nicht.
- [x] Ein Klick auf den Namen eines Glieds navigiert wie bisher, ein Klick auf den Pfeil öffnet das Dropdown.
- [x] Das Dropdown zeigt die Unterseiten mit Icon in der Reihenfolge der Navigation, die aktuelle ist markiert.
- [x] Die Auswahl einer Unterseite navigiert dorthin und schließt das Dropdown, Escape schließt ohne Navigation.
- [x] Auf einem Bericht mit Zeitraum in der Adresse führen die Unterseiten auf den aktuellen Zeitraum.
- [x] Auf schmalen Bildschirmen und mit Touch ist der Button groß genug, die Breadcrumb bricht nicht um.
- [x] Tests, Lint und Typen sind grün.
- [x] Der geänderte Use Case beschreibt den neuen Stand (user-dashboard).
- [x] `state` steht auf `resolved`.
