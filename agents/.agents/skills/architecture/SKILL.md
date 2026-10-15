---
name: architektur
description: Wie wir die Software aufbauen. Datenmodelle, lesender und schreibender Datenzugriff, Caching. Die Anzeige der Daten und die Eingabe der Daten in der UI
---

# Architektur

Die Architektur beschreibt den Aufbau der Software und wie wir die Daten lesen und schreiben.
Ausserdem betrachten wir die Eingabe und Anzeige der Daten.
Der Einsatz der Frameworks für das Routing und Laden bzw. Caching der Daten wird beschrieben.

## Use cases first

Das Definieren der Use Cases ist der Kern der Anwendung und definiert wie alles andere zusammen arbeiten kann.
Analysiere genau in der Sprache der Domain, wer möchte was erledigen und definiere
die Komponenten entsprechend er Antwort auf diese Frage.
Wenn die Use Cases sauber definiert sind, ist alles andere nur noch mechanische Codierung durch das Befolgen der Regeln.

Each question about a use case has one component that answers it:

```text
Who wants to do what?                    → use case, command, service       ArchiveAbsenceService
In which states may it happen?           → narrowing find, input state      findActiveAbsenceById, ActiveAbsence
Who may do it?                           → actor flag, who-acts policy      mayEditOthersAbsences
What else must hold? (time, values)      → policy, value constructor        cannotArchiveWhileOngoingPolicy, createPeriod
What must we load to check it?           → required input field             assigneeIsOrganizationMember
What can go wrong?                       → typed domain error, HTTP status  AbsenceOngoingError, 409
What is true afterwards?                 → event and its fields             AbsenceArchivedEvent
Who sees the result?                     → view, visibility rule            AbsenceView, absenceVisibilityFromReader
```

### Rechte und Rollen

Es gibt den Administrationsbereich, die Aktionen dort dürfen nur von Usern in der Rolle "admin" durchgeführt werden.
Es gibt den User-Bereich, die Aktionen dort dürfen von den Usern in der Rolle "user" durchgeführt werden.

## Layout

```text
src/lib             Hilfsfunktionen, die die Verwendung der Frameworks und Bibliotheken erleichtert
shared/             geteilte Logik zwischen Client und Server Modulen (netlify functions). Hier sind die Business-Regeln definiert, da diese oft am Client und Server benötigt werden.
src/features/admin       Die Verzeichnisse unterhalb der Features definieren die Domainen-Objekte, die im Admin-Bereich verwendet werden.
src/features/user   Die Verzeichnisse defineren die Domainen-Objekte (Aggregate), die für einen User relevante sind
src/features/user/vacations/
├ components        Komponenten die für Ansichten der vacations benötigt werden
├ pages             Seiten, die für das Routing benötigt werden. 
├ actions           Definiert Actions, die auf der index-Seite (Dashboard) sichtbar sind.
├api                Definiert den Zugriff auf die Daten, sowohl lesend als auch schreibend. 
                    Jede Datei ist für ein Aggregate in der Domain zuständig. 
                    vacations kümmert sich um das Lesen und Schreiben der Vacations
├application        Definiert das Layout und das Navigationsmenü sowie die Breadcrumb.
├routes             Definiert die Routen in der Anwendung und verwendet das file-basierte Routing von tanstack-router.
├tests              Hier sind die Tests abgelegt, die nicht zu einer einzelnen Komponente passend in deren Verzeichnis definiert werden können.
                    In routes.test.tsx wird getestet, dass es zu jeder Route eine Ansicht gibt und diese auch angezeigt werden kann.
```

## References


