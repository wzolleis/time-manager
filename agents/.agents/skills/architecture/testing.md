---
name: testing
description: Wann sich ein Test lohnt, auf welcher Ebene er hingehört und wie Tests im Projekt geschrieben werden (vitest, Testing Library, gemocktes fetch). Lesen, bevor ein Test hinzugefügt oder geändert wird.
---

# Testing

Ein Test ist Code, der dauerhaft gepflegt wird. Jede spätere Änderung am getesteten Code muss ihn grün
halten, ihn lesen und ihn anpassen. Ein Test kommt nur dazu, wenn er diesen Aufwand wert ist.
**Keinen Test hinzuzufügen ist ein gültiges Ergebnis.**

## Bevor ein Test entsteht

Beantworte diese Fragen:

1. **Welcher plausible Fehler kommt ohne den Test durch?** Gemeint ist ein Fehler, der bei einer
   realistischen Änderung passieren kann, nicht jeder denkbare.
2. **Warum fangen die Typen ihn nicht schon ab?** TypeScript erkennt vieles ohne Test: Union-Typen
   für Zustände (`DayKind`), `switch` über eine Union, die mit `never` alle Fälle erzwingt, Pflichtfelder
   in Zod-Schemas und Parametern. Was der Compiler abfängt, braucht keinen Test.
3. **Was kostet der Test in der Pflege?** Testdaten, gemockte Endpoints, Rendern ganzer Seiten.
   Je mehr davon nötig ist, desto stärker muss die Antwort auf Frage 1 sein.

Ein Test prüft **eine Aussage**, und zwar auf der **tiefsten Ebene, der die Regel gehört**.
Bevor du ihn behältst: Brich die Regel im Code absichtlich und sieh zu, wie der Test fehlschlägt.
Schlägt er nicht fehl, prüft er nichts.

## Auf welcher Ebene?

| Was wird geprüft?                                | Ebene                          | Test liegt in |
|--------------------------------------------------|--------------------------------|---------------|
| Regel oder Berechnung (Urlaub, Buchungen, Soll)  | [Service](service.md)          | `shared/<thema>.test.ts` |
| Schema: was ist gültig, was nicht                | Zod-Schema                     | `shared/<aggregat>.test.ts` |
| Hilfsfunktion auf dem Server (Pfade, IDs, Rollen)| `netlify/functions/lib/`       | `netlify/functions/lib/<name>.test.ts` |
| Formatierung für die Anzeige                     | `src/lib/`                     | `src/lib/<name>.test.ts` |
| Bedienung: Klick, Eingabe, Anzeige von Fehlern   | Komponente                     | neben der Komponente, `*.test.tsx` |
| Jede Route lässt sich anzeigen                   | Routing                        | `src/tests/routes.test.tsx` |
| Endpoint mit Datenbank, Rechte, HTTP-Status      | Netlify Function               | `scripts/api-walkthrough.sh` gegen `npm run dev:test` |

- **Regeln gehören in den Service-Test**, nicht in den Komponenten-Test. Die Komponente prüft nur,
  dass die Meldung des Service angezeigt wird, nicht jeden Fall der Regel.
- **Netlify Functions haben keine Unit-Tests.** Sie brauchen die Datenbank. Ihr Verhalten
  (Statuscodes, Rechte, Regeln auf dem Server) prüft der API-Walkthrough. Läuft eine neue Logik in
  einer Function ohne DB, gehört sie als Funktion nach `lib/` und bekommt dort ihren Test.
- **Der Walkthrough läuft gegen die Testdatenbank.** `npm run dev:test` startet `netlify dev` auf
  Port 8889 mit `time_manager_test`, das ist der Standard von `scripts/api-walkthrough.sh`. Nie gegen
  die Produktion (`features/boundaries/local-environment.md`).

## Wie Tests geschrieben werden

Werkzeuge: vitest, für Komponenten `@testing-library/react` mit jsdom. Ausführen mit `npm run test:run`.

### Service

Ohne Mocks und ohne Fake-Timer: Eingabe übergeben, Ergebnis prüfen. Die aktuelle Zeit kommt als
Parameter. Beispiele in [service.md](service.md).

### Komponente

```tsx
// @vitest-environment jsdom
afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

function mockApi() {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
        const {pathname} = new URL(String(input), "http://localhost");
        if (pathname === "/api/roles") return Response.json([ADMIN, USER_ROLE]);
        return Response.json({error: `Nicht gemockt: ${pathname}`}, {status: 404});
    }));
}

function renderDialog() {
    const queryClient = new QueryClient({defaultOptions: {queries: {retry: false}}});
    render(<QueryClientProvider client={queryClient}><UserRolesDialog user={USER}/></QueryClientProvider>);
}
```

- **`fetch` mocken, nicht die API-Funktionen.** So laufen `request`, `ApiError` und tanstack/query
  echt mit. Ein nicht gemockter Pfad antwortet mit 404 und einer Meldung, die den Pfad nennt.
- **Neuer `QueryClient` pro Test mit `retry: false`.** Sonst teilen sich Tests den Cache, und
  Fehlerfälle warten auf Wiederholungen.
- **Suchen wie der Anwender:** `getByRole`, `getByLabelText`, `findByText`. Keine CSS-Klassen und
  keine Test-IDs.
- **Fehlerfall testen,** wenn die Komponente eine Fehlermeldung anzeigt: Der Mock antwortet mit
  4xx und `{error: "…"}`, der Test erwartet den Text in `role="alert"`.
- **Gesendete Daten prüfen** über die Aufrufe des fetch-Mocks (Methode, Pfad, Body), nicht über
  interne Zustände der Komponente.

### Namen

`describe` nennt die Funktion oder Komponente, `it` beschreibt das Verhalten auf Deutsch als Satz:
`it("lehnt ein Ende vor dem Beginn ab")`.
