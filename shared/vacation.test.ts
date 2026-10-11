// shared/vacation.test.ts
import {describe, expect, it} from "vitest";
import {VacationCreateSchema, VacationUpdateSchema} from "@shared/vacations.ts";

const userId = "275f12fb-e116-4857-9f12-fbe116b857fb";

describe("VacationCreateSchema", () => {
    it("akzeptiert gültige Daten", () => {
        const r = VacationCreateSchema.safeParse({userId, startDate: "2026-06-08", endDate: "2026-06-12"});
        expect(r.success).toBe(true);
    });

    it("lehnt ein Ende vor dem Beginn ab und nennt das Feld", () => {
        const r = VacationCreateSchema.safeParse({userId, startDate: "2026-06-12", endDate: "2026-06-08"});
        expect(r.success).toBe(false);
        if (!r.success) expect(r.error.issues[0].path).toEqual(["endDate"]);
    });

    it("lehnt ein ungültiges Datum ab", () => {
        expect(
            VacationCreateSchema.safeParse({userId, startDate: "2026-02-30", endDate: "2026-03-02"}).success,
        ).toBe(false);
    });

    it("verlangt beide Daten und den User", () => {
        expect(VacationCreateSchema.safeParse({userId, startDate: "2026-06-08"}).success).toBe(false);
        expect(VacationCreateSchema.safeParse({startDate: "2026-06-08", endDate: "2026-06-09"}).success).toBe(false);
    });
});

describe("VacationUpdateSchema", () => {
    it("akzeptiert eine Änderung nur mit dem Ende", () => {
        expect(VacationUpdateSchema.safeParse({endDate: "2026-06-20"}).success).toBe(true);
    });

    it("akzeptiert eine Änderung nur mit dem Beginn", () => {
        expect(VacationUpdateSchema.safeParse({startDate: "2026-06-01"}).success).toBe(true);
    });

    it("lässt nicht gesendete Felder weg", () => {
        const r = VacationUpdateSchema.parse({endDate: "2026-06-20"});
        expect(Object.keys(r)).toEqual(["endDate"]);
    });

    it("prüft die Reihenfolge, wenn beide Daten gesendet werden", () => {
        expect(
            VacationUpdateSchema.safeParse({startDate: "2026-06-12", endDate: "2026-06-08"}).success,
        ).toBe(false);
    });

    it("lehnt ein ungültiges Datum ab", () => {
        expect(VacationUpdateSchema.safeParse({endDate: "kein-datum"}).success).toBe(false);
    });
});