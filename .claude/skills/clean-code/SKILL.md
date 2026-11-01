---
name: clean-code
description: Welche Clean-Code-Regeln wir anwenden (DRY und KISS) und wie, mit Beispielen aus dem Projekt. Verwenden beim Implementieren, beim Refactoring, im Review und vor jedem Commit, und immer, wenn ähnlicher Code entsteht oder eine Abstraktion naheliegt.
---

# Clean Code

Wir wenden zwei Prinzipien an: DRY und KISS (Quelle: https://clean-code-developer.de).
Bei einem Konflikt gilt: **Lesbarkeit vor KISS vor DRY.** Lieber zwei einfache, ähnliche Stellen als eine
schwer verständliche gemeinsame.

# DRY – Don't Repeat Yourself

DRY heißt: Jedes Wissen (eine Regel, eine Berechnung, ein Ablauf) steht an genau einer Stelle. Es heißt nicht,
dass ähnlich aussehende Zeilen immer zusammengelegt werden.

Vor dem Implementieren:

1. Nach Vorhandenem suchen, in `shared/` (Regeln, Berechnungen, Format), `src/lib/`, `src/components/` und
   `netlify/functions/lib/`. Wo was liegt, beschreiben die Skills `ui-modules`, `shared-modules` und
   `backend-modules`.
2. Bei Verdacht auf Duplikate jscpd laufen lassen:
   ```sh
   npx -y jscpd@4 src shared netlify db scripts --ignore "**/routeTree.gen.ts,**/components/ui/**,**/migrations/**,**/*.test.ts,**/*.test.tsx" --min-tokens 50 --reporters console
   ```

Zusammenlegen, wenn die Stellen aus demselben fachlichen Grund gleich sind und sich nur gemeinsam ändern:

- `readBody` und `errorResponse` in `netlify/functions/lib/http.ts` statt einer Kopie pro Function
- `DateRangeFields` in `src/components/form/date-range-fields.tsx` für die Dialoge von Urlaub und Krankmeldung
- die Spalten der Berichte in `src/features/reports/components/report-columns.tsx`

Nicht zusammenlegen, wenn die Ähnlichkeit zufällig ist oder eine Regel die Trennung verlangt:

- Use-Case-Paare wie `use-add-vacation` und `use-change-vacation`: eine Datei pro Use Case (`ui-modules`)
- die Registrierung der MCP-Tools und gleich aufgebaute Spalten in `db/schema.ts`
- Stellen, die erst durch Parameter und Fallunterscheidungen gleich würden

# KISS – Keep It Simple, Stupid

Die einfachste lesbare Lösung, die die Anforderung erfüllt. Anzeichen für unnötige Komplexität:

- eine Abstraktion, ein Hook oder eine Komponente mit nur einem Aufrufer
- Parameter oder Optionen für Fälle, die es noch nicht gibt
- eigener Code, wo es schon eine Funktion in `shared/` oder eine Bibliothek im Projekt gibt (Temporal, `cn`, zod)
- ein Umbau, der nichts vereinfacht, z. B. Dauern mit Temporal statt in Millisekunden zu rechnen

## Randfälle

Ein sehr unwahrscheinlicher Randfall, der den Code deutlich komplizierter machen würde, wird nie still
ignoriert. Stattdessen dem User nennen:

1. den Randfall (z. B. ein Token läuft über die Zeitumstellung),
2. die Folge (wer merkt was, wie oft, wie schlimm),
3. den Aufwand für die Lösung,

und fragen, ob er behandelt wird. Die Entscheidung kommt in einen Kommentar an der Stelle oder in die
Beschreibung unter `features/`.

# Prüfung vor dem Commit

- Gibt es neuen Code, der Vorhandenes nachbaut? Dann das Vorhandene verwenden.
- Gibt es neue Abstraktionen mit nur einem Aufrufer? Dann wieder inline schreiben.
- Wurde ein Randfall bewusst weggelassen? Dann ist er mit dem User abgesprochen und dokumentiert.
