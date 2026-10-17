// shared/target-hours.test.ts
import {describe, expect, it} from "vitest";
import {DAILY_TARGET_MS, dayKind, targetMs, WEEKLY_TARGET_MS} from "./target-hours";
import {weekDays} from "./week";

const STARTED = "2000-01-01"; // Zeiterfassung lange vor den Testtagen begonnen

const weekTarget = (anchor: string, vacations: {startDate: string; endDate: string}[]) =>
    weekDays(anchor).reduce((s, d) => s + targetMs(d, vacations, [], [], STARTED), 0);

describe("targetMs", () => {
    it("Montag bis Freitag je 8 Stunden", () => {
        for (const day of ["2026-06-08", "2026-06-09", "2026-06-10", "2026-06-11", "2026-06-12"]) {
            expect(targetMs(day, [], [], [], STARTED)).toBe(DAILY_TARGET_MS);
        }
    });

    it("am Wochenende 0", () => {
        expect(targetMs("2026-06-13", [], [], [], STARTED)).toBe(0); // Samstag
        expect(targetMs("2026-06-14", [], [], [], STARTED)).toBe(0); // Sonntag
    });

    it("eine Woche ergibt 40 Stunden", () => {
        expect(weekTarget("2026-06-10", [])).toBe(WEEKLY_TARGET_MS);
        expect(WEEKLY_TARGET_MS).toBe(40 * 3_600_000);
    });

    it("an einem Urlaubstag 0, Beginn und Ende zählen mit", () => {
        const vacations = [{startDate: "2026-06-09", endDate: "2026-06-10"}];
        expect(targetMs("2026-06-08", vacations, [], [], STARTED)).toBe(DAILY_TARGET_MS);
        expect(targetMs("2026-06-09", vacations, [], [], STARTED)).toBe(0);
        expect(targetMs("2026-06-10", vacations, [], [], STARTED)).toBe(0);
        expect(targetMs("2026-06-11", vacations, [], [], STARTED)).toBe(DAILY_TARGET_MS);
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
        expect(targetMs("2026-06-13", vacations, [], [], STARTED)).toBe(0);
    });

    it("mehrere Urlaube in einer Woche", () => {
        const vacations = [
            {startDate: "2026-06-08", endDate: "2026-06-08"},
            {startDate: "2026-06-12", endDate: "2026-06-12"},
        ];
        expect(weekTarget("2026-06-10", vacations)).toBe(24 * 3_600_000);
    });
});

describe("Feiertage", () => {
    const einheit = [{date: "2026-10-02"}]; // ein Freitag

    it("an einem Feiertag ist das Soll 0", () => {
        expect(targetMs("2026-10-02", [], einheit, [], STARTED)).toBe(0);
        expect(targetMs("2026-10-01", [], einheit, [], STARTED)).toBe(DAILY_TARGET_MS);
    });

    it("ein Feiertag senkt das Wochensoll auf 32 Stunden", () => {
        expect(weekDays("2026-10-01").reduce((s, d) => s + targetMs(d, [], einheit, [], STARTED), 0)).toBe(
            32 * 3_600_000,
        );
    });

    it("Urlaub und Feiertag in derselben Woche", () => {
        const vacations = [{startDate: "2026-09-28", endDate: "2026-09-29"}]; // Mo und Di
        expect(weekDays("2026-10-01").reduce((s, d) => s + targetMs(d, vacations, einheit, [], STARTED), 0)).toBe(
            16 * 3_600_000,
        );
    });
});

describe("dayKind", () => {
    const vacations = [{startDate: "2026-09-28", endDate: "2026-10-04"}]; // Mo bis So
    const holidays = [{date: "2026-10-02"}, {date: "2026-10-03"}]; // Fr und Sa

    it("Arbeitstag ohne Urlaub und Feiertag", () => {
        expect(dayKind("2026-10-05", vacations, holidays, [], STARTED)).toBe("workday");
    });

    it("Urlaub an einem Arbeitstag", () => {
        expect(dayKind("2026-09-28", vacations, holidays, [], STARTED)).toBe("vacation");
    });

    it("ein Feiertag im Urlaub ist ein Feiertag", () => {
        expect(dayKind("2026-10-02", vacations, holidays, [], STARTED)).toBe("holiday");
    });

    it("das Wochenende geht vor, auch vor Feiertag und Urlaub", () => {
        expect(dayKind("2026-10-03", vacations, holidays, [], STARTED)).toBe("weekend");
        expect(dayKind("2026-10-04", vacations, holidays, [], STARTED)).toBe("weekend");
    });
});

describe("Krankheitstage", () => {
    const sick = [{startDate: "2026-09-28", endDate: "2026-10-04"}]; // Mo bis So

    it("ein Krankheitstag hat kein Soll", () => {
        expect(dayKind("2026-09-28", [], [], sick, STARTED)).toBe("sick");
        expect(targetMs("2026-09-28", [], [], sick, STARTED)).toBe(0);
        expect(targetMs("2026-10-05", [], [], sick, STARTED)).toBe(DAILY_TARGET_MS);
    });

    it("Krankheit geht vor Urlaub", () => {
        const vacations = [{startDate: "2026-09-28", endDate: "2026-10-09"}];
        expect(dayKind("2026-09-29", vacations, [], sick, STARTED)).toBe("sick");
        expect(dayKind("2026-10-05", vacations, [], sick, STARTED)).toBe("vacation");
    });

    it("Wochenende, Beginn der Zeiterfassung und Feiertag gehen vor", () => {
        expect(dayKind("2026-10-03", [], [], sick, STARTED)).toBe("weekend");
        expect(dayKind("2026-09-29", [], [], sick, "2026-10-01")).toBe("untracked");
        expect(dayKind("2026-10-02", [], [{date: "2026-10-02"}], sick, STARTED)).toBe("holiday");
    });
});

describe("Beginn der Zeiterfassung", () => {
    it("vor dem Tag der ersten Buchung ist kein Soll", () => {
        expect(dayKind("2026-10-13", [], [], [], "2026-10-14")).toBe("untracked");
        expect(targetMs("2026-10-13", [], [], [], "2026-10-14")).toBe(0);
        expect(targetMs("2026-10-14", [], [], [], "2026-10-14")).toBe(DAILY_TARGET_MS); // ab dem ersten Tag
    });

    it("ohne jede Buchung ist kein Soll", () => {
        expect(targetMs("2026-10-14", [], [], [], null)).toBe(0);
    });

    it("das Wochenende bleibt Wochenende", () => {
        expect(dayKind("2026-10-11", [], [], [], "2026-10-14")).toBe("weekend");
    });
});
