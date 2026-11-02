---
name: optimistic-write-time-entries
description: Stempeln, Nachtragen, Ändern und Löschen einer Buchung erscheinen sofort in der UI, ohne auf den Server zu warten (Optimistic Write). Lehnt der Server ab, springt die Anzeige auf den alten Stand zurück und zeigt den Fehler.
type: change
changes: time-stamp, today-report
epics: zeiterfassung, performance
state: resolved
---

# Optimistic Write für Buchungen

„Der User sieht seine Buchung sofort, nicht erst, wenn der Server geantwortet hat.“

Heute erscheint eine Änderung an den Buchungen erst nach zwei Requests: dem Schreiben und dem Neuladen
aller Buchungen nach `invalidateQueries`. Mit Kaltstart der Function dauert das spürbar, der Dialog
bleibt so lange offen und der Button „Kommen“/„Gehen“ zeigt „Speichern …“.

Grundlage ist der Skill `performance` (`../../.claude/skills/performance/SKILL.md`), Abschnitt
„Schreiben“ → „Optimistic Write“. Dort steht das Muster, dieser Change setzt es zum ersten Mal um, und
zwar nur für Buchungen, weil sie am häufigsten geschrieben werden. Der Skill verlangt die Absprache
mit dem User vor dem Einsatz: Diese Beschreibung ist die Absprache.

## Warum das sicher ist

Die Use Cases prüfen vor dem Absenden schon dieselben Regeln aus `../../shared/time-rules.ts` wie der
Server (`checkSequence`, `findMissingGehen`). Eine Ablehnung (422) ist deshalb selten, sie kommt nur bei
veraltetem Cache (anderes Gerät, MCP-Agent) oder bei Prüfungen vor, die nur der Server kennt
(Fremdschlüssel auf das Projekt, Rechte).

## Umfang

| Use Case | Datei in `../../src/features/reports/use-cases/` | optimistisch |
|----------|--------------------------------------------------|--------------|
| Stempeln | `use-stamp-time.ts`        | ja |
| Buchung nachtragen | `use-add-time-entry.ts` | ja |
| Buchung ändern | `use-change-time-entry.ts` | ja |
| Buchung löschen (auch mit Gegenstück) | `use-delete-time-entry.ts` | ja |
| Zeitraum nachtragen | `use-add-time-entry-day.ts` | nein, der Server legt mehrere Buchungen mit Pause an; bleibt wie heute |
| Überstunden-Offset | `use-change-overtime.ts` | nein, selten genutzt |

Urlaub, Krankmeldung, Feiertage, Projekte und Einstellungen bleiben unverändert.

## Verhalten

1. **Sofort sichtbar:** Nach „Kommen“/„Gehen“ oder „Speichern“ steht die Buchung sofort in der Liste,
   im Status der Stempeluhr und in allen Berichten, die aus `useTimeEntries` rechnen. Ein Dialog
   schließt sofort, nicht erst nach der Antwort.
2. **Vorläufige Buchung:** Eine neue Buchung hat bis zur Antwort eine vorläufige Id
   (`"optimistic-" + crypto.randomUUID()`). Ändern und Löschen sind für sie gesperrt, bis die echte
   Buchung geladen ist. Sonst ginge ein Request mit einer Id an den Server, die es dort nicht gibt.
3. **Ablehnung:** Antwortet der Server mit einem Fehler, wird der alte Stand wiederhergestellt und die
   Meldung des Servers erscheint als Toast (`toast.error`). Der Dialog ist dann schon zu, deshalb nicht
   im Dialog.
4. **Abgleich:** Nach Erfolg oder Fehler werden die Buchungen neu geladen (`invalidateQueries`), damit
   Id, Sekunden und Sortierung vom Server kommen.
5. **401** wird weiter vom `MutationCache` in `../../src/query-client.ts` behandelt. Der alte Stand wird
   trotzdem zurückgesetzt, weil die Buchung nicht gespeichert ist.

## Umsetzung

Muster mit tanstack-query, je Mutation im Use Case:

```ts
const key = ["time-entries", userId];
useMutation({
    mutationKey: ["time-entries"],
    mutationFn: …,
    onMutate: async (input) => {
        await qc.cancelQueries({queryKey: key});
        const previous = qc.getQueryData<TimeEntryDto[]>(key);
        qc.setQueryData<TimeEntryDto[]>(key, (old) => apply(old ?? [], input));
        return {previous};
    },
    onError: (_err, _input, ctx) => qc.setQueryData(key, ctx?.previous),
    onSettled: () => qc.invalidateQueries({queryKey: ["time-entries"]}),
});
```

- **Services für den neuen Stand** in `../../shared/time-rules.ts` (oder neben `toBooking` in
  `../../src/api/time-entries.ts`, falls sie DTOs brauchen): Hinzufügen, Ändern, Löschen mit
  Gegenstück (`findPartner`) als reine Funktionen, sortiert nach `bookedAt`. Dieselbe Funktion bauen
  schon die `problem`-Prüfungen in den Use Cases zusammen; sie werden darauf umgestellt, damit Prüfung
  und Anzeige denselben neuen Stand sehen (Skill `clean-code`, DRY).
- **Gemeinsamer Helfer** für `onMutate`/`onError`/`onSettled`, damit die vier Use Cases das Muster
  nicht viermal wiederholen. Ort nach Skill `ui-modules`.
- **Fehleranzeige als Toast:** shadcn-Komponente Sonner mit `npx shadcn@latest add sonner` aufnehmen
  (legt `../../src/components/ui/sonner.tsx` an und bringt die Dependency `sonner`). `<Toaster />`
  einmal im Root-Layout einbinden. Der Helfer ruft in `onError` `toast.error(err.message)` auf, nicht
  die Komponente, weil der Dialog beim Fehler schon geschlossen und ausgehängt sein kann. Neue
  Dependency: `npm run build` vorher und nachher vergleichen (Skill `performance`, „Dependencies“).
- **Dialoge** (`time-entry-create-dialog.tsx`, `time-entry-actions.tsx` in
  `../../src/features/reports/components/`): schließen direkt nach `mutate`, nicht in `onSuccess`.
- **Stempeluhr:** `isStamping` sperrt den Button nur noch gegen Doppelklick, der neue Status steht
  schon im Cache.

Geändert wird nach dem Skill `architecture` (`../../.claude/skills/architecture`), zuerst
`../../.claude/skills/architecture/use-case.md` und `../../.claude/skills/architecture/repository.md`
lesen.

## Fertig, wenn

- **Service-Tests** für Hinzufügen, Ändern und Löschen (mit und ohne Gegenstück) auf einer Liste von
  Buchungen, inklusive Sortierung.
- **Use-Case-/Komponenten-Tests** mit verzögertem bzw. fehlschlagendem API-Mock: Die Buchung ist vor
  der Antwort sichtbar; bei 422 ist der alte Stand wieder da und die Meldung erscheint als Toast; eine vorläufige
  Buchung lässt sich nicht ändern oder löschen.
- `../../.claude/skills/architecture/repository.md` beschreibt das Muster für Buchungen (der Skill
  `performance` verlangt das); im Skill `performance` heißt der Abschnitt nicht mehr „noch nicht
  umgesetzt“, sondern nennt die Buchungen als ersten Einsatz.
- Gemessen nach Skill `performance`: Zeit von Klick bis sichtbarer Buchung vorher und nachher.
- Typprüfung, Lint und `npx vitest run` laufen durch.
