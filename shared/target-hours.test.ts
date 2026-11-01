// shared/target-hours.test.ts
import {describe, expect, it} from "vitest";
import {day} from "./test-dates";
import {dayKind, targetMs} from "./target-hours";
import {defaultHistory} from "./user-setting-rules";
import {weekDays} from "./week";
import type {DayRange} from "./day-range";

const HOUR = 3_600_000;
const SOLL = defaultHistory(8); // ohne eigene Werte
const DAILY_TARGET_MS = 8 * HOUR;
const WEEKLY_TARGET_MS = 40 * HOUR;

const STARTED = day("2000-01-01"); // Zeiterfassung lange vor den Testtagen begonnen

const weekTarget = (anchor: string, vacations: DayRange[]) =>
    weekDays(day(anchor)).reduce((s, d) => s + targetMs(d, vacations, [], [], STARTED, SOLL), 0);

describe("targetMs", () => {
    it("Montag bis Freitag je 8 Stunden", () => {
        for (const d of ["2026-06-08", "2026-06-09", "2026-06-10", "2026-06-11", "2026-06-12"].map(day)) {
            expect(targetMs(d, [], [], [], STARTED, SOLL)).toBe(DAILY_TARGET_MS);
        }
    });

    it("am Wochenende 0", () => {
        expect(targetMs(day("2026-06-13"), [], [], [], STARTED, SOLL)).toBe(0); // Samstag
        expect(targetMs(day("2026-06-14"), [], [], [], STARTED, SOLL)).toBe(0); // Sonntag
    });

    it("eine Woche ergibt 40 Stunden", () => {
        expect(weekTarget("2026-06-10", [])).toBe(WEEKLY_TARGET_MS);
        expect(WEEKLY_TARGET_MS).toBe(40 * 3_600_000);
    });

    it("an einem Urlaubstag 0, Beginn und Ende zählen mit", () => {
        const vacations = [{startDate: day("2026-06-09"), endDate: day("2026-06-10")}];
        expect(targetMs(day("2026-06-08"), vacations, [], [], STARTED, SOLL)).toBe(DAILY_TARGET_MS);
        expect(targetMs(day("2026-06-09"), vacations, [], [], STARTED, SOLL)).toBe(0);
        expect(targetMs(day("2026-06-10"), vacations, [], [], STARTED, SOLL)).toBe(0);
        expect(targetMs(day("2026-06-11"), vacations, [], [], STARTED, SOLL)).toBe(DAILY_TARGET_MS);
    });

    it("zwei Urlaubstage senken das Wochensoll auf 24 Stunden", () => {
        const vacations = [{startDate: day("2026-06-09"), endDate: day("2026-06-10")}];
        expect(weekTarget("2026-06-10", vacations)).toBe(24 * 3_600_000);
    });

    it("Urlaub über das Wochenende zählt nur die Arbeitstage", () => {
        // Freitag bis Montag: Freitag und Montag fallen weg, Samstag und Sonntag bleiben 0
        const vacations = [{startDate: day("2026-06-12"), endDate: day("2026-06-15")}];
        expect(weekTarget("2026-06-10", vacations)).toBe(32 * 3_600_000);
        expect(weekTarget("2026-06-17", vacations)).toBe(32 * 3_600_000);
        expect(targetMs(day("2026-06-13"), vacations, [], [], STARTED, SOLL)).toBe(0);
    });

    it("mehrere Urlaube in einer Woche", () => {
        const vacations = [
            {startDate: day("2026-06-08"), endDate: day("2026-06-08")},
            {startDate: day("2026-06-12"), endDate: day("2026-06-12")},
        ];
        expect(weekTarget("2026-06-10", vacations)).toBe(24 * 3_600_000);
    });
});

describe("Feiertage", () => {
    const einheit = [{date: day("2026-10-02")}]; // ein Freitag

    it("an einem Feiertag ist das Soll 0", () => {
        expect(targetMs(day("2026-10-02"), [], einheit, [], STARTED, SOLL)).toBe(0);
        expect(targetMs(day("2026-10-01"), [], einheit, [], STARTED, SOLL)).toBe(DAILY_TARGET_MS);
    });

    it("ein Feiertag senkt das Wochensoll auf 32 Stunden", () => {
        expect(weekDays(day("2026-10-01")).reduce((s, d) => s + targetMs(d, [], einheit, [], STARTED, SOLL), 0)).toBe(
            32 * 3_600_000,
        );
    });

    it("Urlaub und Feiertag in derselben Woche", () => {
        const vacations = [{startDate: day("2026-09-28"), endDate: day("2026-09-29")}]; // Mo und Di
        expect(
            weekDays(day("2026-10-01")).reduce((s, d) => s + targetMs(d, vacations, einheit, [], STARTED, SOLL), 0),
        ).toBe(16 * 3_600_000);
    });
});

describe("dayKind", () => {
    const vacations = [{startDate: day("2026-09-28"), endDate: day("2026-10-04")}]; // Mo bis So
    const holidays = [{date: day("2026-10-02")}, {date: day("2026-10-03")}]; // Fr und Sa

    it("Arbeitstag ohne Urlaub und Feiertag", () => {
        expect(dayKind(day("2026-10-05"), vacations, holidays, [], STARTED)).toBe("workday");
    });

    it("Urlaub an einem Arbeitstag", () => {
        expect(dayKind(day("2026-09-28"), vacations, holidays, [], STARTED)).toBe("vacation");
    });

    it("ein Feiertag im Urlaub ist ein Feiertag", () => {
        expect(dayKind(day("2026-10-02"), vacations, holidays, [], STARTED)).toBe("holiday");
    });

    it("das Wochenende geht vor, auch vor Feiertag und Urlaub", () => {
        expect(dayKind(day("2026-10-03"), vacations, holidays, [], STARTED)).toBe("weekend");
        expect(dayKind(day("2026-10-04"), vacations, holidays, [], STARTED)).toBe("weekend");
    });
});

describe("Krankheitstage", () => {
    const sick = [{startDate: day("2026-09-28"), endDate: day("2026-10-04")}]; // Mo bis So

    it("ein Krankheitstag hat kein Soll", () => {
        expect(dayKind(day("2026-09-28"), [], [], sick, STARTED)).toBe("sick");
        expect(targetMs(day("2026-09-28"), [], [], sick, STARTED, SOLL)).toBe(0);
        expect(targetMs(day("2026-10-05"), [], [], sick, STARTED, SOLL)).toBe(DAILY_TARGET_MS);
    });

    it("Krankheit geht vor Urlaub", () => {
        const vacations = [{startDate: day("2026-09-28"), endDate: day("2026-10-09")}];
        expect(dayKind(day("2026-09-29"), vacations, [], sick, STARTED)).toBe("sick");
        expect(dayKind(day("2026-10-05"), vacations, [], sick, STARTED)).toBe("vacation");
    });

    it("Wochenende, Beginn der Zeiterfassung und Feiertag gehen vor", () => {
        expect(dayKind(day("2026-10-03"), [], [], sick, STARTED)).toBe("weekend");
        expect(dayKind(day("2026-09-29"), [], [], sick, day("2026-10-01"))).toBe("untracked");
        expect(dayKind(day("2026-10-02"), [], [{date: day("2026-10-02")}], sick, STARTED)).toBe("holiday");
    });
});

describe("Beginn der Zeiterfassung", () => {
    it("vor dem Tag der ersten Buchung ist kein Soll", () => {
        expect(dayKind(day("2026-10-13"), [], [], [], day("2026-10-14"))).toBe("untracked");
        expect(targetMs(day("2026-10-13"), [], [], [], day("2026-10-14"), SOLL)).toBe(0);
        expect(targetMs(day("2026-10-14"), [], [], [], day("2026-10-14"), SOLL)).toBe(DAILY_TARGET_MS); // ab dem ersten Tag
    });

    it("ohne jede Buchung ist kein Soll", () => {
        expect(targetMs(day("2026-10-14"), [], [], [], null, SOLL)).toBe(0);
    });

    it("das Wochenende bleibt Wochenende", () => {
        expect(dayKind(day("2026-10-11"), [], [], [], day("2026-10-14"))).toBe("weekend");
    });
});
