---
name: action-bar
description: Die Action-Bar ist eine Leiste mit Buttons. Der User kann darüber einige Aktionen direkt ausführen. 
type: story
epics: navigation
state: open
---

# Warum gibt es eine Action-Bar
Der User kann eine Aktion sofort durch einen Klick auf einen Button ausführen
und muss nicht erst ein Menü öffnen. Das ist vor allem für mobile Geräte gedacht.


# Was ist die Action-Bar
Die Action-Bar ist eine Leiste mit Buttons. Die Buttons zeigen nur ein Icon und einen Tooltip, wenn die Maus
darüber hovert. 
Wenn der User einen Button anklickt, wird eine Aktion ausgeführt, die analog zu den Navigations-Menü-Items funktioniert.
Siehe api-user-pfade und navigation-refactoring-1.
Die Action-Bar nimmt die ganze Bildschirmbreite ein. 
Die Buttons sind wie schon vorher definiert 44x44 px.

# Welche Aktionen stehen in der Action-Bar
Die Aktionen sind derzeit fest hinterlegt und können nicht geändert werden.
Es sind folgende Aktionen fest hinterlegt aufrufbar:
* Tagesreport
* Wochenreport
* Einstellungen
* Ausloggen

# Was passiert wenn der User auf einen Button klickt ?
die Aktion wird genauso ausgeführt, als wenn er die Aktion über das Menü bzw. die Navigationsleiste ausführt.
Darum können auch nur bereits existierende Aktionen in der Action-Bar hinterlegt werden.

# Konfiguration
Der User kann in den Einstellungen die Action-Bar einblenden oder ausblenden. Dafür 
gibt es eine neue Einstellung (siehe user-settings.md) und user-setting-action-bar.md.
Per Default ist die Action-Bar sichtbar.

# Wann ist das Feature umgesetzt ?
Die neue Einstellung ist vorhanden, die Tests für die Action-Bar sind grün.
Die Action-Bar ist sichtbar und die Aktionen darin werden durch einen Klick ausgeführt.

