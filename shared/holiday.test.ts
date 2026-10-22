// shared/holiday.test.ts
import {describe, expect, it} from "vitest";
import {HolidayCreateSchema, HolidayUpdateSchema} from "./holiday";

const userId = "275f12fb-e116-4857-9f12-fbe116b857fb";

describe("HolidayCreateSchema", () => {
    it("akzeptiert Datum und Namen", () => {
        expect(HolidayCreateSchema.safeParse({date: "2026-10-03", name: "Einheit"}).success).toBe(true);
    });

    it("übernimmt keine userId aus dem Body, der User steht im Pfad", () => {
        const r = HolidayCreateSchema.parse({userId, date: "2026-10-03", name: "Einheit"});
        expect("userId" in r).toBe(false);
    });

    it("lehnt ein ungültiges Datum und einen leeren Namen ab", () => {
        expect(HolidayCreateSchema.safeParse({date: "2026-02-30", name: "X"}).success).toBe(false);
        expect(HolidayCreateSchema.safeParse({date: "2026-10-03", name: "   "}).success).toBe(false);
    });

    it("entfernt Leerzeichen am Rand des Namens", () => {
        const r = HolidayCreateSchema.parse({date: "2026-10-03", name: "  Einheit "});
        expect(r.name).toBe("Einheit");
    });
});

describe("HolidayUpdateSchema", () => {
    it("akzeptiert einzelne Felder", () => {
        expect(HolidayUpdateSchema.safeParse({name: "Neu"}).success).toBe(true);
        expect(HolidayUpdateSchema.safeParse({date: "2026-10-04"}).success).toBe(true);
    });

    it("lässt die userId nicht ändern", () => {
        const r = HolidayUpdateSchema.parse({name: "Neu", userId});
        expect(r).toEqual({name: "Neu"});
    });
});
