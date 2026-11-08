---
name: pull-request-timemanager
description: Welche Checks ein Pull Request im time-manager bekommt (Netlify-Checks und Deploy-Preview) und wann vor dem Merge darauf gewartet wird. Ergänzt den Skill pull-request. Verwenden, wenn der User im time-manager „PR“, „Pull Request“ oder „commit, PR und merge“ sagt.
---

# Pull Request im time-manager

Lade zuerst den Skill `pull-request`. Hier steht nur, was im time-manager zusätzlich gilt.

## Netlify-Checks

Die Checks kommen von der Netlify-GitHub-App: `deploy/netlify`, Header rules, Redirect rules, Pages changed. In
der Branch Protection von `main` sind sie nicht Pflicht, deshalb prüft der Agent sie selbst, wie im Skill
`pull-request` beschrieben. Der Link zur Deploy-Vorschau steht im Check `deploy/netlify`.

„Automatically delete head branches“ ist im Repository an. GitHub löscht den Remote-Branch nach dem Merge.
