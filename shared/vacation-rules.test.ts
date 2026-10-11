// shared/vacation-rules.test.ts
import {describe, expect, it} from "vitest";
import {
    checkRange,
    countWorkdays,
    dayCount,
    findOverlap,
    germanDay,
    isValidDay,
    overlapMessage,
} from "./vacation-rules";

const v = (id: string, startDate: string, endDate: string) => ({id, startDate, endDate});

describe("isValidDay", () => {
    it("akzeptiert echte Kalenderdaten", () => {
        expect(isValidDay("2026-06-10")).toBe(true);
        expect(isValidDay("2028-02-29")).toBe(true); // Schaltjahr
    });

    it("lehnt unmögliche Daten und falsche Formate ab", () => {
        expect(isValidDay("2026-02-30")).toBe(false);
        expect(isValidDay("2026-13-01")).toBe(false);
        expect(isValidDay("2027-02-29")).toBe(false); // kein Schaltjahr
        expect(isValidDay("10.06.2026")).toBe(false);
        expect(isValidDay("0050-01-01")).toBe(false);
        expect(isValidDay("")).toBe(false);
    });
});

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
        expect(overlapMessage(existing[0])).toBe(
            "Überschneidet sich mit dem Urlaub vom 08.06.2026 bis 12.06.2026",
        );
    });
});

describe("countWorkdays", () => {
    it("zählt Montag bis Freitag", () => {
        expect(countWorkdays("2026-06-08", "2026-06-14")).toBe(5); // Mo bis So
        expect(countWorkdays("2026-06-10", "2026-06-10")).toBe(1); // ein Mittwoch
    });

    it("zählt am Wochenende nichts", () => {
        expect(countWorkdays("2026-06-13", "2026-06-14")).toBe(0);
    });

    it("zählt über das Wochenende hinweg", () => {
        expect(countWorkdays("2026-06-12", "2026-06-15")).toBe(2); // Fr und Mo
    });
});