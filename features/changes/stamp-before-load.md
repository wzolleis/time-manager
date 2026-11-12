---
name: stamp-before-load
description: Auf der Seite „Heute“ ist „Kommen“ sofort aktiv, auch wenn die Buchungen noch nicht geladen sind. Lehnt der Server das Kommen ab, zeigt der Optimistic Write den Fehler und danach den geladenen Stand.
type: change
changes: time-stamp
epics: zeiterfassung, performance
state: resolved
---

# Kommen vor dem Laden der Buchungen

„Der User stempelt gleich beim Öffnen der Seite, ohne auf seine Buchungen zu warten.“

## Was ist das Problem

Beim ersten Öffnen der Seite „Heute“ (ohne Buchungen im localStorage) war der Button „Kommen“ gesperrt,
bis die Buchungen geladen waren. Mit Kaltstart der Function dauert das spürbar.

## Was ändert sich

- Solange die Buchungen laden, zeigt die Stempeluhr „Lade Status…“ und den Button „Kommen“, und der Button ist
  aktiv. Gesperrt ist er nur noch bei einem Ladefehler und gegen Doppelklick (`canStamp` in
  `../../src/features/reports/use-cases/use-stamp-time.ts`).
- `optimisticTimeEntries` in `../../src/features/reports/time-entries-cache.ts` rechnet ohne geladene Buchungen
  mit einer leeren Liste. Nach dem Klick steht das Kommen sofort im Cache, die Stempeluhr zeigt „Eingestempelt
  seit …“. Danach lädt `invalidateQueries` die Buchungen vom Server.
- Lehnt der Server ab, z. B. weil der User schon eingestempelt ist oder ein Gehen vom Vortag fehlt
  (`checkSequence`, `findMissingGehen`), erscheint die Meldung als Toast. Der Cache geht zurück auf „nicht
  geladen“ (`resetQueries`), die Buchungen werden neu geladen und die Stempeluhr zeigt den richtigen Stand.
- „Gehen“ gibt es vor dem Laden nicht, der Status ist ja noch unbekannt.

## Tests

In `../../src/features/reports/components/report-daily.test.tsx`, `describe("Optimistic Write")`:

- „stempelt Kommen, bevor die Buchungen geladen sind“
- „nimmt ein Kommen vor dem Laden bei Ablehnung zurück und zeigt die geladenen Buchungen“
