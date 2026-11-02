---
name: performance
description: Was wir unter Performance verstehen (die vom User wahrgenommene Antwortzeit), wie wir sie messen und welche Mittel wir einsetzen. Verwenden bei lesenden und schreibenden Zugriffen auf das Backend (Views, Use Cases, Netlify Functions, SQL), beim Aufnehmen einer neuen Dependency oder einer neuen Version einer Dependency, bei Änderungen an der Konfiguration von Vite oder TypeScript und wenn der User meldet, dass etwas langsam ist.
---

# Ziel

Im Vordergrund steht die vom User wahrgenommene Antwortzeit: wie schnell eine Seite erscheint und wie schnell
eine Änderung sichtbar wird. Optimiert wird nur nach einer Messung, nicht auf Verdacht.

Cache, `staleTime` und Invalidierung sind im Skill `architecture` beschrieben (`views.md`, `repository.md`).
Dieser Skill wiederholt sie nicht, sondern sagt, was davon für die Performance wichtig ist.

# Messen

- **Backend:** Jede Function ist mit `withTiming` umhüllt (`netlify/functions/lib/timing.ts`). Sie schreibt eine
  Log-Zeile und den Header `Server-Timing` mit der Gesamtzeit, dem Kaltstart (`cold`) und jedem SQL-Schritt.
  Im Browser unter DevTools → Network → Timing zu sehen.
- **Frontend:** `npm run build` zeigt die Größe jedes Chunks, roh und mit gzip. Bei Änderungen an Dependencies
  oder an der Konfiguration die Ausgabe vorher und nachher vergleichen.

# Lesen

- **Cache statt Prefetching.** Daten gelten 5 Minuten als frisch und liegen einen Tag im localStorage. Eine
  besuchte Seite erscheint beim nächsten Mal sofort. Kein eigenes Prefetching von Daten einbauen.
- **Berichte rechnen im Client.** `useTimeEntries` lädt alle Buchungen des Users auf einmal, die Berichte rechnen
  daraus mit `useMemo` (`src/features/reports/use-report-data.ts`). Der Wechsel von Woche, Monat oder Jahr braucht
  deshalb keinen neuen Request.
- **Grenze:** Mit vielen Jahren an Buchungen wird „alles laden“ selbst langsam. Dann müssen die Buchungen nach
  Zeitraum geladen werden. Das ist noch offen und wird nur nach Absprache mit dem User umgestellt.
- **Möglicher nächster Schritt:** Der Router lädt Routen noch nicht vor. Mit `defaultPreload: "intent"` in
  `createRouter` (`src/main.tsx`) würde der Chunk einer Seite schon beim Hover über einen Link geladen.

# Schreiben

Heute gilt `repository.md`: Nach dem Schreiben werden die betroffenen Daten mit `invalidateQueries` ungültig
gemacht und neu geladen. Die Änderung erscheint, sobald der Server geantwortet hat.

## Optimistic Write (noch nicht umgesetzt)

Die UI zeigt die Änderung sofort und wartet nicht auf den Server. Das gibt es noch nicht im Code und wird noch
verfeinert. **Nur nach Absprache mit dem User einsetzen.**

- Die UI prüft vor dem Absenden dieselben Regeln aus `shared/` wie der Server (z. B. `checkVacation`,
  `checkSequence`). Der Server prüft sie noch einmal, weil das Backend auch über MCP und REST erreichbar ist.
  Eine Ablehnung (422) ist deshalb selten. Sie kommt vor, wenn der Cache veraltet ist (ein anderes Gerät oder
  ein Agent hat inzwischen geändert) oder bei Prüfungen, die nur der Server kennt (Unique-Index,
  Fremdschlüssel, Rechte).
- Muster mit tanstack-query: `onMutate` hält laufende Abfragen an (`cancelQueries`), merkt sich den alten
  Stand und setzt den neuen (`setQueryData`). `onError` stellt den alten Stand wieder her und zeigt den Fehler.
  `onSettled` lädt die Daten neu (`invalidateQueries`).
- Wird es eingeführt, muss `architecture/repository.md` mitgeändert werden.

# Backend

- Der Pool hat **eine** Verbindung (`connectionLimit: 1` in `netlify/functions/lib/db.ts`). Abfragen laufen
  nacheinander, auch mit `Promise.all`. Weniger Abfragen sind deshalb schneller als parallele.
- Keine Abfrage pro Element in einer Schleife (N+1), sondern eine Abfrage mit `inArray`.
- Transaktionen kurz halten: Sie sperren mit `lockUser` die Zeile des Users.
- Kaltstarts gibt es, sie stehen im `Server-Timing` als `cold`.

# Dependencies

Beim Aufnehmen einer neuen Dependency oder einer neuen Version einer Dependency:

- `npm run build` vorher und nachher vergleichen: Wird der Haupt-Chunk oder das CSS deutlich größer?
- Keine zweite Bibliothek für dasselbe Thema, z. B. kein Luxon neben Temporal.
- Vorhandene Pakete bevorzugen (Temporal, zod, `cn`, shadcn mit `radix-ui`). Radix Themes wurde entfernt und
  kommt nicht wieder: Es lädt seine ganze CSS und bringt ein zweites Design-System neben Tailwind.

# Ladezeit beim Start

Der heutige Ablauf beim Öffnen der App:

1. Der Browser lädt `index.html`, den Haupt-Chunk und das CSS. Stand 02.11.2026: JavaScript 456 kB
   (145 kB gzip), CSS 60 kB (11 kB gzip).
2. Der Cache aus dem localStorage steht sofort zur Verfügung, gespeicherte Daten erscheinen ohne Request.
3. Der angemeldete User (`/api/auth/me`) wird nie aus dem Cache genommen, sondern immer beim Server erfragt.
   Bis zur Antwort zeigt `UserProvider` „Laden“.
4. Die Seite der Route wird als eigener Chunk nachgeladen (Code-Splitting mit `autoCodeSplitting`).
