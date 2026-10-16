// shared/day-range.test.ts
import {describe, expect, it} from "vitest";
import {addDays, isValidDay, localDayRange, localTimeToUtc} from "./day-range";

describe("localDayRange", () => {
    it("Sommer: Mitternacht Berlin ist 22:00 UTC am Vortag", () => {
        const {start, end} = localDayRange("2026-06-10");
        expect(start.toISOString()).toBe("2026-06-09T22:00:00.000Z");
        expect(end.toISOString()).toBe("2026-06-10T22:00:00.000Z");
    });

    it("Winter: Mitternacht Berlin ist 23:00 UTC am Vortag", () => {
        const {start} = localDayRange("2026-01-15");
        expect(start.toISOString()).toBe("2026-01-14T23:00:00.000Z");
    });

    it("Umstellung auf Sommerzeit: der Tag hat 23 Stunden", () => {
        const {start, end} = localDayRange("2026-03-29");
        expect((end.getTime() - start.getTime()) / 3_600_000).toBe(23);
    });

    it("Umstellung auf Winterzeit: der Tag hat 25 Stunden", () => {
        const {start, end} = localDayRange("2026-10-25");
        expect((end.getTime() - start.getTime()) / 3_600_000).toBe(25);
    });

    it("aufeinanderfolgende Tage schließen lückenlos aneinander an", () => {
        expect(localDayRange("2026-06-10").end.getTime()).toBe(localDayRange("2026-06-11").start.getTime());
    });

    describe("localTimeToUtc", () => {
        it("Sommer: 08:00 Berlin ist 06:00 UTC", () => {
            expect(localTimeToUtc("2026-06-10", "08:00").toISOString()).toBe("2026-06-10T06:00:00.000Z");
        });

        it("Winter: 08:00 Berlin ist 07:00 UTC", () => {
            expect(localTimeToUtc("2026-01-15", "08:00").toISOString()).toBe("2026-01-15T07:00:00.000Z");
        });

        it("Umstellung auf Sommerzeit (29.03.2026)", () => {
            expect(localTimeToUtc("2026-03-29", "01:30").toISOString()).toBe("2026-03-29T00:30:00.000Z");
            expect(localTimeToUtc("2026-03-29", "04:00").toISOString()).toBe("2026-03-29T02:00:00.000Z");
        });

        it("Umstellung auf Winterzeit (25.10.2026)", () => {
            expect(localTimeToUtc("2026-10-25", "01:30").toISOString()).toBe("2026-10-24T23:30:00.000Z");
            expect(localTimeToUtc("2026-10-25", "04:00").toISOString()).toBe("2026-10-25T03:00:00.000Z");
        });
    });

    describe("addDays", () => {
        it("rechnet über Monats- und Jahresgrenzen", () => {
            expect(addDays("2026-06-30", 1)).toBe("2026-07-01");
            expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
            expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
        });
    });
});

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
