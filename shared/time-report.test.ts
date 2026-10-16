// shared/time-report.test.ts
import {describe, expect, it} from "vitest";
import {localDayRange} from "./day-range";
import {dayTotals} from "./time-report";
import type {Booking} from "./time-rules";

const b = (id: string, type: Booking["type"], iso: string): Booking => ({
    id,
    type,
    bookedAt: new Date(iso),
});
const HOUR = 3_600_000;
const day = localDayRange("2026-06-10"); // 22:00Z bis 22:00Z

const workday = [
    b("1", "kommen", "2026-06-10T06:00:00Z"), // 08:00
    b("2", "gehen", "2026-06-10T10:00:00Z"), // 12:00
    b("3", "kommen", "2026-06-10T10:30:00Z"), // 12:30
    b("4", "gehen", "2026-06-10T15:00:00Z"), // 17:00
];

describe("dayTotals", () => {
    it("summiert Arbeitszeit und Pause eines vollständigen Tages", () => {
        const t = dayTotals(workday, day, new Date("2026-06-10T20:00:00Z"));
        expect(t.workMs).toBe(8.5 * HOUR);
        expect(t.breakMs).toBe(0.5 * HOUR);
        expect(t.running).toBe(false);
    });

    it("zählt einen laufenden Zeitraum bis jetzt", () => {
        const t = dayTotals(workday.slice(0, 1), day, new Date("2026-06-10T08:30:00Z"));
        expect(t.workMs).toBe(2.5 * HOUR);
        expect(t.running).toBe(true);
    });

    it("teilt Altdaten am Tageswechsel", () => {
        const night = [
            b("1", "kommen", "2026-06-09T20:00:00Z"), // 22:00 Berlin
            b("2", "gehen", "2026-06-10T04:00:00Z"), // 06:00 Berlin
        ];
        const now = new Date("2026-06-10T20:00:00Z");
        expect(dayTotals(night, day, now).workMs).toBe(6 * HOUR); // 00:00 bis 06:00
        expect(dayTotals(night, localDayRange("2026-06-09"), now).workMs).toBe(2 * HOUR); // 22:00 bis 24:00
    });

    it("ignoriert Buchungen anderer Tage", () => {
        const yesterday = [b("1", "kommen", "2026-06-09T06:00:00Z"), b("2", "gehen", "2026-06-09T14:00:00Z")];
        const t = dayTotals(yesterday, day, new Date("2026-06-10T09:00:00Z"));
        expect(t).toEqual({workMs: 0, breakMs: 0, running: false, missingGehen: false});
    });

    it("liefert Nullen ohne Buchungen", () => {
        expect(dayTotals([], day, new Date("2026-06-10T09:00:00Z"))).toEqual({
            workMs: 0,
            breakMs: 0,
            running: false,
            missingGehen: false,
        });
    });

    it("lässt ein vergessenes gehen nicht in den nächsten Tag laufen", () => {
        const forgotten = [b("1", "kommen", "2026-06-09T06:00:00Z")]; // 9.6., 08:00, nie ausgestempelt
        const now = new Date("2026-06-10T09:00:00Z");

        const yesterday = dayTotals(forgotten, localDayRange("2026-06-09"), now);
        expect(yesterday).toEqual({workMs: 0, breakMs: 0, running: false, missingGehen: true});

        const today = dayTotals(forgotten, localDayRange("2026-06-10"), now);
        expect(today).toEqual({workMs: 0, breakMs: 0, running: false, missingGehen: false});
    });

    it("meldet kein fehlendes gehen am laufenden Tag", () => {
        const t = dayTotals(workday.slice(0, 1), day, new Date("2026-06-10T08:30:00Z"));
        expect(t.missingGehen).toBe(false);
        expect(t.running).toBe(true);
    });
});
