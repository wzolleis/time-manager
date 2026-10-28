---
name: service
description: Reine Funktionen in shared/, die Werte berechnen und Regeln prüfen. Client und Netlify Functions verwenden dieselben. Lesen, wenn eine Berechnung oder Geschäftsregel entsteht oder sich ändert.
---

# Service

Ein Service berechnet aus Daten einen neuen Wert oder prüft eine Geschäftsregel. Beispiele:

- `dayTotals` berechnet aus den Buchungen die Arbeits- und Pausenzeit eines Tages.
- `checkRange` prüft, ob ein Urlaubszeitraum gültig ist.
- `countWorkdays` zählt die Arbeitstage eines Zeitraums ohne Wochenenden und Feiertage.

Ein [Use Case](use-case.md) ruft den Service im Client auf. Die Netlify Function ruft dieselbe Funktion
noch einmal auf, denn nur die Prüfung auf dem Server ist verbindlich.

## Ablage

Services liegen in `shared/`, eine Datei pro Thema der Domain:

| Datei               | Inhalt                                                              |
|---------------------|---------------------------------------------------------------------|
| `<thema>-rules.ts`  | Regeln und Berechnungen, z. B. `vacation-rules.ts`, `time-rules.ts` |
| `<thema>-report.ts` | Auswertungen für Berichte, z. B. `time-report.ts`                   |
| `<thema>.ts`        | **kein Service**: nur Zod-Schemas und Typen, z. B. `vacation.ts`    |

Feste Werte der Domain stehen als Konstante in derselben Datei wie die Funktionen,
z. B. `VACATION_DAYS_PER_YEAR` oder `DAILY_TARGET_MS`.

## Rein heißt

- **Keine Daten lesen oder schreiben.** Kein `fetch`, keine Datenbank, kein tanstack/query, kein React.
  Alles, was die Funktion braucht, kommt als Parameter, z. B. die Feiertage für `countWorkdays`.
- **Keine aktuelle Zeit.** Kein `new Date()` und kein `Date.now()`. Braucht die Funktion die Zeit,
  bekommt sie `now: Date` als Parameter (siehe `dayTotals`).
- **Tage als Text.** Ein Tag ist ein String `JJJJ-MM-TT` in der Zeitzone Europe/Berlin (`localDay`
  in `time-rules.ts`). Solche Strings lassen sich direkt vergleichen.
- **Keine Seiteneffekte.** Die Funktion ändert ihre Parameter nicht und gibt ein neues Ergebnis zurück.

## Namen und Rückgabewerte

| Präfix              | Rückgabe           | Bedeutung                                                     | Beispiel                                        |
|---------------------|--------------------|---------------------------------------------------------------|-------------------------------------------------|
| `check…`            | `string \| null`   | `null` = gültig, sonst eine deutsche Meldung für den Anwender | `checkRange`, `checkSequence`, `checkYearLimit` |
| `find…`             | Objekt oder `null` | das gesuchte Element, z. B. den Konflikt                      | `findOverlap`, `findMissingGehen`               |
| `is…`               | `boolean`          | einfache Ja/Nein-Frage                                        | `isValidDay`, `isVacationDay`                   |
| `count…`, `…Totals` | Zahl oder Objekt   | berechneter Wert                                              | `countWorkdays`, `dayTotals`                    |
| `…Message`          | `string`           | Meldung zu einem gefundenen Konflikt                          | `overlapMessage`                                |

Die Meldungen aus `check…` und `…Message` sieht der Anwender direkt. Sie sind daher auf Deutsch und
verständlich formuliert.

```ts
/** null = gültig, sonst eine verständliche Fehlermeldung */
export function checkRange(start: string, end: string): string | null {
    if (!isValidDay(start) || !isValidDay(end)) return "Ungültiges Datum";
    if (end < start) return "Das Ende liegt vor dem Beginn"; // ISO-Daten lassen sich als Text vergleichen
    return null;
}
```

## Verletzte Regel auf dem Server

Die Netlify Function wirft bei einer Meldung `RuleError` aus `netlify/functions/lib/rule-error.ts`.
Innerhalb einer Transaktion wird dadurch alles zurückgerollt. Im `catch` wird der Fehler zu 422
mit `{error: <Meldung>}`:

```ts
const problem = checkRange(next.startDate, next.endDate);
if (problem) throw new RuleError(problem);
// …
if (err instanceof RuleError) return ruleViolation(err);
```

Der Client zeigt dann dieselbe Meldung, die er auch selbst berechnet hätte.

## Tests

Jede Datei hat einen Test daneben (`vacation-rules.test.ts`). Weil Services rein sind, braucht der
Test keine Mocks und keine Fake-Timer: Eingabe übergeben, Ergebnis prüfen. Jede `check…`-Funktion
wird mit mindestens einem gültigen und einem ungültigen Fall getestet.

```ts
describe("checkRange", () => {
    it("akzeptiert einen gültigen Zeitraum und einen einzelnen Tag", () => {
        expect(checkRange("2026-06-08", "2026-06-12")).toBeNull();
        expect(checkRange("2026-06-08", "2026-06-08")).toBeNull();
    });
    it("lehnt ein Ende vor dem Beginn ab", () => {
        expect(checkRange("2026-06-12", "2026-06-08")).toBe("Das Ende liegt vor dem Beginn");
    });
});
```
