// shared/sick-leave.test.ts
import {describe, expect, it} from "vitest";
import {SickLeaveCreateSchema, SickLeaveUpdateSchema} from "@shared/sick-leave";

const userId = "275f12fb-e116-4857-9f12-fbe116b857fb";

describe("SickLeaveCreateSchema", () => {
    it("akzeptiert gültige Daten mit und ohne Notiz", () => {
        const range = {startDate: "2026-10-14", endDate: "2026-10-16"};
        expect(SickLeaveCreateSchema.safeParse(range).success).toBe(true);
        expect(SickLeaveCreateSchema.safeParse({...range, note: "Attest liegt vor"}).success).toBe(true);
        expect(SickLeaveCreateSchema.safeParse({...range, note: null}).success).toBe(true);
    });

    it("lehnt ein Ende vor dem Beginn ab und nennt das Feld", () => {
        const r = SickLeaveCreateSchema.safeParse({startDate: "2026-10-16", endDate: "2026-10-14"});
        expect(r.success).toBe(false);
        if (!r.success) expect(r.error.issues[0].path).toEqual(["endDate"]);
    });

    it("begrenzt die Notiz auf 500 Zeichen", () => {
        const range = {startDate: "2026-10-14", endDate: "2026-10-14"};
        expect(SickLeaveCreateSchema.safeParse({...range, note: "x".repeat(500)}).success).toBe(true);
        expect(SickLeaveCreateSchema.safeParse({...range, note: "x".repeat(501)}).success).toBe(false);
    });
});

describe("SickLeaveUpdateSchema", () => {
    it("akzeptiert eine Änderung nur der Notiz", () => {
        expect(SickLeaveUpdateSchema.safeParse({note: "Attest nachgereicht"}).success).toBe(true);
    });

    it("lehnt den Wechsel zu einem anderen User ab", () => {
        const r = SickLeaveUpdateSchema.safeParse({userId});
        expect(r.success && "userId" in r.data).toBe(false);
    });
});
