// shared/time-entry.test.ts
import {describe, expect, it} from "vitest";
import {TimeEntryCreateSchema, TimeEntryUpdateSchema} from "./time-entry";

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
    const base = {userId: "275f12fb-e116-4857-9f12-fbe116b857fb", type: "kommen"};

    it("verlangt eine Zeit", () => {
        expect(TimeEntryCreateSchema.safeParse(base).success).toBe(false);
    });

    it("akzeptiert gültige Daten ohne Projekt", () => {
        expect(TimeEntryCreateSchema.safeParse({...base, bookedAt: "2026-06-10T06:00:00Z"}).success).toBe(true);
    });
});
