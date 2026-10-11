// shared/week.test.ts
import {describe, expect, it} from "vitest";
import {isoWeek, startOfWeek, weekDays} from "./week";

describe("startOfWeek", () => {
    it("liefert den Montag", () => {
        expect(startOfWeek("2026-06-10")).toBe("2026-06-08"); // Mittwoch
        expect(startOfWeek("2026-06-08")).toBe("2026-06-08"); // Montag selbst
    });

    it("gehört der Sonntag zur Woche davor", () => {
        expect(startOfWeek("2026-06-07")).toBe("2026-06-01");
    });
});

describe("weekDays", () => {
    it("liefert sieben Tage von Montag bis Sonntag", () => {
        const days = weekDays("2026-06-10");
        expect(days).toHaveLength(7);
        expect(days[0]).toBe("2026-06-08");
        expect(days[6]).toBe("2026-06-14");
    });

    it("rechnet über Monats- und Jahresgrenzen", () => {
        expect(weekDays("2026-12-31")).toEqual([
            "2026-12-28", "2026-12-29", "2026-12-30", "2026-12-31",
            "2027-01-01", "2027-01-02", "2027-01-03",
        ]);
    });
});

describe("isoWeek", () => {
    it("bestimmt die Kalenderwoche", () => {
        expect(isoWeek("2026-06-10")).toEqual({year: 2026, week: 24});
    });

    it("Anfang Januar kann noch zur letzten Woche des Vorjahres gehören", () => {
        expect(isoWeek("2027-01-01")).toEqual({year: 2026, week: 53}); // 2026 hat 53 Wochen
    });

    it("Ende Dezember kann schon zur ersten Woche des Folgejahres gehören", () => {
        expect(isoWeek("2025-12-29")).toEqual({year: 2026, week: 1});
    });
});