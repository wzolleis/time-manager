// shared/date-schemas.test.ts
import {describe, expect, it} from "vitest";
import {DaySchema, MonthSchema, TimeOfDaySchema, YearSchema} from "./date-schemas";

const ok = (schema: {safeParse: (v: unknown) => {success: boolean}}, value: unknown) => schema.safeParse(value).success;

describe("DaySchema", () => {
    it("akzeptiert echte Kalenderdaten ab 1970", () => {
        expect(ok(DaySchema, "2026-06-10")).toBe(true);
        expect(ok(DaySchema, "2028-02-29")).toBe(true);
        expect(ok(DaySchema, "1970-01-01")).toBe(true);
    });

    it("lehnt unmögliche Daten, falsche Formate und frühe Jahre ab", () => {
        for (const day of [
            "2026-02-30",
            "2027-02-29",
            "2026-13-01",
            "2026-6-10",
            "10.06.2026",
            "0026-06-10",
            "1969-12-31",
            "",
        ])
            expect(ok(DaySchema, day)).toBe(false);
    });

    it("meldet den Fehler auf Deutsch", () => {
        expect(DaySchema.safeParse("2026-02-30").error?.issues[0].message).toBe("Ungültiges Datum (JJJJ-MM-TT)");
    });
});

describe("TimeOfDaySchema", () => {
    it("akzeptiert HH:mm von 00:00 bis 23:59", () => {
        for (const time of ["00:00", "08:00", "23:59"]) expect(ok(TimeOfDaySchema, time)).toBe(true);
    });

    it("lehnt einstellige Stunden, 24:00 und Sekunden ab", () => {
        for (const time of ["8:00", "24:00", "12:60", "08:00:00", ""]) expect(ok(TimeOfDaySchema, time)).toBe(false);
    });
});

describe("MonthSchema", () => {
    it("akzeptiert JJJJ-MM mit Monat 01 bis 12", () => {
        expect(ok(MonthSchema, "2026-01")).toBe(true);
        expect(ok(MonthSchema, "2026-12")).toBe(true);
    });

    it("lehnt andere Formate ab", () => {
        for (const month of ["2026-00", "2026-13", "2026-1", "2026-10-01"]) expect(ok(MonthSchema, month)).toBe(false);
    });
});

describe("YearSchema", () => {
    it("akzeptiert vierstellige Jahre ab 1970", () => {
        expect(ok(YearSchema, "1970")).toBe(true);
        expect(ok(YearSchema, "2026")).toBe(true);
    });

    it("lehnt frühere Jahre und andere Formate ab", () => {
        for (const year of ["1969", "26", "20266", "2026-01"]) expect(ok(YearSchema, year)).toBe(false);
    });
});
