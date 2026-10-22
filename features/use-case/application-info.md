---
name: application-info
description: Die Anwendung zeigt Informationen über die Anwendung
epics: general
state: open
---

# Anwendungs-Informationen
Als Anwender und Entwickler möchte nähere Informationen über die Anwendung erhalten, 
wie z.B. die Version oder die Umgebung.

## Wichtige Informationen
* Version, die Version ist der Zeitstempel der Anwendung im Format YYYY-MM-DD_hh-mm-ss,
hh = Stunde, mm = Minute, ss = Sekunde
* Umgebung: die Umgebung ist entweder die Produktion oder die local (die lokale Entwicklungsumgebung)
* Diese Daten können zur Buildzeit generiert werden und werden am client angezeigt.

## Anzeige
Es soll einen eigenen Navigationspunkt geben, der für alle sichtbar ist. Wenn diese gewählt wird, dann wird 
ein Dialog sichtbar, in dem die Daten angezeigt werden.