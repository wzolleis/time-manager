---
name: use-case
description: Beschreibt eine Aufgabe, die der Anwender mit der Software erledigen möchte, und wie sie im Code als Hook umgesetzt wird.
---

# Use Case

Ein Use Case ist eine Aufgabe, die ein Anwender mit der Software erledigt, formuliert in der Sprache der Domain:

- „Der User sieht seinen Tagesbericht.“
- „Der User trägt einen Urlaub ein.“
- „Der Administrator setzt das Passwort eines Users zurück.“

Der Name beginnt mit einem Verb und nennt das Domain-Objekt: `useShowDailyReport`, `useAddVacation`,
`useResetPassword`. Technische Wörter wie „fetch“, „post“ oder „mutation“ gehören nicht in den Namen.

## Bausteine

Ein Use Case setzt die übrigen Bausteine zusammen. Er verwendet nur die, die er braucht:

| Baustein                    | Aufgabe                                      | Wann im Use Case                         |
|-----------------------------|----------------------------------------------|------------------------------------------|
| [View](views.md)            | Daten lesen (`src/views/`)                   | wenn Daten angezeigt oder geprüft werden |
| [Repository](repository.md) | Daten schreiben (`src/api/` + `useMutation`) | wenn Daten geändert werden               |
| [Service](service.md)       | neue Werte berechnen, Regeln prüfen          | wenn etwas berechnet oder geprüft wird   |

Ein lesender Use Case hat also kein Repository. Ein schreibender Use Case hat eine View nur dann,
wenn er vorhandene Daten für eine Prüfung braucht, etwa für die Überschneidung mit anderen Urlauben.

## Ablage im Code

Jeder Use Case ist ein eigener Hook in einer eigenen Datei im Ordner `use-cases` des Features:

```text
src/features/user/vacations/
├ use-cases/
│ ├ use-add-vacation.ts
│ └ use-delete-vacation.ts
└ components/
  └ vacation-actions.tsx      ruft nur useDeleteVacation() auf
```

Die Komponente kümmert sich nur um die Anzeige. Sie ruft kein `useQuery` und kein `useMutation`
direkt auf, sondern den Hook des Use Case. Dadurch kann man den Use Case ohne Oberfläche testen.
Zeigt eine Komponente Daten nur unverändert an, ohne Berechnung und ohne Schreiben, darf sie die
[View](views.md) direkt aufrufen. Ein eigener Use Case wäre dann nur eine Weiterleitung.

## Fragen zum Use Case

Die Tabelle in [SKILL.md](SKILL.md) listet die Fragen, die für jeden Use Case beantwortet werden.
So landen die Antworten im Code:

- **Wer darf das?** Das prüft der Server über die Rollen (Skill `authorization`). Der Use Case
  prüft keine Rechte. Er zeigt aber die Fehlermeldung bei 403 an.
- **Welche Regeln gelten?** Die Regeln sind Services in `shared/`, z. B. `checkRange` oder
  `findOverlap` in `shared/vacation-rules.ts`. Der Use Case prüft sie vor dem Absenden, damit der
  Anwender sofort eine Rückmeldung bekommt. Die Netlify Function prüft dieselben Regeln noch einmal,
  denn nur die Prüfung auf dem Server ist verbindlich.
- **Was kann schiefgehen?** Der Server antwortet mit einem HTTP-Status und einer Meldung, z. B.
  422 bei einer verletzten Regel oder 409 bei einem Konflikt. Der Use Case gibt den Fehler an die
  Komponente weiter, die ihn anzeigt.
- **Was ist danach wahr?** Das Repository invalidiert die betroffenen Query Keys. Jede View, die
  diese Daten zeigt, lädt sie dann neu.

## Beispiel: lesend

„Der User sieht seinen Tagesbericht.“ Das braucht Views und einen Service, aber kein Repository. (Vereinfacht: der echte
Code wandelt die DTOs noch in Buchungen um.)

```ts
// src/features/user/reports/use-cases/use-show-daily-report.ts
export function useShowDailyReport(userId: string, day: string) {
    const entries = useTimeEntries(userId); // View
    const vacations = useVacations(userId); // View

    const totals = useMemo(
        () => entries.data && dayTotals(entries.data, localDayRange(day), new Date()), // Service
        [entries.data, day],
    );

    return {
        totals,
        vacations: vacations.data,
        isPending: entries.isPending || vacations.isPending,
        error: entries.error ?? vacations.error,
    };
}
```

## Beispiel: schreibend

„Der User trägt einen Urlaub ein.“ Das braucht einen Service für die Regel und ein Repository.

```ts
// src/features/user/vacations/use-cases/use-add-vacation.ts
export function useAddVacation() {
    const qc = useQueryClient();

    const save = useMutation({
        mutationFn: (data: VacationCreate) => createVacation(data),
        onSuccess: () => qc.invalidateQueries({queryKey: ["vacations"]}),
    });

    return {
        problem: (start: string, end: string) => checkRange(start, end), // Service, null = alles in Ordnung
        add: save.mutate,
        isSaving: save.isPending,
        error: save.error,
    };
}
```

## Abgrenzung

- Ein **Service** berechnet nur Werte. Er liest und schreibt keine Daten und kennt weder React noch
  tanstack/query. Den Ablauf steuert der Use Case.
- Ein Use Case ruft keinen anderen Use Case auf. Brauchen zwei Use Cases dieselbe Berechnung,
  gehört sie in einen Service. Brauchen sie dieselben Daten, verwenden beide dieselbe View mit
  demselben Query Key.
