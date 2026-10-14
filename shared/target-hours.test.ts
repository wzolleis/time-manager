// shared/target-hours.test.ts
import {describe, expect, it} from "vitest";
import {DAILY_TARGET_MS, targetMs, WEEKLY_TARGET_MS} from "./target-hours";
import {weekDays} from "./week";

const weekTarget = (anchor: string, vacations: { startDate: string; endDate: string }[]) =>
    weekDays(anchor).reduce((s, d) => s + targetMs(d, vacations), 0);

describe("targetMs", () => {
    it("Montag bis Freitag je 8 Stunden", () => {
        for (const day of ["2026-06-08", "2026-06-09", "2026-06-10", "2026-06-11", "2026-06-12"]) {
            expect(targetMs(day, [])).toBe(DAILY_TARGET_MS);
        }
    });

    it("am Wochenende 0", () => {
        expect(targetMs("2026-06-13", [])).toBe(0); // Samstag
        expect(targetMs("2026-06-14", [])).toBe(0); // Sonntag
    });

    it("eine Woche ergibt 40 Stunden", () => {
        expect(weekTarget("2026-06-10", [])).toBe(WEEKLY_TARGET_MS);
        expect(WEEKLY_TARGET_MS).toBe(40 * 3_600_000);
    });

    it("an einem Urlaubstag 0, Beginn und Ende zählen mit", () => {
        const vacations = [{startDate: "2026-06-09", endDate: "2026-06-10"}];
        expect(targetMs("2026-06-08", vacations)).toBe(DAILY_TARGET_MS);
        expect(targetMs("2026-06-09", vacations)).toBe(0);
        expect(targetMs("2026-06-10", vacations)).toBe(0);
        expect(targetMs("2026-06-11", vacations)).toBe(DAILY_TARGET_MS);
    });

    it("zwei Urlaubstage senken das Wochensoll auf 24 Stunden", () => {
        const vacations = [{startDate: "2026-06-09", endDate: "2026-06-10"}];
        expect(weekTarget("2026-06-10", vacations)).toBe(24 * 3_600_000);
    });

    it("Urlaub über das Wochenende zählt nur die Arbeitstage", () => {
        // Freitag bis Montag: Freitag und Montag fallen weg, Samstag und Sonntag bleiben 0
        const vacations = [{startDate: "2026-06-12", endDate: "2026-06-15"}];
        expect(weekTarget("2026-06-10", vacations)).toBe(32 * 3_600_000);
        expect(weekTarget("2026-06-17", vacations)).toBe(32 * 3_600_000);
        expect(targetMs("2026-06-13", vacations)).toBe(0);
    });

    it("mehrere Urlaube in einer Woche", () => {
        const vacations = [
            {startDate: "2026-06-08", endDate: "2026-06-08"},
            {startDate: "2026-06-12", endDate: "2026-06-12"},
        ];
        expect(weekTarget("2026-06-10", vacations)).toBe(24 * 3_600_000);
    });
});
