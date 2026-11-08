---
name: clean-code-timemanager
description: Der jscpd-Befehl des time-managers und Beispiele aus dem Projekt, wann Code zusammengelegt wird und wann nicht. Ergänzt den Skill clean-code. Verwenden beim Implementieren, beim Refactoring, im Review und vor jedem Commit im time-manager.
---

# Clean Code im time-manager

Lade zuerst den Skill `clean-code`. Hier steht nur, was im time-manager zusätzlich gilt.

## Duplikate suchen

```sh
npx -y jscpd@4 src shared netlify db scripts --ignore "**/routeTree.gen.ts,**/components/ui/**,**/migrations/**,**/*.test.ts,**/*.test.tsx" --min-tokens 50 --reporters console
```

Vorhandenes liegt außer in `shared/`, `src/lib/` und `src/components/` auch in `netlify/functions/lib/`.

## Beispiele aus dem Projekt

Zusammengelegt:

- `readBody` und `errorResponse` in `netlify/functions/lib/http.ts` statt einer Kopie pro Function
- `DateRangeFields` in `src/components/form/date-range-fields.tsx` für die Dialoge von Urlaub und Krankmeldung
- die Spalten der Berichte in `src/features/reports/components/report-columns.tsx`

Bewusst nicht zusammengelegt:

- Use-Case-Paare wie `use-add-vacation` und `use-change-vacation`
- die Registrierung der MCP-Tools und gleich aufgebaute Spalten in `db/schema.ts`

Randfall als Beispiel: ein Token läuft über die Zeitumstellung.
