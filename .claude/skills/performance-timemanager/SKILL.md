---
name: performance-timemanager
description: Messung, Optimistic Write für Buchungen, Datenbank-Pool, bevorzugte Pakete und Ladezeit beim Start im time-manager. Ergänzt den Skill performance. Verwenden bei Zugriffen auf das Backend (Views, Use Cases, Netlify Functions, SQL), bei neuen Dependencies, bei Änderungen an Vite oder TypeScript und wenn der User im time-manager meldet, dass etwas langsam ist.
---

# Performance im time-manager

Lade zuerst den Skill `performance`. Hier steht nur, was im time-manager zusätzlich gilt.

## Messen

Jede Function ist mit `withTiming` umhüllt (`netlify/functions/lib/timing.ts`). Sie schreibt eine Log-Zeile und
den Header `Server-Timing`.

## Lesen

- **Berichte rechnen im Client.** `useTimeEntries` lädt alle Buchungen des Users auf einmal, die Berichte rechnen
  daraus mit `useMemo` (`src/features/reports/use-report-data.ts`). Der Wechsel von Woche, Monat oder Jahr braucht
  keinen neuen Request. Das Laden nach Zeitraum ist noch offen.
- Der Router lädt Routen noch nicht vor (`defaultPreload` fehlt in `createRouter` in `src/main.tsx`).

## Optimistic Write

Umgesetzt nur für Buchungen (Stempeln, Zeitstempel nachtragen, Ändern, Löschen), siehe
`features/changes/optimistic-write-time-entries.md` und `src/features/reports/time-entries-cache.ts`.

- Regeln vor dem Absenden, z. B. `checkVacation`, `checkSequence`. Der Server ist auch über MCP und REST erreichbar.
- Fehler als Toast über `notifyError` aus `src/lib/notify.ts` (`<Toaster />` in `application-layout.tsx`). Sonner
  nicht direkt importieren.

## Backend

- Der Pool hat **eine** Verbindung (`connectionLimit: 1` in `netlify/functions/lib/db.ts`). Abfragen laufen
  nacheinander, auch mit `Promise.all`.
- Transaktionen sperren mit `lockUser` die Zeile des Users.

## Dependencies

Vorhandene Pakete: Temporal, zod, `cn`, shadcn mit `radix-ui`, Sonner für Toasts. Radix Themes wurde entfernt und
kommt nicht wieder: Es lädt seine ganze CSS und bringt ein zweites Design-System neben Tailwind.

## Ladezeit beim Start

1. Der Browser lädt `index.html`, den Haupt-Chunk und das CSS. Stand 02.11.2026: JavaScript 492 kB
   (155 kB gzip), CSS 60 kB (11 kB gzip). Sonner mit `next-themes` brachte davon 36 kB (10 kB gzip).
2. Der Cache aus dem localStorage steht sofort zur Verfügung, gespeicherte Daten erscheinen ohne Request.
3. Der angemeldete User (`/api/auth/me`) wird nie aus dem Cache genommen, sondern immer beim Server erfragt.
   Bis zur Antwort zeigt `UserProvider` „Laden“.
4. Die Seite der Route wird als eigener Chunk nachgeladen (Code-Splitting mit `autoCodeSplitting`).
