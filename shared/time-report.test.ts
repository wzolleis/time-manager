// shared/time-report.test.ts
import {describe, expect, it} from "vitest";
import {localDayRange} from "./day-range";
import {dayTotals, monthTotals, weekTotals} from "./time-report";
import type {Booking} from "./time-rules";
import {weekDays} from "./week";

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

// Erste Buchung lange vor den Testtagen, damit das Soll an allen Testtagen zählt
const started = [b("s1", "kommen", "2026-01-05T07:00:00Z"), b("s2", "gehen", "2026-01-05T15:00:00Z")];

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

describe("weekTotals", () => {
    const week = weekDays("2026-06-10"); // Mo 8.6. bis So 14.6.
    const now = new Date("2026-06-10T20:00:00Z"); // Mittwoch abends

    it("rechnet die Differenz mitten in der Woche gegen das Soll bis heute", () => {
        const t = weekTotals([...started, ...workday], week, [], [], "2026-06-10", now);
        expect(t.targetWeekMs).toBe(40 * HOUR);
        expect(t.targetToDateMs).toBe(24 * HOUR); // Mo bis Mi
        expect(t.workMs).toBe(8.5 * HOUR);
        expect(t.diffMs).toBe(8.5 * HOUR - 24 * HOUR);
    });

    it("zeigt keine Differenz für künftige Tage und freie Tage ohne Arbeit", () => {
        const t = weekTotals([...started, ...workday], week, [], [], "2026-06-10", now);
        const diffs = Object.fromEntries(t.days.map((d) => [d.day, d.diffMs]));
        expect(diffs["2026-06-09"]).toBe(-8 * HOUR); // vergangener Arbeitstag ohne Buchung
        expect(diffs["2026-06-10"]).toBe(0.5 * HOUR);
        expect(diffs["2026-06-11"]).toBeNull(); // Zukunft
        expect(weekTotals(started, week, [], [], "2026-06-14", now).days[6].diffMs).toBeNull(); // Sonntag ohne Arbeit
    });

    it("senkt das Wochensoll an Urlaubs- und Feiertagen", () => {
        const vacations = [{startDate: "2026-06-08", endDate: "2026-06-08"}];
        const holidays = [{date: "2026-06-11", name: "Fronleichnam"}];
        const t = weekTotals(started, week, vacations, holidays, "2026-06-10", now);
        expect(t.targetWeekMs).toBe(24 * HOUR);
        expect(t.days[3]).toMatchObject({kind: "holiday", holidayName: "Fronleichnam", targetMs: 0});
    });
});

describe("monthTotals", () => {
    // Mo 28.09. und Do 01.10.2026, je 8 Stunden
    const edge = [
        b("1", "kommen", "2026-09-28T06:00:00Z"),
        b("2", "gehen", "2026-09-28T14:00:00Z"),
        b("3", "kommen", "2026-10-01T06:00:00Z"),
        b("4", "gehen", "2026-10-01T14:00:00Z"),
    ];
    const afterOctober = new Date("2026-11-15T12:00:00Z");

    it("zählt von Wochen am Monatsrand nur die Tage im Monat", () => {
        const t = monthTotals(edge, "2026-10", [], [], "2026-11-15", afterOctober);
        expect(t.weeks[0]).toMatchObject({week: 40, workMs: 8 * HOUR, targetMs: 16 * HOUR}); // Do und Fr
        expect(t.weeks[4]).toMatchObject({week: 44, targetMs: 40 * HOUR}); // Mo bis Fr, ohne So 01.11.
        expect(t.targetMonthMs).toBe(22 * 8 * HOUR); // 22 Arbeitstage im Oktober 2026
        expect(t.workMs).toBe(8 * HOUR);
    });

    it("rechnet im laufenden Monat nur gegen das Soll bis heute", () => {
        const now = new Date("2026-10-14T18:00:00Z"); // Mittwoch
        const t = monthTotals(edge, "2026-10", [], [], "2026-10-14", now);
        expect(t.targetToDateMs).toBe(10 * 8 * HOUR); // 01.10. bis 14.10.: 10 Arbeitstage
        expect(t.diffMs).toBe(8 * HOUR - 80 * HOUR);
        expect(t.weeks[2].diffMs).toBe(-24 * HOUR); // KW 42: Mo bis Mi ohne Arbeit
        expect(t.weeks[3].diffMs).toBeNull(); // KW 43 liegt ganz in der Zukunft
        expect(t.weeks[4].diffMs).toBeNull();
    });

    it("teilt die Woche am Jahreswechsel", () => {
        const now = new Date("2027-02-01T12:00:00Z");
        const december = monthTotals(started, "2026-12", [], [], "2027-02-01", now);
        const january = monthTotals(started, "2027-01", [], [], "2027-02-01", now);
        expect(december.weeks.at(-1)).toMatchObject({year: 2026, week: 53, targetMs: 4 * 8 * HOUR}); // Mo bis Do
        expect(january.weeks[0]).toMatchObject({year: 2026, week: 53, targetMs: 8 * HOUR}); // nur Fr 01.01.
    });
});

describe("Beginn der Zeiterfassung im Bericht", () => {
    // Erste Buchung am Mi 14.10.2026
    const fromMidOctober = [b("1", "kommen", "2026-10-14T06:00:00Z"), b("2", "gehen", "2026-10-14T14:00:00Z")];
    const afterOctober = new Date("2026-11-15T12:00:00Z");

    it("zählt das Soll erst ab dem Tag der ersten Buchung", () => {
        const t = monthTotals(fromMidOctober, "2026-10", [], [], "2026-11-15", afterOctober);
        expect(t.targetMonthMs).toBe(13 * 8 * HOUR); // 14.10. bis 31.10.: 13 Arbeitstage
        expect(t.weeks[0]).toMatchObject({week: 40, targetMs: 0, diffMs: null}); // ganz vor dem Beginn
        expect(t.weeks[2]).toMatchObject({week: 42, targetMs: 3 * 8 * HOUR}); // Mi bis Fr
    });

    it("ohne Buchungen hat ein Monat kein Soll, auch in der Vergangenheit", () => {
        const t = monthTotals([], "2026-10", [], [], "2026-11-15", afterOctober);
        expect(t.targetMonthMs).toBe(0);
        expect(t.weeks.every((w) => w.diffMs === null)).toBe(true);
    });
});
