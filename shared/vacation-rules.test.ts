// shared/vacation-rules.test.ts
import {describe, expect, it} from "vitest";
import {
    checkRange,
    checkVacation,
    checkYearLimit,
    countVacationDays,
    countWorkdays,
    dayCount,
    findOverlap,
    germanDay,
    isVacationDay,
    overlapMessage,
    VACATION_DAYS_PER_YEAR,
    vacationBalance,
    workdaysInYear,
} from "./vacation-rules";

const v = (id: string, startDate: string, endDate: string) => ({id, startDate, endDate});

describe("dayCount", () => {
    it("zählt Beginn und Ende mit", () => {
        expect(dayCount("2026-06-08", "2026-06-08")).toBe(1);
        expect(dayCount("2026-06-08", "2026-06-12")).toBe(5);
        expect(dayCount("2026-06-01", "2026-06-30")).toBe(30);
    });

    it("ist unabhängig von der Zeitumstellung", () => {
        expect(dayCount("2026-03-28", "2026-03-30")).toBe(3);
        expect(dayCount("2026-10-24", "2026-10-26")).toBe(3);
    });
});

describe("germanDay", () => {
    it("dreht das Datum um", () => {
        expect(germanDay("2026-06-08")).toBe("08.06.2026");
    });
});

describe("checkRange", () => {
    it("akzeptiert einen gültigen Zeitraum und einen einzelnen Tag", () => {
        expect(checkRange("2026-06-08", "2026-06-12")).toBeNull();
        expect(checkRange("2026-06-08", "2026-06-08")).toBeNull();
    });

    it("lehnt ein Ende vor dem Beginn ab", () => {
        expect(checkRange("2026-06-12", "2026-06-08")).toContain("vor dem Beginn");
    });

    it("lehnt ungültige Daten ab", () => {
        expect(checkRange("2026-02-30", "2026-03-02")).toBe("Ungültiges Datum");
    });

    it("begrenzt die Länge auf 366 Tage", () => {
        expect(checkRange("2026-01-01", "2026-12-31")).toBeNull(); // 365 Tage
        expect(checkRange("2026-01-01", "2027-01-02")).toContain("höchstens 366");
    });
});

describe("findOverlap", () => {
    const existing = [v("a", "2026-06-08", "2026-06-12"), v("b", "2026-07-01", "2026-07-10")];

    it("findet eine Überschneidung am Rand", () => {
        expect(findOverlap(existing, v("new", "2026-06-12", "2026-06-15"))?.id).toBe("a"); // letzter Tag
        expect(findOverlap(existing, v("new", "2026-06-01", "2026-06-08"))?.id).toBe("a"); // erster Tag
    });

    it("findet einen Zeitraum, der einen anderen umschließt oder darin liegt", () => {
        expect(findOverlap(existing, v("new", "2026-06-01", "2026-06-30"))?.id).toBe("a");
        expect(findOverlap(existing, v("new", "2026-06-09", "2026-06-10"))?.id).toBe("a");
    });

    it("erlaubt direkt angrenzende Zeiträume ohne gemeinsamen Tag", () => {
        expect(findOverlap(existing, v("new", "2026-06-13", "2026-06-30"))).toBeNull();
        expect(findOverlap(existing, v("new", "2026-06-01", "2026-06-07"))).toBeNull();
    });

    it("vergleicht beim Bearbeiten nicht mit sich selbst", () => {
        expect(findOverlap(existing, v("a", "2026-06-09", "2026-06-20"))).toBeNull();
    });

    it("liefert eine lesbare Meldung", () => {
        expect(overlapMessage(existing[0])).toBe("Überschneidet sich mit dem Urlaub vom 08.06.2026 bis 12.06.2026");
    });
});

describe("countWorkdays", () => {
    it("zählt Montag bis Freitag", () => {
        expect(countWorkdays("2026-06-08", "2026-06-14", [])).toBe(5); // Mo bis So
        expect(countWorkdays("2026-06-10", "2026-06-10", [])).toBe(1); // ein Mittwoch
    });

    it("zählt am Wochenende nichts", () => {
        expect(countWorkdays("2026-06-13", "2026-06-14", [])).toBe(0);
    });

    it("zählt über das Wochenende hinweg", () => {
        expect(countWorkdays("2026-06-12", "2026-06-15", [])).toBe(2); // Fr und Mo
    });
});
describe("isVacationDay", () => {
    const vacations = [v("a", "2026-06-09", "2026-06-10"), v("b", "2026-07-01", "2026-07-01")];

    it("Beginn, Ende und Tage dazwischen gehören dazu", () => {
        expect(isVacationDay("2026-06-09", vacations)).toBe(true);
        expect(isVacationDay("2026-06-10", vacations)).toBe(true);
        expect(isVacationDay("2026-07-01", vacations)).toBe(true);
    });

    it("Tage davor und danach nicht", () => {
        expect(isVacationDay("2026-06-08", vacations)).toBe(false);
        expect(isVacationDay("2026-06-11", vacations)).toBe(false);
    });

    it("ohne Urlaube nie", () => {
        expect(isVacationDay("2026-06-09", [])).toBe(false);
    });
});

describe("vacationBalance", () => {
    const today = "2026-06-10"; // Mittwoch

    it("ohne Urlaub ist das ganze Kontingent ungeplant", () => {
        expect(vacationBalance([], 2026, today, [], [])).toEqual({
            taken: 0,
            planned: 0,
            unplanned: VACATION_DAYS_PER_YEAR,
            over: 0,
        });
    });

    it("trennt genommene und geplante Tage, heute zählt als genommen", () => {
        const vacations = [
            v("a", "2026-03-02", "2026-03-06"), // Mo bis Fr, vorbei: 5
            v("b", "2026-06-08", "2026-06-12"), // läuft: Mo bis Mi genommen, Do und Fr geplant
            v("c", "2026-08-03", "2026-08-16"), // zwei Wochen in der Zukunft: 10
        ];
        expect(vacationBalance(vacations, 2026, today, [], [])).toEqual({
            taken: 8,
            planned: 12,
            unplanned: 10,
            over: 0,
        });
    });

    it("Wochenenden zählen nicht", () => {
        const vacations = [v("a", "2026-06-13", "2026-06-14")]; // Sa und So
        expect(vacationBalance(vacations, 2026, today, [], []).planned).toBe(0);
    });

    it("ein Urlaub über Silvester wird auf beide Jahre aufgeteilt", () => {
        const vacations = [v("a", "2026-12-28", "2027-01-08")]; // Mo 28.12. bis Fr 8.1.
        expect(vacationBalance(vacations, 2026, today, [], []).planned).toBe(4); // 28. bis 31.12.
        expect(vacationBalance(vacations, 2027, today, [], []).planned).toBe(6); // 1. bis 8.1.
    });

    it("Urlaub aus anderen Jahren zählt nicht", () => {
        const vacations = [v("a", "2025-06-02", "2025-06-06")];
        expect(vacationBalance(vacations, 2026, today, [], []).taken).toBe(0);
    });

    it("mehr als 30 Tage: ungeplant bleibt 0, der Überhang wird ausgewiesen", () => {
        const vacations = [v("a", "2026-07-06", "2026-08-21")]; // 7 Wochen = 35 Arbeitstage
        expect(vacationBalance(vacations, 2026, today, [], [])).toEqual({
            taken: 0,
            planned: 35,
            unplanned: 0,
            over: 5,
        });
    });

    it("ein vergangenes Jahr ist vollständig genommen", () => {
        const vacations = [v("a", "2025-12-29", "2025-12-31")];
        expect(vacationBalance(vacations, 2025, today, [], [])).toMatchObject({taken: 3, planned: 0});
    });
});

describe("workdaysInYear", () => {
    it("zählt nur Arbeitstage im Jahr, Urlaub über Silvester anteilig", () => {
        const vacations = [v("a", "2026-06-08", "2026-06-14"), v("b", "2026-12-28", "2027-01-08")];
        expect(workdaysInYear(vacations, 2026, [], [])).toBe(5 + 4);
        expect(workdaysInYear(vacations, 2027, [], [])).toBe(6);
    });
});

describe("checkYearLimit", () => {
    // 25 Arbeitstage: 5 Wochen im Juli/August
    const existing = [v("a", "2026-07-06", "2026-08-07")];

    it("genau 30 Tage sind erlaubt", () => {
        expect(checkYearLimit(existing, v("new", "2026-10-05", "2026-10-09"), [], [])).toBeNull();
    });

    it("mehr als 30 Tage werden abgelehnt, mit Anzahl der freien Tage", () => {
        expect(checkYearLimit(existing, v("new", "2026-10-05", "2026-10-12"), [], [])).toBe(
            "2026 wären es 31 Urlaubstage, erlaubt sind 30 (noch frei: 5)",
        );
    });

    it("Wochenenden zählen nicht zum Kontingent", () => {
        expect(checkYearLimit(existing, v("new", "2026-10-03", "2026-10-11"), [], [])).toBeNull(); // Sa bis So, 5 Arbeitstage
    });

    it("beim Bearbeiten ersetzt der neue Zeitraum den alten", () => {
        // Urlaub a von 25 auf 30 Tage verlängern
        expect(checkYearLimit(existing, v("a", "2026-07-06", "2026-08-14"), [], [])).toBeNull();
        expect(checkYearLimit(existing, v("a", "2026-07-06", "2026-08-17"), [], [])).not.toBeNull();
    });

    it("prüft bei einem Urlaub über Silvester beide Jahre", () => {
        const full2027 = [v("b", "2027-02-01", "2027-03-12")]; // 30 Arbeitstage
        expect(checkYearLimit(full2027, v("new", "2026-12-28", "2027-01-04"), [], [])).toMatch(/^2027 wären es 32/); // Fr 1.1. und Mo 4.1.
    });

    it("Urlaub in anderen Jahren stört nicht", () => {
        const other = [v("b", "2025-01-06", "2025-02-14")]; // 30 Tage in 2025
        expect(checkYearLimit(other, v("new", "2026-01-05", "2026-01-09"), [], [])).toBeNull();
    });

    it("schon überzogene Jahre lassen sich verkleinern, aber nicht vergrößern", () => {
        const over = [v("a", "2026-07-06", "2026-08-21")]; // 35 Tage, z. B. Altdaten
        expect(checkYearLimit(over, v("a", "2026-07-06", "2026-08-18"), [], [])).toBeNull(); // 32 Tage
        expect(checkYearLimit(over, v("a", "2026-07-06", "2026-08-24"), [], [])).not.toBeNull(); // 36 Tage
    });
});

describe("Feiertage im Urlaub", () => {
    const today = "2026-06-10";
    const holidays = [{date: "2026-10-02"}]; // Freitag

    it("zählen nicht als Arbeitstage", () => {
        expect(countWorkdays("2026-09-28", "2026-10-04", holidays)).toBe(4);
    });

    it("verbrauchen keinen Urlaubstag", () => {
        const vacations = [v("a", "2026-09-28", "2026-10-02")];
        expect(vacationBalance(vacations, 2026, today, holidays, [])).toMatchObject({planned: 4, unplanned: 26});
        expect(workdaysInYear(vacations, 2026, holidays, [])).toBe(4);
    });

    it("werden bei der 30-Tage-Grenze berücksichtigt", () => {
        // 25 Arbeitstage plus eine Woche mit Feiertag = 29, also noch erlaubt
        const existing = [v("a", "2026-07-06", "2026-08-07")];
        expect(checkYearLimit(existing, v("new", "2026-09-28", "2026-10-02"), holidays, [])).toBeNull();
        expect(checkYearLimit(existing, v("new", "2026-09-28", "2026-10-02"), [], [])).toBeNull(); // genau 30
        expect(checkYearLimit(existing, v("new", "2026-09-28", "2026-10-05"), holidays, [])).toBeNull(); // 30
        expect(checkYearLimit(existing, v("new", "2026-09-28", "2026-10-05"), [], [])).not.toBeNull(); // 31
    });
});

describe("Krankheit im Urlaub", () => {
    const today = "2026-06-10";
    const vacations = [v("a", "2026-10-12", "2026-10-23")]; // 10 Urlaubstage
    const sick = [{startDate: "2026-10-14", endDate: "2026-10-16"}]; // 3 Krankheitstage

    it("verbraucht keinen Urlaubstag", () => {
        expect(countVacationDays("2026-10-12", "2026-10-23", [], sick)).toBe(7);
        expect(workdaysInYear(vacations, 2026, [], sick)).toBe(7);
        expect(vacationBalance(vacations, 2026, today, [], sick)).toMatchObject({planned: 7, unplanned: 23});
    });

    it("wird bei der 30-Tage-Grenze berücksichtigt", () => {
        const existing = [v("b", "2026-07-06", "2026-08-07")]; // 25 Arbeitstage
        const candidate = v("new", "2026-10-12", "2026-10-19"); // 6 Arbeitstage, davon 3 krank
        expect(checkYearLimit(existing, candidate, [], [])).not.toBeNull(); // 31
        expect(checkYearLimit(existing, candidate, [], sick)).toBeNull(); // 28
    });
});

describe("checkVacation", () => {
    const existing = [v("a", "2026-07-06", "2026-08-07")]; // 25 Arbeitstage

    it("akzeptiert einen freien Zeitraum innerhalb des Jahresurlaubs", () => {
        expect(checkVacation(existing, v("new", "2026-10-05", "2026-10-09"), [], [])).toBeNull();
    });

    it("meldet zuerst einen ungültigen Zeitraum, dann eine Überschneidung, dann den Jahresurlaub", () => {
        expect(checkVacation(existing, v("new", "2026-08-07", "2026-08-03"), [], [])).toBe(
            "Das Ende liegt vor dem Beginn",
        );
        expect(checkVacation(existing, v("new", "2026-08-03", "2026-10-30"), [], [])).toBe(overlapMessage(existing[0]));
        expect(checkVacation(existing, v("new", "2026-10-05", "2026-10-12"), [], [])).toContain("erlaubt sind 30");
    });

    it("vergleicht einen bearbeiteten Urlaub nicht mit sich selbst", () => {
        expect(checkVacation(existing, v("a", "2026-07-06", "2026-08-03"), [], [])).toBeNull();
    });
});
