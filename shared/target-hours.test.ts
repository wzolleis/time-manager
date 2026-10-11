// shared/target-hours.test.ts
import {describe, expect, it} from "vitest";
import {DAILY_TARGET_MS, targetMs, WEEKLY_TARGET_MS} from "./target-hours";
import {weekDays} from "./week";

describe("targetMs", () => {
    it("Montag bis Freitag je 8 Stunden", () => {
        for (const day of ["2026-06-08", "2026-06-09", "2026-06-10", "2026-06-11", "2026-06-12"]) {
            expect(targetMs(day)).toBe(DAILY_TARGET_MS);
        }
    });

    it("am Wochenende 0", () => {
        expect(targetMs("2026-06-13")).toBe(0); // Samstag
        expect(targetMs("2026-06-14")).toBe(0); // Sonntag
    });

    it("eine Woche ergibt 40 Stunden", () => {
        const sum = weekDays("2026-06-10").reduce((s, d) => s + targetMs(d), 0);
        expect(sum).toBe(WEEKLY_TARGET_MS);
        expect(WEEKLY_TARGET_MS).toBe(40 * 3_600_000);
    });
});