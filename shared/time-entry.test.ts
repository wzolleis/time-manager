// shared/time-entry.test.ts
import {describe, expect, it} from "vitest";
import {TimeEntryCreateSchema, TimeEntryDayCreateSchema, TimeEntryUpdateSchema} from "./time-entry";

describe("TimeEntryUpdateSchema", () => {
    it("akzeptiert eine Änderung nur mit projectId", () => {
        const r = TimeEntryUpdateSchema.safeParse({projectId: "0effae8f-a1cb-49fd-ac9e-fbf53bb844b6"});
        expect(r.success).toBe(true);
    });

    it("akzeptiert projectId null", () => {
        expect(TimeEntryUpdateSchema.safeParse({projectId: null}).success).toBe(true);
    });

    it("akzeptiert eine Änderung nur mit bookedAt", () => {
        expect(TimeEntryUpdateSchema.safeParse({bookedAt: "2026-06-10T06:00:00Z"}).success).toBe(true);
    });

    it("lässt nicht gesendete Felder weg", () => {
        const r = TimeEntryUpdateSchema.parse({projectId: null});
        expect(Object.keys(r)).toEqual(["projectId"]);
    });

    it("ignoriert einen geänderten Typ", () => {
        const r = TimeEntryUpdateSchema.parse({type: "gehen", projectId: null});
        expect(Object.keys(r)).toEqual(["projectId"]);
    });

    it("lehnt eine ungültige Zeit ab", () => {
        expect(TimeEntryUpdateSchema.safeParse({bookedAt: "kein-datum"}).success).toBe(false);
    });
});

describe("TimeEntryCreateSchema", () => {
    const base = {type: "kommen"};

    it("verlangt eine Zeit", () => {
        expect(TimeEntryCreateSchema.safeParse(base).success).toBe(false);
    });

    it("akzeptiert gültige Daten ohne Projekt", () => {
        expect(TimeEntryCreateSchema.safeParse({...base, bookedAt: "2026-06-10T06:00:00Z"}).success).toBe(true);
    });
});

describe("TimeEntryDayCreateSchema", () => {
    const base = {day: "2026-06-10", start: "08:00", workMinutes: 480};

    it("akzeptiert einen ganzen Tag ohne und mit Projekt", () => {
        expect(TimeEntryDayCreateSchema.safeParse(base).success).toBe(true);
        expect(
            TimeEntryDayCreateSchema.safeParse({...base, projectId: "0effae8f-a1cb-49fd-ac9e-fbf53bb844b6"}).success,
        ).toBe(true);
    });

    it("verlangt den Beginn als HH:mm", () => {
        expect(TimeEntryDayCreateSchema.safeParse({...base, start: "8 Uhr"}).success).toBe(false);
    });

    it("lehnt eine Arbeitszeit von 0 oder weniger ab", () => {
        expect(TimeEntryDayCreateSchema.safeParse({...base, workMinutes: 0}).success).toBe(false);
        expect(TimeEntryDayCreateSchema.safeParse({...base, workMinutes: -60}).success).toBe(false);
    });

    it("lehnt einen ungültigen Tag ab", () => {
        expect(TimeEntryDayCreateSchema.safeParse({...base, day: "2026-02-30"}).success).toBe(false);
    });
});
